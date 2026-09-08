// Calls proveCredentialPredicate on chain, for real, N times.
//
// Run: npm run contract:publish -- [count]
//
// What this is for. Every other way of running the circuit stops short of the
// chain: the simulator (contracts/tests/) runs the logic with no proof and no
// fee, and the browser path needs a person to click "sign" in a wallet
// extension. Neither produces a transaction anyone can look up. This does —
// each iteration generates a real zero-knowledge proof, pays real DUST, and
// leaves a transaction on Preprod with proofsVerified one higher than before.
//
// Why one process rather than N runs of a one-shot script. The dust wallet
// syncs from genesis — about 1.46M indices, two and a half hours cold — and
// testkit discards that when the process ends. A checkpoint (see
// lib/wallet-restore.mjs) reduces a restart to catching up, but ten restarts
// would still be ten catch-ups. So the wallet is opened ONCE and the loop
// runs inside it.
//
// Why the credential is issued here rather than fetched from the school API.
// The signature has to be made with the key the contract holds, and
// lib/school/keys.ts is where that key comes from — the same import
// register-issuer.mjs uses. Going through HTTP would add a running server to
// the list of things that can be wrong, and would not make the signature any
// more real: it is the same function either way.
//
// This writes to a public chain and cannot be undone, so it asks first.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

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

const PRIVATE_STATE_ID = "eduproof-publish";

// The compiled contract, imported by a STATIC specifier.
//
// It reads as a duplicate of ASSETS and is not: a template literal makes this
// a runtime-only import that Vite cannot analyse ("Unknown variable dynamic
// import"), and the failure lands inside fetchLedger's catch — where it comes
// back as `null` and the preflight reports "not registered" for a contract
// that is registered. A literal keeps the tests running the same code path
// the script does.
const CONTRACT_MODULE = "../contracts/build/eduproof/contract/index.js";

/** The student's secret. Fixed so the subject commitment is stable across runs. */
const STUDENT_SK = 424242n;

/** How many calls, unless overridden on the command line. */
const DEFAULT_COUNT = 10;

/**
 * The predicates to prove, one per call.
 *
 * Varied deliberately rather than repeating one statement: each is a
 * different slot/operator/operand triple, so a run exercises the comparison
 * logic across the vector instead of proving the same thing ten times. All of
 * them hold for the credential below — a false predicate is a legitimate
 * result, but it is not what this script is measuring.
 */
function predicatesFor(SLOT, OPERATOR_CODE, STATUS_CODE, DEGREE_CODE, hashToField) {
  return [
    { label: "gpa >= 3.50", slot: SLOT.GPA_SCALED, op: OPERATOR_CODE[">="], operand: 350n },
    { label: "gpa > 3.00", slot: SLOT.GPA_SCALED, op: OPERATOR_CODE[">"], operand: 300n },
    { label: "gpa <= 4.00", slot: SLOT.GPA_SCALED, op: OPERATOR_CODE["<="], operand: 400n },
    { label: "gpa != 1.00", slot: SLOT.GPA_SCALED, op: OPERATOR_CODE["!="], operand: 100n },
    {
      label: "status == ACTIVE",
      slot: SLOT.STATUS,
      op: OPERATOR_CODE["=="],
      operand: BigInt(STATUS_CODE.ACTIVE),
    },
    { label: "year >= 3", slot: SLOT.ACADEMIC_YEAR, op: OPERATOR_CODE[">="], operand: 3n },
    { label: "year < 5", slot: SLOT.ACADEMIC_YEAR, op: OPERATOR_CODE["<"], operand: 5n },
    {
      label: "degree == BACHELOR",
      slot: SLOT.DEGREE,
      op: OPERATOR_CODE["=="],
      operand: BigInt(DEGREE_CODE.BACHELOR),
    },
    {
      label: "major == Computer Science",
      slot: SLOT.MAJOR,
      op: OPERATOR_CODE["=="],
      operand: hashToField("Computer Science"),
    },
    { label: "gpa == 3.72", slot: SLOT.GPA_SCALED, op: OPERATOR_CODE["=="], operand: 372n },
  ];
}

/** A credential body shaped exactly as the school's issueCredential() produces one. */
function credentialBody(school) {
  return {
    schema: "eduproof/credential/v1",
    issuer: { schoolId: school.id, schoolName: school.name, keyId: school.issuerKeyId },
    subject: "student-onchain-publish",
    attributes: {
      status: "ACTIVE",
      gpaScaled: 372,
      gpaScale: 100,
      academicYear: 3,
      degree: "BACHELOR",
      major: "Computer Science",
    },
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 86_400_000).toISOString(),
  };
}

