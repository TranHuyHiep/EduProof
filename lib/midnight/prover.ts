// Running the circuit for one predicate.
//
// Kept apart from the provider so the WebAssembly runtime sits behind a single
// dynamic import, and so what is real here is easy to see:
//
//   • the credential is collected from the school, over GraphQL
//   • the school signs the canonical field vector, bound to a commitment the
//     student derived from a secret the school never sees
//   • the compiled circuit verifies that signature, verifies the caller holds
//     the secret, and evaluates the predicate
//
// The verdict is the circuit's. What is not yet here is publication: posting
// the proof to the preview network needs a funded wallet and a deployed
// contract address, which is step 5 of Phase 2 in the plan. The UI says so
// rather than implying more than has been built.

import type { Student } from "@/types";
import { fetchCircuitPublicKey, fetchCredential } from "@/lib/school-api";
import { schoolIdHash, toCircuitVector } from "./encoding";
import type { CredentialBody } from "@/lib/school/types";

/**
 * The student's proving secret.
 *
 * The witness behind the subject commitment, and the only thing separating the
 * holder of a credential from someone who merely has a copy of it. It stays in
 * this browser; Wave 2 moves it into the Midnight wallet, where a key belongs.
 *
 * Stored under its own key so clearing proofs does not destroy the identity
 * they were issued under.
 */
const SK_KEY = "eduproof.student.sk.v1";

function randomScalar(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // Clear the top four bits. A full 32-byte value overflows the 255-bit scalar
  // field roughly half the time, and the runtime answers that with a WASM trap
  // rather than an error — so the range is enforced here, before it can happen.
  bytes[0] &= 0x0f;
  return BigInt(`0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`);
}

export function studentSecretKey(): bigint {
  const stored = window.localStorage.getItem(SK_KEY);
  if (stored) return BigInt(stored);

  const sk = randomScalar();
  window.localStorage.setItem(SK_KEY, sk.toString());
  return sk;
}

/** The circuit's public+private arguments for one predicate call. */
export interface CircuitCallArgs {
  schoolIdHash: bigint;
  subject: bigint;
  /** Uint<8> on the circuit side — bigint here, unlike Simulator.prove's `number`. */
  slot: bigint;
  op: bigint;
  operand: bigint;
  credential: bigint[];
  signature: { announcement: import("@midnight-ntwrk/compact-runtime").JubjubPoint; response: bigint };
}

/** Everything needed to evaluate predicates against one student's credential. */
export interface ProvingSession {
  subject: bigint;
  evaluate(slot: number, op: bigint, operand: bigint): Promise<boolean>;
  /**
   * The same arguments `evaluate` passes to the local Simulator, handed back
   * for a caller that instead wants to run the circuit through a real
   * transaction (callTx.proveCredentialPredicate) — see publishProof() in
   * lib/proof/midnight-provider.ts. Not privacy-sensitive on its own:
   * `credential`/`signature` are exactly what the circuit call already
   * carries as private arguments; nothing here is written to `Proof`.
   */
  callArgs(slot: number, op: bigint, operand: bigint): CircuitCallArgs;
}

/**
 * Collects the credential and stands up a circuit ready to answer predicates.
 *
 * Done once per proof rather than once per claim: a student proving three
 * things should fetch one credential and register one issuer key.
 */
export async function openProvingSession(student: Student): Promise<ProvingSession> {
  const [runtime, { Simulator }] = await Promise.all([
    import("@midnight-ntwrk/compact-runtime"),
    import("./local-runner"),
  ]);

  const sk = studentSecretKey();
  const subject = runtime.transientHash(runtime.CompactTypeField, sk);

  // The commitment is public and unlinkable to the student on its own, so the
  // school can be told it. The secret behind it is never sent.
  const [credential, issuerPk] = await Promise.all([
    fetchCredential(student.schoolId, student.id, subject.toString()),
    fetchCircuitPublicKey(student.schoolId),
  ]);

  if (!credential.circuitSignature) {
    throw new Error("The school did not return a circuit signature for this credential.");
  }

  const vector = toCircuitVector(credential as unknown as CredentialBody, subject);
  const idHash = schoolIdHash(student.schoolId);

  const runner = await Simulator.create(sk);
  await runner.registerIssuer(idHash, runtime.constructJubjubPoint(issuerPk.x, issuerPk.y));

  const signature = {
    announcement: runtime.constructJubjubPoint(
      BigInt(credential.circuitSignature.announcement.x),
      BigInt(credential.circuitSignature.announcement.y),
    ),
    response: BigInt(credential.circuitSignature.response),
  };

  return {
    subject,
    evaluate: (slot, op, operand) =>
      runner.prove({ schoolIdHash: idHash, subject, slot, op, operand, credential: vector, signature }),
    callArgs: (slot, op, operand) => ({
      schoolIdHash: idHash,
      subject,
      slot: BigInt(slot),
      op,
      operand,
      credential: vector,
      signature,
    }),
  };
}
