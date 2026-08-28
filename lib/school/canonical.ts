// Canonical form of a credential — the exact bytes that get signed.
//
// This file is the reason the whole integration works. A school in another
// language, on another stack, must be able to produce byte-identical output,
// or the signatures it issues will not verify here.
//
// Two representations, and the difference matters:
//
//   • toCanonicalJson  — RFC 8785 (JCS). What Wave 1 signs.
//   • toFieldVector    — the slot table the ZK circuit reads in Wave 2.
//
// The slot table is the one that constrains the design, so it is defined here
// from the start. Wave 2 moves the signature onto it; the schema does not have
// to change when that happens.

import type { CredentialBody, StudentStatus, Degree } from "./types.ts";

/** GPA is stored ×100. Circuits have no floating point. */
export const GPA_SCALE = 100;

/**
 * Slot layout for the field vector the Wave 2 circuit reads.
 *
 * `attributeId` in a claim IS the slot index, so this table and the attribute
 * registry in lib/proof must stay in lockstep. Sixteen slots leaves room to
 * add attributes without changing the circuit's vector size.
 */
export const SLOT = {
  SCHOOL_ID: 0,
  SUBJECT: 1,
  STATUS: 2,
  GPA_SCALED: 3,
  ACADEMIC_YEAR: 4,
  DEGREE: 5,
  MAJOR: 6,
  EXPIRES_AT: 7,
} as const;

export const VECTOR_SIZE = 16;

/** Enum→integer codes. Never renumber these; credentials already signed depend on them. */
export const STATUS_CODE: Record<StudentStatus, number> = {
  ACTIVE: 1,
  GRADUATED: 2,
  SUSPENDED: 3,
};

export const DEGREE_CODE: Record<Degree, number> = {
  BACHELOR: 1,
  MASTER: 2,
  PHD: 3,
};

/**
 * RFC 8785 JSON Canonicalization Scheme.
 *
 * Object keys sorted by UTF-16 code unit, no insignificant whitespace. Written
 * out rather than pulled from a dependency because it is thirty lines and it
 * is the one thing an integrating school must reimplement exactly.
 */
export function toCanonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map(toCanonicalJson).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${toCanonicalJson(v)}`).join(",")}}`;
}

/** FNV-1a, 32-bit. Maps a string to a slot value deterministically. */
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Days since the Unix epoch. Dates must be integers in a circuit. */
function toEpochDays(isoDate: string): number {
  return Math.floor(Date.parse(isoDate) / 86_400_000);
}

/**
 * The credential as the circuit sees it: integers only, fixed positions.
 *
 * Wave 1 does not sign this yet — but the claim evaluator already reads
 * attributes by slot index, so a mismatch here would surface immediately
 * rather than in Wave 2.
 */
export function toFieldVector(body: CredentialBody): number[] {
  const v = new Array<number>(VECTOR_SIZE).fill(0);

  v[SLOT.SCHOOL_ID] = hashString(body.issuer.schoolId);
  v[SLOT.SUBJECT] = hashString(body.subject);
  v[SLOT.STATUS] = STATUS_CODE[body.attributes.status];
  v[SLOT.GPA_SCALED] = body.attributes.gpaScaled;
  v[SLOT.ACADEMIC_YEAR] = body.attributes.academicYear;
  v[SLOT.DEGREE] = DEGREE_CODE[body.attributes.degree];
  v[SLOT.MAJOR] = hashString(body.attributes.major);
  v[SLOT.EXPIRES_AT] = toEpochDays(body.expiresAt);

  return v;
}
