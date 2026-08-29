// Deploys the EduProof contract to Midnight Preprod.
//
// Run: npm run contract:deploy
//
// This writes to a public blockchain and cannot be undone, so it asks before
// submitting.
//
// Needs:
//   1. MIDNIGHT_WALLET_SEED in .env.local — a wallet holding tDUST.
//   2. A local proof server on :6300. Submitting a transaction requires one.
//   3. The compiled contract in contracts/build (npm run contract:build).
//
// The seed is read from the environment and never printed, not even on error.
//
// Versions matter more here than anywhere else in the project. The official
// support matrix pins Preprod to Midnight.js 4.1.1 / wallet-sdk 1.2.0 / Compact
// toolchain 0.31.1, and the endpoints come from testkit-js rather than being
// written out here, so they cannot drift from what the network actually runs.
//   https://docs.midnight.network/relnotes/support-matrix

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const PROOF_SERVER = process.env.PROOF_SERVER ?? "http://localhost:6300";
const EXPLORER = "https://preprod.midnightexplorer.com";
const ASSETS = "contracts/build/eduproof";
const PRIVATE_STATE_ID = "eduproof-deploy";

// How long to wait for the dust wallet to catch up before giving up.
//
// Measured on Preprod on 2026-08-29: ~280 indices/second against ~1.46M
// indices, so a cold sync takes about 90 minutes. Three hours leaves room for
// a slower indexer without running forever. The sync does not persist between
// processes, so a timeout costs the whole wait — better to be generous.
// Override with DUST_SYNC_TIMEOUT_MS for a quicker failure.
const DUST_SYNC_TIMEOUT_MS = Number(process.env.DUST_SYNC_TIMEOUT_MS ?? 3 * 60 * 60 * 1000);

/** Reads .env.local without a dependency. Values stay in memory. */
function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* no .env.local — the checks below say what is missing */
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

async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim().toLowerCase();
}

