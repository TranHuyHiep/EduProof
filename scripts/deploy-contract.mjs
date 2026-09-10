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

import { confirm, fail, loadEnvLocal, openFundedWallet } from "./lib/wallet-setup.mjs";

const PROOF_SERVER = process.env.PROOF_SERVER ?? "http://localhost:6300";
const EXPLORER = "https://preprod.midnightexplorer.com";
const ASSETS = "contracts/build/eduproof";
const PRIVATE_STATE_ID = "eduproof-deploy";

async function main() {
  loadEnvLocal();

  // Preflight, wallet, and a DUST balance that is actually spendable — all
  // of it shared with the other chain-touching scripts.
  //
  // This used to be a copy of that logic, and the copy fell behind: it opened
  // the wallet with MidnightWalletProvider.build() directly, so it never
  // restored the dust checkpoint and never wrote one. A deploy therefore paid
  // a full cold sync from genesis every time — measured at three hours, and
  // on 2026-09-09 it timed out at 74% having saved nothing, so the next
  // attempt would have started from zero again. register-issuer and
  // publish-proofs restore in about a minute through openFundedWallet().
  const { walletProvider, config, storagePassword, walletAddress } = await openFundedWallet();

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
    // The second argument is not optional in practice. Without it the provider
    // has no way to load the circuit's IR, `/check` is sent a payload with
    // none, and the proof server answers `400 bad input`. A deploy survives
    // the omission because a constructor only takes the `/prove` path; the
    // first contract CALL does not. See docs/22-lessons.md.
    proofProvider: httpClientProofProvider(PROOF_SERVER, new NodeZkConfigProvider(ASSETS)),
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
      // Not exercised by deployment — the constructor runs, not the circuits —
      // but the contract declares it, so it must be present.
      studentSecretKey: (ctx) => [ctx.privateState, ctx.privateState.studentSk],
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
  const status = deployed.deployTxData.public.status;
  const hex = (id) => `0x${String(id).replace(/^0x/, "")}`;

  // Included in a block is not the same as succeeded. `FailFallible` means the
  // transaction was accepted and paid for and did not do its job — which reads
  // as success to anything that only checks for an address coming back.
  if (status !== "SucceedEntirely") {
    fail(
      `the deploy transaction did not succeed — status ${status ?? "unknown"}.\n` +
        (txId ? `  ${EXPLORER}/transactions/${hex(txId)}\n` : "") +
        "  Do not put this address in .env.local; there is no usable contract\n" +
        "  at it. Check the explorer for the reason.",
    );
  }

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
