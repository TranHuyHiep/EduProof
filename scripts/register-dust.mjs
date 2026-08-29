// Registers the wallet's NIGHT for DUST generation.
//
// Run: npm run wallet:register-dust
//
// On Midnight, fees are paid in DUST, and DUST is not something a faucet
// hands out: it accrues over time from NIGHT that has been *registered* to
// generate it. Holding NIGHT is not enough, which is why a freshly funded
// wallet still cannot pay for a deployment.
//
// This submits one transaction, which pays for itself out of the registration
// it is making. It asks first, because it writes to a public chain.

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const PROOF_SERVER = process.env.PROOF_SERVER ?? "http://localhost:6300";
const EXPLORER = "https://preprod.midnightexplorer.com";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* handled by the check below */
  }
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/** Accepts a BIP39 mnemonic or raw hex, and returns the hex the builder wants. */
async function toHexSeed(raw) {
  const words = raw.trim().split(/\s+/);
  if (words.length === 1) {
    // 64 hex chars (32 bytes) or 128 (a full BIP39 seed) — both are seeds a
    // wallet might hand you, and HDWallet.fromSeed takes either.
    if (!/^([0-9a-f]{64}|[0-9a-f]{128})$/i.test(words[0])) {
      fail("MIDNIGHT_WALLET_SEED looks like neither a mnemonic nor 64/128 hex characters.");
    }
    return words[0].toLowerCase();
  }
  if (words.length !== 12 && words.length !== 24) {
    fail(`MIDNIGHT_WALLET_SEED must be 12 or 24 words, or 64 hex characters. Found ${words.length}.`);
  }
  // The FULL 64-byte BIP39 seed, not the first 32 bytes.
  //
  // testkit's own WalletSeeds.fromMnemonic does
  // `mnemonicToSeedSync(mnemonic).toString('hex')` with no truncation, and the
  // master seed is the root of the HD tree — truncating it produces a
  // different tree, so account 0 / index 0 lands on a completely different
  // address. It is a valid, empty wallet, and nothing reports an error: you
  // just do not see the funds you sent to the address your GUI wallet shows.
  const { mnemonicToSeedSync } = await import("@scure/bip39");
  return Buffer.from(mnemonicToSeedSync(words.join(" "))).toString("hex");
}

