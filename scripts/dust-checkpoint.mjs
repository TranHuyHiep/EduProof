// Saves and restores the dust wallet's sync state.
//
// Run: node scripts/dust-checkpoint.mjs save
//      node scripts/dust-checkpoint.mjs show
//
// Why this exists: the dust wallet syncs from genesis — over 1.4M indices on
// Preprod, and hours when the indexer's WebSocket keeps dropping — and
// testkit's MidnightWalletProvider.build() takes only (logger, env, seed), so
// every run starts from zero. A timeout therefore costs the entire wait, and
// the next attempt pays it again.
//
// The SDK does support checkpointing: DustWalletAPI has serializeState(), and
// the wallet class has restore(). This reaches them through the facade's
// `dust` property. It is deliberately a separate script from the deploy so
// that saving a checkpoint cannot break a deploy that is working.
//
// STATUS: the `save` path has never been run end to end. It waits for a
// complete sync before it can serialize, so exercising it costs the same two
// hours the deploy does, and the deploy took priority. `show` works. Treat a
// successful `save` as unverified until someone watches it write a file.
//
// Restoring is not wired up either: MidnightWalletProvider.build() takes only
// (logger, env, seed), so a restore has to go through DustWallet(...).restore()
// and MidnightWalletProvider.withWallet(...) — both exist, neither is used here.
//
// The saved file contains wallet sync state, not keys — but it is derived from
// your wallet, so it is gitignored along with everything else local.

import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";

const CHECKPOINT = ".dust-checkpoint.json";
const PROOF_SERVER = process.env.PROOF_SERVER ?? "http://localhost:6300";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* the checks below say what is missing */
  }
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

async function toHexSeed(raw) {
  const words = raw.trim().split(/\s+/);
  if (words.length === 1) {
    if (!/^([0-9a-f]{64}|[0-9a-f]{128})$/i.test(words[0])) {
      fail("MIDNIGHT_WALLET_SEED looks like neither a mnemonic nor 64/128 hex characters.");
    }
    return words[0].toLowerCase();
  }
  if (words.length !== 12 && words.length !== 24) {
    fail(`MIDNIGHT_WALLET_SEED must be 12 or 24 words. Found ${words.length}.`);
  }
  // The FULL seed. Truncating derives a different, empty wallet — see
  // docs/22-lessons.md.
  const { mnemonicToSeedSync } = await import("@scure/bip39");
  return Buffer.from(mnemonicToSeedSync(words.join(" "))).toString("hex");
}

async function main() {
  const action = process.argv[2] ?? "show";
  loadEnvLocal();

  if (action === "show") {
    if (!existsSync(CHECKPOINT)) {
      console.log(`\nNo checkpoint at ${CHECKPOINT}.`);
      console.log("Create one while a wallet is synced:  node scripts/dust-checkpoint.mjs save\n");
      return;
    }
    const { size, mtime } = statSync(CHECKPOINT);
    const age = Math.round((Date.now() - mtime.getTime()) / 60000);
    console.log(`\n  ${CHECKPOINT}`);
    console.log(`  ${(size / 1024).toFixed(0)} KB, written ${age} minutes ago\n`);
    console.log("A checkpoint goes stale: restoring one only skips the indices");
    console.log("it already covered, and the rest still has to sync.\n");
    return;
  }

  if (action !== "save") fail(`Unknown action "${action}". Use save or show.`);

  const seedRaw = process.env.MIDNIGHT_WALLET_SEED;
  if (!seedRaw) fail("MIDNIGHT_WALLET_SEED is not set in .env.local.");
  const seed = await toHexSeed(seedRaw);

  const { setNetworkId } = await import("@midnight-ntwrk/midnight-js-network-id");
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

  // Report progress while it catches up, then checkpoint whatever it reached.
  // Saving a partial sync is still worth it: the next run resumes from here
  // rather than from genesis.
  console.log("syncing — Ctrl-C to save at the current point is NOT supported;");
  console.log("this waits for a complete sync, then writes the checkpoint.\n");

  await new Promise((resolve) => {
    const sub = provider.wallet.state().subscribe((s) => {
      const p = s.dust.progress;
      const applied = Number(p?.appliedIndex ?? 0);
      const target = Number(p?.highestRelevantWalletIndex ?? 0);
      if (target > 0) {
        process.stdout.write(`\r  ${applied} / ${target}  (${((applied / target) * 100).toFixed(1)}%)   `);
      }
      if (p?.isStrictlyComplete?.() === true) {
        sub.unsubscribe();
        console.log("\r  synced" + " ".repeat(40));
        resolve();
      }
    });
  });

  const serialized = await provider.wallet.dust.serializeState();
  writeFileSync(CHECKPOINT, serialized);

  const { size } = statSync(CHECKPOINT);
  console.log(`\n✓ wrote ${CHECKPOINT} (${(size / 1024).toFixed(0)} KB)\n`);

  await provider.stop();
}

main().catch((error) => {
  // Message only: an error from deep in the wallet can carry key material.
  console.error(`\n✗ ${error?.message ?? error}`);
  process.exit(1);
});