async function main() {
  loadEnvLocal();

  // ── Preflight. Each failure here is cheaper than one mid-deploy. ───────

  const seedRaw = process.env.MIDNIGHT_WALLET_SEED;
  if (!seedRaw) {
    fail(
      "MIDNIGHT_WALLET_SEED is not set.\n" +
        "  Add it to .env.local (which is gitignored):\n" +
        "    MIDNIGHT_WALLET_SEED=your twenty four words …\n" +
        "  or 64 hex characters, if that is what your wallet gave you.\n\n" +
        "  Use a throwaway wallet holding only enough tDUST to deploy.",
    );
  }

  // The wallet builder wants 32 bytes of hex. A Lace wallet hands you 24
  // words, so the conversion happens here rather than being done by hand —
  // an off-by-one in a manual conversion produces a different, empty wallet
  // and no error saying so.
  const seed = await toHexSeed(seedRaw);

  // The level private-state store encrypts itself at rest and enforces a
  // password policy: 16+ characters, 3 of 4 character classes, no long runs or
  // sequences. Checked here rather than surfacing from inside deployContract,
  // after the wallet has already synced.
  const storagePassword = process.env.MIDNIGHT_PRIVATE_STATE_PASSWORD;
  if (!storagePassword) {
    fail(
      "MIDNIGHT_PRIVATE_STATE_PASSWORD is not set.\n" +
        "  The local private-state store is encrypted, and needs a password.\n\n" +
        "  Add it to .env.local — at least 16 characters, mixing upper, lower,\n" +
        "  digits and symbols, with no runs like 'aaaa' or sequences like '1234':\n\n" +
        "    MIDNIGHT_PRIVATE_STATE_PASSWORD=...\n\n" +
        "  It protects a local database, not the chain, but it is still a\n" +
        "  secret: do not reuse a public value such as an address.",
    );
  }

  try {
    readFileSync(`${ASSETS}/contract/index.js`);
  } catch {
    fail(`No compiled contract at ${ASSETS}. Run: npm run contract:build`);
  }

  process.stdout.write(`proof server ${PROOF_SERVER} … `);
  try {
    const res = await fetch(`${PROOF_SERVER}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(String(res.status));
    console.log("ok");
  } catch {
    fail(
      `No proof server on ${PROOF_SERVER}.\n` +
        "  Submitting a transaction requires a local one:\n\n" +
        "    docker run -d --rm --name eduproof-proof-server \\\n" +
        "      -p 6300:6300 -e PORT=6300 midnightntwrk/proof-server:8.1.0\n\n" +
        "  It downloads its proving keys on first run, which takes a minute.",
    );
  }

  // ── Network. Endpoints come from testkit, not from constants here. ────

  const { setNetworkId } = await import("@midnight-ntwrk/midnight-js-network-id");
  setNetworkId("preprod");

  const { PreprodTestEnvironment, MidnightWalletProvider, syncWallet } = await import(
    "@midnight-ntwrk/testkit-js"
  );
  const pino = (await import("pino")).default;
  // Silent by default, and to /dev/null rather than to a level: testkit's
  // wallet builder logs the master seed at INFO. Raise DEPLOY_LOG_LEVEL only
  // when debugging, and know that the seed will appear if you do.
  const logger =
    process.env.DEPLOY_LOG_LEVEL
      ? pino({ level: process.env.DEPLOY_LOG_LEVEL })
      : pino({ level: "silent" }, pino.destination("/dev/null"));

  const environment = new PreprodTestEnvironment(logger);
  const config = { ...environment.getEnvironmentConfiguration(), proofServer: PROOF_SERVER };
  console.log(`network      ${config.networkId}`);
  console.log(`indexer      ${config.indexer}`);

  // ── Wallet ────────────────────────────────────────────────────────────

  console.log("\nopening wallet …");
  const walletProvider = await MidnightWalletProvider.build(logger, config, seed);

  // `start()` waits for funds and gives up after a hard 90s with nothing but
  // "sync timeout" — which is what an empty wallet looks like, and says
  // nothing about why. Start without waiting, then report the balance
  // ourselves so an empty wallet is named as an empty wallet.
  await walletProvider.start(false);

  const Rx = await import("rxjs");
  console.log("syncing …");
  await Rx.firstValueFrom(
    walletProvider.wallet.state().pipe(
      Rx.filter((s) => s.unshielded.progress?.isStrictlyComplete?.() === true),
      Rx.timeout({ each: 120_000, with: () => Rx.throwError(() => new Error("indexer did not respond")) }),
    ),
  );

  const state = await Rx.firstValueFrom(walletProvider.wallet.state());
  const utxos = state.unshielded.availableCoins ?? [];
  const night = Object.values(state.unshielded.balances ?? {}).reduce((a, b) => a + b, 0n);
  const dust = state.dust.balance(new Date());

  const { UnshieldedAddress } = await import("@midnight-ntwrk/wallet-sdk-address-format");
  const { getNetworkId } = await import("@midnight-ntwrk/midnight-js-network-id");
  const walletAddress = UnshieldedAddress.codec
    .encode(getNetworkId(), state.unshielded.address)
    .toString();

  console.log(`\n  address  ${walletAddress}`);
  console.log(`  NIGHT    ${night}  (${utxos.length} utxo)`);
  console.log(`  DUST     ${dust}`);

  if (night === 0n && dust === 0n) {
    await walletProvider.stop();
    fail(
      "This wallet is empty — no NIGHT and no DUST.\n\n" +
        `  It is the wallet for MIDNIGHT_WALLET_SEED, at the address above.\n` +
        "  If that is not the address you funded, the seed in .env.local\n" +
        "  belongs to a different wallet than the one you topped up.\n\n" +
        `  Faucet: ${config.faucet}`,
    );
  }

  // Only block when the NIGHT is genuinely unregistered.
  //
  // A zero DUST reading on its own proves nothing: the dust wallet syncs from
  // genesis, which on Preprod is over a million indices and hours of catching
  // up, so `dust.balance(now)` reads 0 long after registration has landed.
  // What is trustworthy is the UTXO metadata, which comes from the unshielded
  // wallet — synced in seconds — and says whether the UTXO generates DUST at
  // all. If it does, let the transaction proceed and let the balancer be the
  // judge; it has the authoritative view.
  const unregisteredCount = utxos.filter(
    (c) => c.meta?.registeredForDustGeneration === false,
  ).length;

  if (dust === 0n && unregisteredCount > 0) {
    // Holding NIGHT is not enough: the UTXOs have to be registered before they
    // generate DUST, and that registration is itself a transaction.
    //
    // It is not a deadlock, though, and the message should not imply one. The
    // registration pays its own fee out of the DUST the UTXOs *would have*
    // generated since they were created — the ledger backdates it. So report
    // how much has accrued, which is what decides whether registering will
    // work right now.
    const unregistered = utxos.filter((c) => c.meta?.registeredForDustGeneration === false);

    const projected = state.dust.estimateDustGeneration(
      unregistered.map(({ utxo, meta }) => ({
        ...utxo,
        ctime: meta.ctime,
        registeredForDustGeneration: meta.registeredForDustGeneration,
      })),
      new Date(),
    );
    // The maximum, not the sum: only one UTXO occupies the guaranteed
    // fee-payment slot of the registration transaction.
    const generated = projected.reduce(
      (max, u) => (u.dust.generatedNow > max ? u.dust.generatedNow : max),
      0n,
    );

    await walletProvider.stop();
    fail(
      "This wallet holds NIGHT but no DUST, so it cannot pay fees yet.\n\n" +
        `  ${unregistered.length} NIGHT utxo(s) are not registered for DUST generation.\n` +
        `  Backdated DUST available to pay for registering them: ${generated}\n\n` +
        "  Register them, which is one transaction that pays for itself:\n\n" +
        "    npm run wallet:register-dust\n",
    );
  }

  if (dust === 0n) {
    // Registered, and the chain has the DUST — but the local dust wallet has
    // not caught up, and the fee balancer spends from the LOCAL view. Without
    // waiting here the deploy dies at the last step with "Insufficient Funds:
    // could not balance dust", naming nothing.
    //
    // This is the slow part: the dust wallet syncs from genesis, which on
    // Preprod is well over a million indices. Show progress, because a silent
    // wait of this length is indistinguishable from a hang.
    console.log("\nDUST reads 0 locally, though this wallet's NIGHT is registered.");
    console.log("Waiting for the dust wallet to sync — the fee balancer spends");
    console.log("from this view, not the chain's.\n");

    await new Promise((resolve, reject) => {
      const started = Date.now();
      const sub = walletProvider.wallet.state().subscribe((s) => {
        const p = s.dust.progress;
        const applied = Number(p?.appliedIndex ?? 0);
        const target = Number(p?.highestRelevantWalletIndex ?? 0);
        const balance = s.dust.balance(new Date());

        if (target > 0) {
          const pct = ((applied / target) * 100).toFixed(1);
          const mins = Math.round((Date.now() - started) / 60000);
          process.stdout.write(`\r  ${applied} / ${target}  (${pct}%)  dust ${balance}  ${mins}m   `);
        }

        // Seeing DUST is NOT enough. An earlier version resolved here on the
        // first non-zero balance, and the node rejected the transaction with
        // Custom error 170 (InvalidDustSpendProof): the dust spend proof was
        // built against a half-synced view, so it did not match the chain.
        // Wait for the sync to actually complete. See docs/22-lessons.md #6.
        if (p?.isStrictlyComplete?.() === true && balance > 0n) {
          sub.unsubscribe();
          console.log(`\r  synced — DUST ${balance}${" ".repeat(40)}`);
          resolve();
        }
      });

      // Give up rather than run forever; the message says what to do next.
      setTimeout(() => {
        sub.unsubscribe();
        reject(
          new Error(
            "the dust wallet did not finish syncing.\n" +
              "  It waits for a COMPLETE sync, not just the first DUST it sees:\n" +
              "  a spend proof built on a partial view is rejected by the node\n" +
              "  with Custom error 170. Raise DUST_SYNC_TIMEOUT_MS and retry.",
          ),
        );
      }, DUST_SYNC_TIMEOUT_MS);
    });
  }

  // ── Confirm. Deploying is public and permanent. ───────────────────────

  console.log("\nThis deploys the EduProof contract to preprod.");
  console.log("It writes to a public chain and cannot be undone.");

  if ((await confirm("\nType 'deploy' to continue: ")) !== "deploy") {
    await walletProvider.stop();
    console.log("\nCancelled. Nothing was submitted.");
    process.exit(0);
  }

  // ── Deploy ────────────────────────────────────────────────────────────

  const { deployContract } = await import("@midnight-ntwrk/midnight-js-contracts");
  const { indexerPublicDataProvider } = await import(
    "@midnight-ntwrk/midnight-js-indexer-public-data-provider"
  );
  const { httpClientProofProvider } = await import(
    "@midnight-ntwrk/midnight-js-http-client-proof-provider"
  );
  const { NodeZkConfigProvider } = await import(
    "@midnight-ntwrk/midnight-js-node-zk-config-provider"
  );
  const { levelPrivateStateProvider } = await import(
    "@midnight-ntwrk/midnight-js-level-private-state-provider"
  );

  const contractModule = await import(`../${ASSETS}/contract/index.js`);

  const providers = {
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    proofProvider: httpClientProofProvider(PROOF_SERVER),
    zkConfigProvider: new NodeZkConfigProvider(ASSETS),
    // The private-state store is encrypted at rest, so it needs a password and
    // an account to scope itself to.
    //
    // The password is a real secret: the SDK's own docs warn against deriving
    // it from public key material. It is read from the environment rather than
    // generated, because a generated one would change per run and orphan the
    // store it wrote last time. The wallet address is fine as the accountId —
    // it is only a namespace, and it is hashed before use.
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: PRIVATE_STATE_ID,
      privateStoragePasswordProvider: async () => storagePassword,
      accountId: walletAddress,
    }),
    walletProvider,
    midnightProvider: walletProvider,
  };

  console.log("\ndeploying — this generates a zero-knowledge proof and may take minutes …");

  // midnight-js 4.1.1 takes a `compiledContract` built through compact-js —
  // a tagged wrapper around the generated constructor, with the witnesses and
  // the assets path attached — rather than a bare `new Contract(...)`.
  const CompiledContract = await import("@midnight-ntwrk/compact-js/effect/CompiledContract");

  const compiledContract = CompiledContract.make("eduproof", contractModule.Contract).pipe(
    CompiledContract.withWitnesses({
      // Neither witness is exercised by deployment — the constructor runs, not
      // the circuits — but the contract declares both, so both must be present.
      studentSecretKey: (ctx) => [ctx.privateState, ctx.privateState.studentSk],

      // Splits the Schnorr challenge for the hand-rolled verification. The
      // circuit checks the split, so this cannot lie; see
      // contracts/src/schnorr.compact.
      getSchnorrReduction: (ctx, challengeHash) => [
        ctx.privateState,
        [challengeHash / (1n << 248n), challengeHash % (1n << 248n)],
      ],
    }),
    CompiledContract.withCompiledFileAssets(ASSETS),
  );

  const deployed = await deployContract(providers, {
    compiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: { studentSk: 0n },
  });

  const address = deployed.deployTxData.public.contractAddress;
  const txId = deployed.deployTxData.public.txId;
  const hex = (id) => `0x${String(id).replace(/^0x/, "")}`;

  console.log("\n✓ deployed\n");
  console.log(`  contract  ${address}`);
  console.log(`  tx        ${txId}`);
  console.log(`\n  explorer  ${EXPLORER}/contracts/${hex(address)}`);
  console.log(`  tx        ${EXPLORER}/transactions/${hex(txId)}`);
  // Both lines, not just the address. Setting the address alone leaves the app
  // on the mock provider, so the contract is on chain but nothing in the UI
  // shows it — the easy mistake to make at exactly this moment.
  console.log("\nAdd BOTH to .env.local and to your deployment's environment:\n");
  console.log(`  NEXT_PUBLIC_PROOF_PROVIDER=midnight`);
  console.log(`  NEXT_PUBLIC_CONTRACT_ADDRESS=${address}\n`);
  console.log("The address alone is not enough: without the provider line the");
  console.log("app still runs the mock and the explorer link stays hidden.\n");

  await walletProvider.stop();
}

/**
 * Redacts anything that looks like key material.
 *
 * An error from deep in the wallet can carry configuration — and potentially
 * the seed — in its properties. But printing only `message` once cost a
 * two-hour run's diagnosis: the node rejected the transaction and the reason
 * was in `cause`, which never reached the log. So print the detail, with long
 * hex runs masked.
 */
function redact(text) {
  return String(text).replace(/\b[0-9a-f]{32,}\b/gi, (m) => `<${m.length}-hex-redacted>`);
}

main().catch((error) => {
  console.error(`\n✗ ${redact(error?.message ?? error)}`);

  // The reason a node rejects a transaction arrives nested, not in `message`.
  for (let cause = error?.cause, depth = 0; cause && depth < 5; cause = cause.cause, depth++) {
    console.error(`  caused by: ${redact(cause.message ?? cause)}`);
  }

  // Substrate puts the dispatch error here rather than in the message.
  for (const key of ["code", "data", "details", "errorData"]) {
    if (error?.[key] !== undefined) {
      console.error(`  ${key}: ${redact(JSON.stringify(error[key]))}`);
    }
  }

  if (process.env.DEPLOY_DEBUG === "1" && error?.stack) {
    console.error(`\n${redact(error.stack)}`);
  } else {
    console.error("\n  DEPLOY_DEBUG=1 for the stack trace.");
  }

  process.exit(1);
});
