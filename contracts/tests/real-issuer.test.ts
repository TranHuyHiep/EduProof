// The circuit driven with the school's REAL key, the way production does it.
//
// Why this file exists, when circuit.test.ts already covers the circuit
// thoroughly: every case there builds its issuer with `School.create()`, which
// samples a fresh random key. That is right for testing what the circuit
// constrains — but it means the suite signs and registers with the same
// self-generated key, so it can never catch the two halves disagreeing.
//
// They did disagree. The key registered on Preprod on 30/08 was derived from
// the SCHOOL_SIGNING_KEY of that day; commit 6b9a567 ("change key") replaced
// it on 31/08. Every proof after that failed on chain with "bad issuer
// signature", and 311 green tests said nothing, because no test ever ran the
// circuit against a key it had not just made up.
//
// So the fixture here is deliberately NOT sampled: the issuer key comes from
// lib/school/keys.ts and the signature from lib/school/credential.ts — the
// same two functions the running app calls. A future edit that makes the
// registered key and the signing key diverge fails here, in a second, instead
// of on a public chain for a fee.

import { describe, expect, it } from "vitest";

import { OPERATOR_CODE } from "@/lib/midnight/encoding";
import { SLOT, STATUS_CODE, DEGREE_CODE } from "@/lib/school/canonical";
import { hashToField } from "@/lib/school/circuit-vector";
import { signForCircuit } from "@/lib/school/credential";
import { circuitPublicKey } from "@/lib/school/keys";
import type { CredentialBody } from "@/lib/school/types";

import { Simulator, subjectCommitment } from "./simulator";

const SCHOOL_ID = "hanoi-university";
const STUDENT_SK = 424242n;

/** A credential body shaped exactly as issueCredential() produces one. */
function credentialBody(): CredentialBody {
  return {
    schema: "eduproof/credential/v1",
    issuer: {
      schoolId: SCHOOL_ID,
      schoolName: "Hanoi University",
      keyId: "hu-issuer-key-01",
    },
    subject: "student-real-issuer-test",
    attributes: {
      status: "ACTIVE",
      gpaScaled: 372,
      gpaScale: 100,
      academicYear: 3,
      degree: "BACHELOR",
      major: "Computer Science",
    },
    issuedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2027-01-01T00:00:00.000Z",
  };
}

/**
 * The whole production path in one place: derive the school's key, register
 * it, have the school sign the vector, run the circuit.
 *
 * The signature comes from `signForCircuit`, so this exercises the same code
 * the /api/school route runs — not a re-implementation that could agree with
 * the circuit while the real one does not.
 */
async function setup() {
  const [issuerPk, sim] = await Promise.all([
    circuitPublicKey(SCHOOL_ID),
    Simulator.create({ studentSk: STUDENT_SK }),
  ]);

  const schoolIdHash = hashToField(SCHOOL_ID);
  await sim.registerIssuer(
    schoolIdHash,
    (await import("@midnight-ntwrk/compact-runtime")).constructJubjubPoint(
      issuerPk.x,
      issuerPk.y,
    ),
  );

  const subject = subjectCommitment(STUDENT_SK);
  const signed = await signForCircuit(credentialBody(), subject);

  return {
    sim,
    schoolIdHash,
    subject,
    credential: signed.circuitVector.map(BigInt),
    signature: {
      announcement: {
        x: BigInt(signed.circuitSignature.announcement.x),
        y: BigInt(signed.circuitSignature.announcement.y),
      },
      response: BigInt(signed.circuitSignature.response),
    },
  };
}

