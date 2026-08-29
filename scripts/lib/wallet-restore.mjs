// Opening the wallet from a saved dust state instead of syncing from genesis.
//
// The dust wallet syncs from block zero — about 1.46M indices and two and a
// half hours on Preprod — and testkit throws that away when the process ends.
// Two transactions therefore cost two full syncs.
//
// testkit has no restore path: build() takes only (logger, env, seed), and
// FluentWalletBuilder has no withState. But every piece testkit uses
// internally is exported by the packages underneath it, so the wallet can be
// assembled here with one substitution — the dust wallet comes from
// `restore(savedState)` rather than `startWithSeed(...)`.
//
// The saved state is a checkpoint, not a substitute for syncing: the wallet
// still catches up from the block it was saved at. Saving after every run
// keeps that gap small.
//
// If anything about the restore fails, the caller falls back to a cold sync.
// A stale or corrupt checkpoint must never be the reason a deploy cannot
// happen.

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname } from "node:path";

/** Where a wallet's dust checkpoint lives. Keyed by seed so two wallets cannot collide. */
export function checkpointPath(seed) {
  // A prefix of the seed's hash, not the seed: this string ends up in a
  // filename, and filenames end up in logs and screenshots.
  const tag = hashSeed(seed).slice(0, 16);
  return `.wallet-state/dust.${tag}.json`;
}

function hashSeed(seed) {
  // Non-cryptographic; this only has to distinguish wallets, not hide them.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < seed.length; i++) {
    h1 = Math.imul(h1 ^ seed.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + seed.charCodeAt(i), 0x85ebca6b) >>> 0;
  }
  return (h1.toString(16) + h2.toString(16)).padStart(16, "0");
}

/**
 * Builds the same wallet testkit's `MidnightWalletProvider.build()` builds,
 * but with the dust wallet restored from `savedState`.
 *
 * Mirrors FluentWalletBuilder.buildWithoutStarting() — if that changes
 * upstream, this is the function to compare against.
 */
export async function providerFromCheckpoint(logger, env, seed, savedState) {
  const [
    { WalletSeeds, WalletFactory, MidnightWalletProvider },
    { createKeystore },
    { DustWallet },
    { WalletEntrySchema, mergeWalletEntries },
    { InMemoryTransactionHistoryStorage },
    { ZswapSecretKeys, DustSecretKey },
  ] = await Promise.all([
    import("@midnight-ntwrk/testkit-js"),
    import("@midnight-ntwrk/wallet-sdk-unshielded-wallet"),
    import("@midnight-ntwrk/wallet-sdk-dust-wallet"),
    import("@midnight-ntwrk/wallet-sdk-facade"),
    import("@midnight-ntwrk/wallet-sdk-abstractions"),
    import("@midnight-ntwrk/ledger-v8"),
  ]);

  // Reproduces testkit's mapEnvironmentToConfiguration, which is internal.
  const config = {
    indexerClientConnection: {
      indexerHttpUrl: env.indexer,
      indexerWsUrl: env.indexerWS,
    },
    provingServerUrl: new URL(env.proofServer),
    networkId: env.walletNetworkId,
    relayURL: new URL(env.nodeWS),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(
      WalletEntrySchema,
      mergeWalletEntries,
    ),
    costParameters: { feeBlocksMargin: 5 },
  };

  const seeds = WalletSeeds.fromMasterSeed(seed);
  const keystore = createKeystore(seeds.unshielded, env.walletNetworkId);

  const shielded = WalletFactory.createShieldedWallet(config, seeds.shielded);
  const unshielded = WalletFactory.createUnshieldedWallet(config, keystore);

  // The one substitution that makes this worth doing.
  const dust = DustWallet(config).restore(savedState);

  const facade = await WalletFactory.createWalletFacade(config, shielded, unshielded, dust);

  return MidnightWalletProvider.withWallet(
    logger,
    env,
    facade,
    ZswapSecretKeys.fromSeed(seeds.shielded),
    DustSecretKey.fromSeed(seeds.dust),
    keystore,
  );
}

/** Reads a checkpoint, or null when there is none or it cannot be read. */
export function readCheckpoint(seed) {
  const path = checkpointPath(seed);
  if (!existsSync(path)) return null;
  try {
    const { state, savedAt } = JSON.parse(readFileSync(path, "utf8"));
    return state ? { state, savedAt, path } : null;
  } catch {
    // A corrupt checkpoint is not worth a failed run.
    return null;
  }
}

/** Writes a checkpoint. Never throws: failing to save must not fail the run. */
export async function writeCheckpoint(seed, walletProvider) {
  try {
    const state = await walletProvider.wallet.dust.serializeState();
    const path = checkpointPath(seed);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ savedAt: new Date().toISOString(), state }));
    return { path, size: statSync(path).size };
  } catch (error) {
    return { error: error?.message ?? String(error) };
  }
}
