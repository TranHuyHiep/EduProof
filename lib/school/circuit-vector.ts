// The credential as sixteen integers — the form a circuit reads.
//
// This belongs to the school, not to EduProof: it is part of the integration
// contract, alongside the RFC 8785 canonical JSON in canonical.ts. A school
// issuing credentials from another stack must land on the same sixteen
// numbers, or the signature it produces will not verify in the circuit.
//
// The slot table itself lives in canonical.ts. This module only converts.

import { DEGREE_CODE, SLOT, STATUS_CODE, VECTOR_SIZE } from "./canonical.ts";
import type { CredentialBody } from "./types.ts";

/**
 * FNV-1a, 32 bits.
 *
 * The same function canonical.ts uses for its number vector, repeated here
 * because that one returns a JS number and a field element must be a bigint.
 * Keeping them textually identical is the point: a divergence here is a
 * divergence in what gets signed.
 */
export function hashToField(input: string): bigint {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return BigInt(h >>> 0);
}

/** Days since the Unix epoch. A circuit compares integers, not dates. */
function toEpochDays(iso: string): bigint {
  return BigInt(Math.floor(Date.parse(iso) / 86_400_000));
}

/**
 * The credential as the circuit sees it.
 *
 * `subjectCommitment` is supplied rather than derived: deriving it needs the
 * student's secret key, which the school does not have and must never see.
 */
export function toCircuitVector(body: CredentialBody, subjectCommitment: bigint): bigint[] {
  const v = new Array<bigint>(VECTOR_SIZE).fill(0n);

  v[SLOT.SCHOOL_ID] = hashToField(body.issuer.schoolId);
  v[SLOT.SUBJECT] = subjectCommitment;
  v[SLOT.STATUS] = BigInt(STATUS_CODE[body.attributes.status]);
  v[SLOT.GPA_SCALED] = BigInt(body.attributes.gpaScaled);
  v[SLOT.ACADEMIC_YEAR] = BigInt(body.attributes.academicYear);
  v[SLOT.DEGREE] = BigInt(DEGREE_CODE[body.attributes.degree]);
  v[SLOT.MAJOR] = hashToField(body.attributes.major);
  v[SLOT.EXPIRES_AT] = toEpochDays(body.expiresAt);

  return v;
}