async function main() {
  loadEnvLocal();

  const requested = Number(process.argv[2] ?? DEFAULT_COUNT);
  if (!Number.isInteger(requested) || requested < 1 || requested > 50) {
    fail(`count must be a whole number between 1 and 50 — got "${process.argv[2]}".`);
  }

  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address) {
    fail(
      "NEXT_PUBLIC_CONTRACT_ADDRESS is not set.\n" +
        "  Deploy first (npm run contract:deploy), then put the address it\n" +
        "  prints into .env.local.",
    );
  }

  // Same reasoning as register-issuer.mjs: without the school's real key this
  // would sign with an ephemeral one, and every call would fail on chain with
  // "bad issuer signature" after paying the fee.
  if (!process.env.SCHOOL_SIGNING_KEY) {
    fail(
      "SCHOOL_SIGNING_KEY is not set.\n" +
        "  The credential must be signed with the key the contract holds.\n" +
        "  Without it every call would fail on chain, having paid the fee.",
    );
  }

  // Reached through the .ts modules directly rather than through the `@/`
  // alias, which Next resolves and plain Node does not.
  const { hashToField } = await import("../lib/school/circuit-vector.ts");
  const { circuitPublicKey } = await import("../lib/school/keys.ts");
  const { signForCircuit } = await import("../lib/school/credential.ts");
  const { SLOT, STATUS_CODE, DEGREE_CODE } = await import("../lib/school/canonical.ts");
  // The operator codes come from the COMPILED contract's own enum, not from
  // lib/midnight/encoding.ts. Two reasons: that module imports through the
  // `@/` alias, which Next resolves and plain Node does not; and this is the
  // compiler's own output, so it cannot drift from the circuit the way a
  // hand-written mirror can — the exact risk encoding.ts documents.
  const { Operator } = await import(CONTRACT_MODULE);
  const OPERATOR_CODE = {
    "==": Operator.EQ,
    "!=": Operator.NEQ,
    ">=": Operator.GTE,
    ">": Operator.GT,
    "<=": Operator.LTE,
    "<": Operator.LT,
  };
  const runtime = await import("@midnight-ntwrk/compact-runtime");

  const school = JSON.parse(readFileSync("data/schools.json", "utf8")).schools[0];
  const schoolIdHash = hashToField(school.id);
  const issuerPk = await circuitPublicKey(school.id);

  // The subject commitment, derived the way the circuit derives it. The
  // school never sees the secret behind it; it only signs the commitment.
  const subject = runtime.transientHash(runtime.CompactTypeField, STUDENT_SK);

  const all = predicatesFor(SLOT, OPERATOR_CODE, STATUS_CODE, DEGREE_CODE, hashToField);
  const count = Math.min(requested, all.length);
  const predicates = all.slice(0, count);

  console.log("\nPublishing proofs on chain\n");
  console.log(`  contract   ${address}`);
  console.log(`  school     ${school.id} (${school.name})`);
  console.log(`  key        x=${issuerPk.x.toString(16).slice(0, 16)}…`);
  console.log(`  calls      ${count}`);

  // ── The issuer key must already be on chain, and must be THIS key ─────
  //
  // Checked before the wallet opens, because the wallet costs hours and this
  // costs a second. A mismatch here is the "bad issuer signature" that cost a
  // day: the registry held a key from before SCHOOL_SIGNING_KEY was changed,
  // and nothing said so until a proof failed on chain, after paying.

  const { midnightConfig } = await import("../lib/midnight/config.ts");
  process.stdout.write("\nchecking the on-chain issuer key … ");

  const onChain = await readIssuerKey(midnightConfig.indexer, address, schoolIdHash, runtime);

  if (!onChain) {
    console.log("not registered");
    fail(
      `The contract holds no issuer key for ${school.id}.\n` +
        "  Register it first:  npm run contract:register-issuer",
    );
  }

  if (onChain.x !== issuerPk.x || onChain.y !== issuerPk.y) {
    console.log("MISMATCH");
    fail(
      "The key on chain is not the key this school signs with.\n\n" +
        `  on chain   x=${onChain.x}\n` +
        `  signing    x=${issuerPk.x}\n\n` +
        "  Every call would fail with 'bad issuer signature' after paying its\n" +
        "  fee. This is what changing SCHOOL_SIGNING_KEY after registering\n" +
        "  looks like. Re-register:  npm run contract:register-issuer",
    );
  }
  console.log("matches");

  // ── Confirm. This is public, permanent, and costs DUST per call. ──────

  const { walletProvider, config, storagePassword, walletAddress } = await openFundedWallet();

  console.log(`\nThis submits ${count} transaction(s) to a public chain.`);
  console.log("Each costs DUST and cannot be undone.");

  if ((await confirm("\nType 'publish' to continue: ")) !== "publish") {
    await walletProvider.stop();
    console.log("\nCancelled. Nothing was submitted.");
    process.exit(0);
  }

  // ── Wire up the contract ──────────────────────────────────────────────

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
  const contractModule = await import(CONTRACT_MODULE);

  const providers = {
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    proofProvider: httpClientProofProvider(PROOF_SERVER, new NodeZkConfigProvider(ASSETS)),
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
      // The wallet hands over the student's secret at proving time. It never
      // appears in a circuit argument, so nothing that builds a transaction
      // ever holds it.
      studentSecretKey: (ctx) => [ctx.privateState, ctx.privateState.studentSk],
      // The circuit hashes the challenge, then asks for the split. Checking a
      // division is cheap in a circuit; doing one is not.
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
    initialPrivateState: { studentSk: STUDENT_SK },
  });

  // ── The loop ──────────────────────────────────────────────────────────

  const body = credentialBody(school);
  const succeeded = [];
  const failed = [];

  for (const [index, predicate] of predicates.entries()) {
    const n = index + 1;
    console.log(`\n[${n}/${count}] ${predicate.label}`);

    try {
      // Re-signed per call. A real publish signs per proof, and a fresh nonce
      // gives a different challenge — and so a different reduction witness —
      // every time. Reusing one signature would test less than it appears to.
      const signed = await signForCircuit(body, subject);

      process.stdout.write("  proving and submitting — this takes minutes … ");

      const result = await found.callTx.proveCredentialPredicate(
        schoolIdHash,
        subject,
        BigInt(predicate.slot),
        BigInt(predicate.op),
        predicate.operand,
        signed.circuitVector.map(BigInt),
        {
          announcement: runtime.constructJubjubPoint(
            BigInt(signed.circuitSignature.announcement.x),
            BigInt(signed.circuitSignature.announcement.y),
          ),
          response: BigInt(signed.circuitSignature.response),
        },
      );

      // A transaction can reach a block and still have failed. `FailFallible`
      // means it was included, paid for, and did not do what it was asked —
      // which looks exactly like success to anything checking only for a txId.
      //
      // Only txId and status are read: the result also carries the call's
      // private state, which the SDK marks confidential.
      const { public: pub } = result;

      if (pub?.status !== "SucceedEntirely") {
        console.log(`FAILED (${pub?.status ?? "unknown"})`);
        failed.push({ ...predicate, status: pub?.status, txId: pub?.txId });
        continue;
      }

      console.log("ok");
      console.log(`  ${EXPLORER}/transactions/0x${pub.txId}`);
      succeeded.push({ ...predicate, txId: pub.txId });
    } catch (error) {
      // One failed call must not cost the run its wallet sync: the remaining
      // predicates are still worth attempting, and the summary reports what
      // happened to each.
      console.log("FAILED");
      console.log(`  ${redact(error?.message ?? error)}`);
      failed.push({ ...predicate, error: redact(error?.message ?? error) });
    }
  }

  await walletProvider.stop();

  // ── What the chain says, read back independently ──────────────────────

  console.log(`\n\n${succeeded.length} succeeded, ${failed.length} failed\n`);

  for (const s of succeeded) {
    console.log(`  ✓ ${s.label}`);
    console.log(`    ${EXPLORER}/transactions/0x${s.txId}`);
  }
  for (const f of failed) {
    console.log(`  ✗ ${f.label} — ${f.status ?? f.error ?? "unknown"}`);
  }

  // The SDK reporting success is not the same question as the chain holding
  // the result. Read proofsVerified back from the indexer.
  process.stdout.write("\nreading proofsVerified from the indexer … ");
  const verified = await readProofsVerified(midnightConfig.indexer, address, runtime);
  console.log(verified === null ? "unavailable" : verified.toString());

  console.log(`\n  contract  ${EXPLORER}/contracts/${address}\n`);

  if (failed.length > 0) process.exitCode = 1;
}