async function main() {
  loadEnvLocal();

  const seedRaw = process.env.MIDNIGHT_WALLET_SEED;
  if (!seedRaw) fail("MIDNIGHT_WALLET_SEED is not set in .env.local.");
  const seed = await toHexSeed(seedRaw);

  process.stdout.write(`proof server ${PROOF_SERVER} … `);
  try {
    const res = await fetch(`${PROOF_SERVER}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(String(res.status));
    console.log("ok");
  } catch {
    fail(
      `No proof server on ${PROOF_SERVER}.\n` +
        "    docker run -d --rm --name eduproof-proof-server \\\n" +
        "      -p 6300:6300 -e PORT=6300 midnightntwrk/proof-server:8.1.0",
    );
  }

  const { setNetworkId, getNetworkId } = await import("@midnight-ntwrk/midnight-js-network-id");
  setNetworkId("preprod");

  const { PreprodTestEnvironment, MidnightWalletProvider } = await import(
    "@midnight-ntwrk/testkit-js"
  );
  const pino = (await import("pino")).default;
  // Silent to /dev/null: testkit logs the master seed at INFO.
  const logger = pino({ level: "silent" }, pino.destination("/dev/null"));

  const environment = new PreprodTestEnvironment(logger);
  const config = { ...environment.getEnvironmentConfiguration(), proofServer: PROOF_SERVER };

  console.log("\nopening wallet …");
  const provider = await MidnightWalletProvider.build(logger, config, seed);
  await provider.start(false);

  const Rx = await import("rxjs");
  console.log("syncing …");
  await Rx.firstValueFrom(
    provider.wallet.state().pipe(
      Rx.filter((s) => s.unshielded.progress?.isStrictlyComplete?.() === true),
      Rx.timeout({ each: 120_000, with: () => Rx.throwError(() => new Error("indexer did not respond")) }),
    ),
  );

  const state = await Rx.firstValueFrom(provider.wallet.state());
  const { UnshieldedAddress } = await import("@midnight-ntwrk/wallet-sdk-address-format");
  const address = UnshieldedAddress.codec.encode(getNetworkId(), state.unshielded.address).toString();

  const { unshieldedToken } = await import("@midnight-ntwrk/midnight-js-protocol/ledger");
  const nightRaw = unshieldedToken().raw;
  const coins = state.unshielded.availableCoins ?? [];
  const unregistered = coins.filter(
    (c) => c.utxo.type === nightRaw && c.meta.registeredForDustGeneration === false,
  );

  console.log(`\n  address       ${address}`);
  console.log(`  NIGHT         ${state.unshielded.balances?.[nightRaw] ?? 0n}`);
  console.log(`  DUST          ${state.dust.balance(new Date())}`);
  console.log(`  unregistered  ${unregistered.length} of ${coins.length} utxo`);

  if (unregistered.length === 0) {
    await provider.stop();
    if (coins.length === 0) {
      fail(`This wallet holds no NIGHT.\n  Send some to the address above, or use ${config.faucet}`);
    }
    console.log("\nEverything is already registered. DUST accrues over time — if the");
    console.log("balance above is still 0, wait a few minutes and check again.\n");
    process.exit(0);
  }

  // The registration transaction pays its own fee out of the DUST these UTXOs
  // *would already have generated* had they been registered when they were
  // created — the ledger backdates it (see midnight-ledger spec/dust.md, the
  // `allow_fee_payment` field). That is what breaks the chicken-and-egg: you
  // never need DUST in order to get DUST.
  //
  // The catch is that a UTXO can be too young for its backdated accrual to
  // cover the fee, and submitting then fails with an opaque `Custom error:
  // 173`. So ask the SDK what the fee is and wait until the projection clears
  // it, which is exactly what these two calls are for.
  // How much DUST this NIGHT has already generated.
  //
  // A registration pays its own fee out of the DUST its UTXOs *would have*
  // generated since they were created — the ledger backdates it (see
  // midnight-ledger spec/dust.md, `allow_fee_payment`). So the question is
  // whether the backdated amount covers the fee, not whether the wallet has a
  // DUST balance. It will not have one: DUST only starts accumulating once
  // this transaction lands.
  //
  // `estimateDustGeneration` is a pure projection from each UTXO's ctime and
  // the current clock, so it answers that without a synced dust wallet.
  // `estimateRegistration` would be the more direct call, but it waits on
  // `waitForSyncedState()` internally, and the dust wallet syncs from genesis —
  // over a million indices on preprod, which is days on a cold start. This
  // reads the same underlying projection without that wait.
  //
  // The cap that matters is the *maximum* across UTXOs rather than their sum:
  // only one UTXO goes in the transaction's guaranteed fee-payment slot.
  const projected = state.dust.estimateDustGeneration(
    unregistered.map(({ utxo, meta }) => ({
      ...utxo,
      ctime: meta.ctime,
      registeredForDustGeneration: meta.registeredForDustGeneration,
    })),
    new Date(),
  );
  const available = projected.reduce(
    (max, u) => (u.dust.generatedNow > max ? u.dust.generatedNow : max),
    0n,
  );

  console.log(`  generated     ${available} specks (backdated, pays the fee)`);

  if (available === 0n) {
    await provider.stop();
    fail(
      "This NIGHT has generated no DUST yet, so it cannot pay for its own\n" +
        "  registration. It backdates to when the UTXO arrived, so this resolves\n" +
        "  on its own — wait a few minutes and run this again.",
    );
  }

  console.log(`\nThis registers ${unregistered.length} NIGHT utxo(s) for DUST generation.`);
  console.log("It submits one transaction to preprod, which pays for itself.");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question("\nType 'register' to continue: ")).trim().toLowerCase();
  rl.close();

  if (answer !== "register") {
    await provider.stop();
    console.log("\nCancelled. Nothing was submitted.");
    process.exit(0);
  }

  console.log("\nregistering — this generates a proof and may take a few minutes …");

  const recipe = await provider.wallet.registerNightUtxosForDustGeneration(
    unregistered,
    provider.unshieldedKeystore.getPublicKey(),
    (payload) => provider.unshieldedKeystore.signData(payload),
  );
  const finalized = await provider.wallet.finalizeRecipe(recipe);
  const txId = await provider.wallet.submitTransaction(finalized);

  console.log("\n✓ registered\n");
  console.log(`  tx        ${txId}`);
  console.log(`  explorer  ${EXPLORER}/transactions/0x${String(txId).replace(/^0x/, "")}`);
  console.log("\nDUST now accrues from this NIGHT. Give it a few minutes, then:");
  console.log("  npm run contract:deploy\n");

  await provider.stop();
}

main().catch((error) => {
  console.error(`\n✗ ${error?.message ?? error}`);
  process.exit(1);
});
