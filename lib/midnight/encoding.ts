// The bridge between a credential and the circuit that reads it.
//
// Everything here exists because a circuit sees integers in fixed positions,
// while a credential is a JSON document. The translation has to be exact and
// it has to be reproducible in any language — a school issuing credentials
// from a Java backend must land on the same sixteen numbers, or the signature
// it produces will not verify.
//
// The slot layout itself lives in lib/school/canonical.ts, which is the file a
// school integrator reads. This module only converts and encodes.

import { DEGREE_CODE, SLOT, STATUS_CODE } from "@/lib/school/canonical";
import { hashToField, toCircuitVector } from "@/lib/school/circuit-vector";

// The vector layout is the school's, not ours — it is part of the public
// integration contract. Re-exported so the proof side has one import.
export { toCircuitVector };

/**
 * Operator codes, mirroring the `Operator` enum in contracts/src/eduproof.compact.
 *
 * These numbers cross a language boundary, so they are written out rather than
 * derived. A mismatch would not fail to compile — it would silently prove the
 * wrong statement, which is worse.
 */
export const OPERATOR_CODE = {
  "==": 0,
  "!=": 1,
  ">=": 2,
  ">": 3,
  "<=": 4,
  "<": 5,
} as const;

export type EncodableOperator = keyof typeof OPERATOR_CODE;

export function operatorCode(operator: EncodableOperator): bigint {
  return BigInt(OPERATOR_CODE[operator]);
}

/** The school-id hash the ledger keys its issuer registry by. */
export function schoolIdHash(schoolId: string): bigint {
  return hashToField(schoolId);
}

/**
 * Encodes a claim operand for the slot it is compared against.
 *
 * Enum-valued attributes compare by code or by hash, never by the string, so
 * this has to know which slot it is encoding for. Getting it wrong produces a
 * valid proof of a statement nobody asked about.
 */
export function encodeOperand(slot: number, operand: string | number): bigint {
  switch (slot) {
    case SLOT.STATUS:
      return BigInt(STATUS_CODE[String(operand).toUpperCase() as keyof typeof STATUS_CODE] ?? 0);
    case SLOT.DEGREE:
      return BigInt(DEGREE_CODE[String(operand).toUpperCase() as keyof typeof DEGREE_CODE] ?? 0);
    case SLOT.MAJOR:
    case SLOT.SCHOOL_ID:
      return hashToField(String(operand));
    case SLOT.GPA_SCALED:
      // The registry stores GPA ×100; the claim builder hands over the human
      // value, so scale here rather than trusting the caller to remember.
      return BigInt(Math.round(Number(operand) * 100));
    default:
      return BigInt(Math.round(Number(operand)));
  }
}