// --- Reading the ledger straight from the indexer ------------------------
//
// Not through the SDK: this is the independent check that the SDK's own
// report is true, so it must not go through the thing being checked.

export async function fetchLedger(indexer, address, runtime) {
  const res = await fetch(indexer, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `query { contractAction(address: "${address}") { state } }`,
    }),
    signal: AbortSignal.timeout(20000),
  });

  const json = await res.json();
  const hex = json?.data?.contractAction?.state;
  if (!hex) return null;

  const { ledger } = await import(CONTRACT_MODULE);
  const state = runtime.ContractState.deserialize(Uint8Array.from(Buffer.from(hex, "hex")));
  return ledger(state.data);
}

export async function readIssuerKey(indexer, address, schoolIdHash, runtime) {
  try {
    const l = await fetchLedger(indexer, address, runtime);
    if (!l?.issuers.member(schoolIdHash)) return null;
    const pk = l.issuers.lookup(schoolIdHash);
    return { x: pk.x, y: pk.y };
  } catch {
    return null;
  }
}

export async function readProofsVerified(indexer, address, runtime) {
  try {
    const l = await fetchLedger(indexer, address, runtime);
    return l?.proofsVerified ?? null;
  } catch {
    return null;
  }
}

// Run only when invoked as a script. The ledger readers above are exported so
// tests can drive them against captured indexer responses, and importing this
// file must not submit transactions as a side effect.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) main().catch((error) => {
  console.error(`\n✗ ${redact(error?.message ?? error)}`);
  for (let cause = error?.cause, depth = 0; cause && depth < 5; cause = cause.cause, depth++) {
    console.error(`  caused by: ${redact(cause.message ?? cause)}`);
  }
  process.exit(1);
});