describe("the school's real key verifies in the circuit", () => {
  it("proves a predicate signed by the configured issuer key", async () => {
    const { sim, schoolIdHash, subject, credential, signature } = await setup();

    // If the registered key and the signing key ever drift apart, this is the
    // assertion that fails — with "bad issuer signature", the same message the
    // chain gave, but here for free.
    expect(
      await sim.proveCredentialPredicate({
        schoolIdHash,
        subject,
        slot: SLOT.GPA_SCALED,
        op: OPERATOR_CODE[">="],
        operand: 350n,
        credential,
        signature,
      }),
    ).toBe(true);
  });

  it("registers the same key the school signs with", async () => {
    // Stated directly, independent of the circuit: the point written to the
    // registry is derived from the same secret signFieldVector() uses. This is
    // the invariant scripts/register-issuer.mjs relies on.
    const { sim, schoolIdHash } = await setup();
    expect(sim.ledger.issuers.member(schoolIdHash)).toBe(true);
  });
});

// Ten successful calls, because that is what a chain run has to do and the
// circuit has never been asked to do it twice in a row with a real key. Each
// call re-signs — a fresh nonce per signature — so this also covers the
// challenge-reduction witness across many different challenge values, which a
// single call cannot.
describe("repeated calls against the real issuer", () => {
  it("verifies ten consecutive predicates and counts every one", async () => {
    const { sim, schoolIdHash, subject } = await setup();
    const body = credentialBody();

    const predicates = [
      { slot: SLOT.GPA_SCALED, op: OPERATOR_CODE[">="], operand: 350n },
      { slot: SLOT.GPA_SCALED, op: OPERATOR_CODE[">"], operand: 300n },
      { slot: SLOT.GPA_SCALED, op: OPERATOR_CODE["<="], operand: 400n },
      { slot: SLOT.GPA_SCALED, op: OPERATOR_CODE["=="], operand: 372n },
      { slot: SLOT.STATUS, op: OPERATOR_CODE["=="], operand: BigInt(STATUS_CODE.ACTIVE) },
      { slot: SLOT.ACADEMIC_YEAR, op: OPERATOR_CODE[">="], operand: 3n },
      { slot: SLOT.ACADEMIC_YEAR, op: OPERATOR_CODE["<"], operand: 5n },
      { slot: SLOT.DEGREE, op: OPERATOR_CODE["=="], operand: BigInt(DEGREE_CODE.BACHELOR) },
      { slot: SLOT.MAJOR, op: OPERATOR_CODE["=="], operand: hashToField("Computer Science") },
      { slot: SLOT.GPA_SCALED, op: OPERATOR_CODE["!="], operand: 100n },
    ];

    for (const [index, predicate] of predicates.entries()) {
      // Re-signed each time: a real publish signs per proof, and a fresh nonce
      // means a different challenge — and so a different reduction witness —
      // on every one of the ten.
      const signed = await signForCircuit(body, subject);

      const held = await sim.proveCredentialPredicate({
        schoolIdHash,
        subject,
        credential: signed.circuitVector.map(BigInt),
        signature: {
          announcement: {
            x: BigInt(signed.circuitSignature.announcement.x),
            y: BigInt(signed.circuitSignature.announcement.y),
          },
          response: BigInt(signed.circuitSignature.response),
        },
        ...predicate,
      });

      expect(held, `predicate ${index} (slot ${predicate.slot}) should hold`).toBe(true);
      expect(sim.ledger.proofsVerified).toBe(BigInt(index + 1));
    }

    // What the chain would show after ten publishes.
    expect(sim.ledger.proofsVerified).toBe(10n);
  });
});

describe("a key that is not the school's is still refused", () => {
  it("rejects a signature made with a different secret", async () => {
    // The drift bug's exact shape, reproduced deliberately: the registry holds
    // the school's key, the credential is signed with another. Proof that the
    // test above passes because the keys agree, not because the circuit is
    // lenient.
    const { sim, schoolIdHash, subject, credential } = await setup();
    const { sign } = await import("@/lib/midnight/schnorr");

    const wrongSignature = await sign(credential, 12345n);

    await expect(
      sim.proveCredentialPredicate({
        schoolIdHash,
        subject,
        slot: SLOT.GPA_SCALED,
        op: OPERATOR_CODE[">="],
        operand: 350n,
        credential,
        signature: wrongSignature,
      }),
    ).rejects.toThrow(/bad issuer signature/i);
  });
});
