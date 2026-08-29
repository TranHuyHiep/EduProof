// Registers a school's circuit key in the deployed contract's issuer registry.
//
// Run: npm run contract:register-issuer
//
// Why this is its own step. Deploying runs the constructor, which leaves
// `issuers` empty. Until a school is registered ON CHAIN, two things are
// false: `proveCredentialPredicate` rejects every proof with "unknown
// issuer", and the verify page reports the issuer as not registered. The
// registry has only ever been populated in memory, per session
// (lib/midnight/prover.ts), which is enough to run the circuit locally and
// not enough to mean anything to a verifier.
//
// The key written here must be the same key the school signs with. It comes
// from lib/school/keys.ts rather than being passed in, so the two cannot
// drift: a mismatch would leave the contract holding a key that verifies
// nothing, discoverable only when a proof fails.
//
// This writes to a public chain and cannot be undone, so it asks first.

import { readFileSync } from "node:fs";

import {
  ASSETS,
  EXPLORER,
  PROOF_SERVER,
  confirm,
  fail,
  loadEnvLocal,
  openFundedWallet,
  redact,
} from "./lib/wallet-setup.mjs";

const PRIVATE_STATE_ID = "eduproof-deploy";

async function main() {
  loadEnvLocal();

  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address) {
    fail(
      "NEXT_PUBLIC_CONTRACT_ADDRESS is not set.\n" +
        "  Deploy first (npm run contract:deploy), then put the address it\n" +
        "  prints into .env.local.",
    );
  }

  // The school's identity, derived exactly as the school derives it.
  //
  // Reached through circuit-vector.ts and the JSON directly, not through
  // lib/school/data.ts or lib/midnight/encoding.ts: those import via the `@/`
  // alias, which Next resolves and plain Node does not. `schoolIdHash` is
  // `hashToField` under another name, so this is the same value the app
  // computes, by the same function.
  // Without the school's real signing key this would register an ephemeral
  // one, and every proof would then fail against a contract holding a key
  // that signs nothing — discoverable only much later, on chain, for a fee.
  // keys.ts warns and carries on; here it has to stop.
  if (!process.env.SCHOOL_SIGNING_KEY) {
    fail(
      "SCHOOL_SIGNING_KEY is not set.\n" +
        "  The key registered on chain must be the key the school signs with.\n" +
        "  Without it an ephemeral key would be generated and written to the\n" +
        "  chain, where it cannot be taken back.\n\n" +
        "  Run `npm run school:genkey`, put the result in .env.local, and use\n" +
        "  `npm run contract:register-issuer` so the file is loaded.",
    );
  }

  const { hashToField } = await import("../lib/school/circuit-vector.ts");
  const { circuitPublicKey } = await import("../lib/school/keys.ts");

  // One school in Wave 1. A loop here would suggest otherwise.
  const school = JSON.parse(readFileSync("data/schools.json", "utf8")).schools[0];
  const issuerPk = await circuitPublicKey();

  console.log("\nRegistering the issuer on chain\n");
  console.log(`  contract   ${address}`);
  console.log(`  school     ${school.id} (${school.name})`);
  console.log(`  key        x=${issuerPk.x.toString(16).slice(0, 16)}…`);

  const { walletProvider, config, storagePassword, walletAddress } = await openFundedWallet();

  // ── Confirm. This is public and permanent. ────────────────────────────

  console.log("\nThis writes the issuer registry to a public chain.");
  console.log("It costs DUST and cannot be undone.");

  if ((await confirm("\nType 'register' to continue: ")) !== "register") {
    await walletProvider.stop();
    console.log("\nCancelled. Nothing was submitted.");
    process.exit(0);
  }

  // ── Call the circuit ──────────────────────────────────────────────────

  const { findDeployedContract } = await import("@midnight-ntwrk/midnight-js-contracts");
  const { indexerPublicDataProvider } = await import(
    "@midnight-ntwrk/midnight-js-indexer-public-data-provider"
  );
  const { httpClientProofProvider } = await import(
    "@midnight-ntwrk/midnight-js-http-client-proof-provider"
  );
  const { levelPrivateStateProvider } = await import(
    "@midnight-ntwrk/midnight-js-level-private-state-provider"
  );
  const { NodeZkConfigProvider } = await import(
    "@midnight-ntwrk/midnight-js-node-zk-config-provider"
  );
  const CompiledContract = await import("@midnight-ntwrk/compact-js/effect/CompiledContract");
  const contractModule = await import(`../${ASSETS}/contract/index.js`);
  const runtime = await import("@midnight-ntwrk/compact-runtime");

  const providers = {
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    proofProvider: httpClientProofProvider(PROOF_SERVER),
    zkConfigProvider: new NodeZkConfigProvider(ASSETS),
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: PRIVATE_STATE_ID,
      privateStoragePasswordProvider: async () => storagePassword,
      accountId: walletAddress,
    }),
    walletProvider,
    midnightProvider: walletProvider,
  };

  const compiledContract = CompiledContract.make("eduproof", contractModule.Contract).pipe(
    CompiledContract.withWitnesses({
      studentSecretKey: (ctx) => [ctx.privateState, ctx.privateState.studentSk],
      getSchnorrReduction: (ctx, challengeHash) => [
        ctx.privateState,
        [challengeHash / (1n << 248n), challengeHash % (1n << 248n)],
      ],
    }),
    CompiledContract.withCompiledFileAssets(ASSETS),
  );

  const found = await findDeployedContract(providers, {
    compiledContract,
    contractAddress: address,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: { studentSk: 0n },
  });

  process.stdout.write("\nregistering — this generates a proof and may take minutes …");

  const result = await found.callTx.registerIssuer(
    hashToField(school.id),
    runtime.constructJubjubPoint(issuerPk.x, issuerPk.y),
  );

  // A transaction can reach a block and still have failed. `FailFallible`
  // means it was included, paid for, and did not do what it was asked — which
  // looks exactly like success to anything only checking for a txId.
  //
  // Only `txId` and `status` are read here: the result also carries the
  // call's private state, which the SDK marks confidential.
  const { public: pub } = result;
  const status = pub?.status;

  if (status !== "SucceedEntirely") {
    console.log(`\r${" ".repeat(60)}`);
    fail(
      `the transaction did not succeed — status ${status ?? "unknown"}.\n` +
        (pub?.txId ? `  ${EXPLORER}/transactions/0x${pub.txId}\n` : "") +
        "  The issuer is NOT registered. Nothing was silently half-done:\n" +
        "  check the explorer, then run this again.",
    );
  }

  console.log(`\r✓ ${school.id} registered${" ".repeat(40)}`);
  if (pub?.txId) console.log(`  ${EXPLORER}/transactions/0x${pub.txId}`);

  await walletProvider.stop();

  console.log("\n✓ done. Verify with:\n");
  console.log("    npm run contract:verify\n");
}

main().catch((error) => {
  console.error(`\n✗ ${redact(error?.message ?? error)}`);
  for (let cause = error?.cause, depth = 0; cause && depth < 5; cause = cause.cause, depth++) {
    console.error(`  caused by: ${redact(cause.message ?? cause)}`);
  }
  for (const key of ["code", "data", "details"]) {
    if (error?.[key] !== undefined) {
      console.error(`  ${key}: ${redact(JSON.stringify(error[key]))}`);
    }
  }
  process.exit(1);
});
