// The witness must hand the circuit the SAME secret the subject came from.
//
// This is the shape of a bug that reached Preprod: publishProof() seeded the
// private-state provider with `{ studentSk: 0n }` — a placeholder — while
// `subject` had been derived from the student's real secret. The circuit
// computes `subjectCommitment(studentSecretKey())` and compares, so every
// publish failed on chain with "failed assert: not the credential holder",
// after the wallet had signed and the fee was paid.
//
// contracts/tests/circuit.test.ts could not catch it. Its Simulator receives
// the secret directly, so the two halves are the same value by construction.
// The bug lived in the seam between the private-state provider and the
// subject — a seam only the on-chain path crosses.
//
// These tests drive that seam explicitly: they vary the secret the witness
// returns INDEPENDENTLY of the subject, which is exactly what a wrong seed
// does.

import { describe, expect, it } from "vitest";
import { SLOT, STATUS_CODE } from "@/lib/school/canonical";
import { OPERATOR_CODE } from "@/lib/midnight/encoding";
import { Simulator, subjectCommitment } from "./simulator";

/** The student's real secret — the one `subject` is derived from. */
const REAL_SK = 424242n;

/** The placeholder that shipped by mistake. */
const PLACEHOLDER_SK = 0n;

const SCHOOL_ID_HASH = 0x1234abcdn;

function credentialFor(subject: bigint): bigint[] {
  const v = new Array<bigint>(16).fill(0n);
  v[SLOT.SCHOOL_ID] = SCHOOL_ID_HASH;
  v[SLOT.SUBJECT] = subject;
  v[SLOT.STATUS] = BigInt(STATUS_CODE.ACTIVE);
  v[SLOT.GPA_SCALED] = 372n;
  return v;
}

/**
 * Runs the circuit with the witness seeded from `witnessSk`, against a
 * `subject` derived from `subjectSk`. Equal in production; the bug made them
 * differ.
 */
function proveWith(witnessSk: bigint, subjectSk: bigint) {
  const subject = subjectCommitment(subjectSk);
  return Simulator.create({ studentSk: witnessSk }).then((sim) =>
    sim.proveCredentialPredicate({
      schoolIdHash: SCHOOL_ID_HASH,
      subject,
      slot: SLOT.GPA_SCALED,
      op: OPERATOR_CODE[">="],
      operand: 350n,
      credential: credentialFor(subject),
    }),
  );
}

describe("the private state must carry the student's real secret", () => {
  it("proves when the witness secret is the one the subject came from", async () => {
    expect(await proveWith(REAL_SK, REAL_SK)).toBe(true);
  });

  it("refuses the placeholder secret that shipped by mistake", async () => {
    // The exact failure seen on Preprod, reproduced for free. If someone
    // re-seeds the private state with a constant, this is what fails.
    await expect(proveWith(PLACEHOLDER_SK, REAL_SK)).rejects.toThrow(
      /not the credential holder/i,
    );
  });

  it("refuses any secret other than the subject's own", async () => {
    // Stated generally, so the test is not just about the number zero.
    await expect(proveWith(999n, REAL_SK)).rejects.toThrow(/not the credential holder/i);
    await expect(proveWith(REAL_SK, 999n)).rejects.toThrow(/not the credential holder/i);
  });
});
