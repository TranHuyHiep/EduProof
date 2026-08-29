// What the hand-rolled Schnorr discloses, and why it is safe to.
//
// `schnorr.compact` calls `disclose()` on the challenge split — `q` and
// `cTruncated`. Everything else the circuit touches stays a witness, but these
// two cross into a public assertion, and the challenge hash is computed over
// the credential. That deserves a test rather than an argument.
//
// It is safe because the challenge also covers the announcement, which is
// derived from a fresh nonce per signature. So the disclosed value is
// different every time even for an identical credential: it cannot be used as
// a fingerprint to link two proofs to the same record, and it cannot be
// inverted to recover the credential.
//
// If someone ever makes the nonce deterministic — a tempting "simplification"
// — this test is what stops it shipping.

import { describe, expect, it } from "vitest";
import {
  TWO_248,
  fullChallenge,
  publicKeyOf,
  reduction,
  sign,
} from "../../lib/midnight/schnorr.ts";

const SK = 987654321n;

/** A credential with a recognisable GPA in slot 3. */
const CREDENTIAL = [
  111n, 222n, 1n, 372n, 3n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n,
];

async function disclosedFor(credential: bigint[]) {
  const pk = await publicKeyOf(SK);
  const signature = await sign(credential, SK);
  const full = await fullChallenge(signature.announcement, pk, credential);
  const [q, cTruncated] = reduction(full);
  return { q, cTruncated };
}

describe("what the circuit discloses", () => {
  it("differs on every signing of the same credential", async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const { cTruncated } = await disclosedFor(CREDENTIAL);
      seen.add(cTruncated.toString());
    }

    // Five signings, five different disclosed challenges. A repeat would mean
    // the value identifies the credential, and two proofs could be linked.
    expect(seen.size).toBe(5);
  });

  it("never carries the credential's values in the clear", async () => {
    const { q, cTruncated } = await disclosedFor(CREDENTIAL);

    // The GPA is 372 and the subject 222. Neither should be recoverable from,
    // or equal to, anything disclosed.
    for (const slot of CREDENTIAL.filter((v) => v !== 0n)) {
      expect(cTruncated).not.toBe(slot);
      expect(q).not.toBe(slot);
    }
  });

  it("stays inside the range the circuit asserts", async () => {
    // The circuit requires q < 116 and the reconstruction to hold. If either
    // could be violated by an honest signer, honest proofs would fail.
    for (let i = 0; i < 10; i++) {
      const { q, cTruncated } = await disclosedFor(CREDENTIAL);
      expect(q).toBeLessThan(116n);
      expect(cTruncated).toBeLessThan(TWO_248);
    }
  });
});
