// Turning predicates into sentences, and evaluating them.
//
// Nothing here is specific to one attribute: everything reads from the
// registry in attributes.ts. That is what makes the claim set extensible —
// and, more importantly, what lets Wave 2 use ONE generic circuit taking
// (slot, operator, operand) instead of one circuit per claim type.

import type {
  AttributeSpec,
  ClaimOperator,
  ClaimRequest,
  ClaimResult,
  Student,
} from "@/types";
import { attributeSpec, operatorPhrase, valueLabel } from "./attributes";

/** `gpa >= 3.5` — the predicate as written, carrying no private value. */
export function statementOf(claim: ClaimRequest): string {
  return `${claim.attribute} ${claim.operator} ${claim.operand}`;
}

/**
 * First person, for the student choosing what to prove.
 * "My GPA is at least 3.50"
 */
export function sentenceOf(claim: ClaimRequest): string {
  const spec = attributeSpec(claim.attribute);
  return `${spec.subject} ${operatorPhrase(claim.operator, spec.kind)} ${valueLabel(
    spec,
    claim.operand
  )}`;
}

/**
 * Third person, for the verifier reading the result.
 * "GPA is at least 3.50"
 */
export function labelOf(claim: ClaimRequest): string {
  return sentenceOf(claim).replace(/^My /, "");
}

/** The integer both sides of the comparison are reduced to. */
function scaled(spec: AttributeSpec, value: number): number {
  return spec.scale ? Math.round(value * spec.scale) : value;
}

/** Reads the student's value for an attribute, already scaled. */
function actualValue(student: Student, spec: AttributeSpec): string | number {
  switch (spec.id) {
    case "status":
      return student.status;
    case "gpa":
      return student.gpaScaled; // already ×100
    case "academicYear":
      return student.academicYear;
    case "degree":
      return student.degree;
    case "major":
      return student.major;
  }
}

function compare(
  operator: ClaimOperator,
  actual: string | number,
  expected: string | number
): boolean {
  if (typeof actual === "number" && typeof expected === "number") {
    switch (operator) {
      case "==": return actual === expected;
      case "!=": return actual !== expected;
      case ">=": return actual >= expected;
      case ">":  return actual > expected;
      case "<=": return actual <= expected;
      case "<":  return actual < expected;
    }
  }
  // Enums compare by identity; ordering operators are not offered for them.
  return operator === "!=" ? String(actual) !== String(expected) : String(actual) === String(expected);
}

/**
 * Evaluates a predicate against the student record.
 *
 * In the Midnight build this comparison happens INSIDE the circuit, over a
 * private witness. Here it runs in plain TypeScript — same truth value, no
 * zero-knowledge property. Only the boolean ever leaves this function.
 */
export function evaluateClaim(student: Student, claim: ClaimRequest): ClaimResult {
  const spec = attributeSpec(claim.attribute);
  const actual = actualValue(student, spec);
  const expected =
    spec.kind === "number" ? scaled(spec, Number(claim.operand)) : claim.operand;

  return {
    ...claim,
    satisfied: compare(claim.operator, actual, expected),
    statement: statementOf(claim),
    label: labelOf(claim),
  };
}

/** A claim row the builder can start from. */
export function defaultClaim(attribute: ClaimRequest["attribute"]): ClaimRequest {
  const spec = attributeSpec(attribute);
  return {
    attribute,
    operator: spec.defaultOperator,
    operand: spec.defaultValue,
  };
}

/** Two rows are duplicates when they assert the same thing. */
export function isDuplicate(a: ClaimRequest, b: ClaimRequest): boolean {
  return a.attribute === b.attribute && a.operator === b.operator &&
    String(a.operand) === String(b.operand);
}

/**
 * Finds pairs that cannot both hold — `gpa >= 3.5` next to `gpa < 3.0`.
 *
 * Advisory only: the proof would simply come back unsatisfied. Catching it in
 * the builder saves the student a pointless round trip.
 */
export function contradictions(claims: ClaimRequest[]): string[] {
  const problems: string[] = [];

  for (const spec of new Set(claims.map((c) => attributeSpec(c.attribute)))) {
    if (spec.kind !== "number") continue;
    const rows = claims.filter((c) => c.attribute === spec.id);

    let lower = -Infinity;
    let upper = Infinity;
    for (const r of rows) {
      const v = scaled(spec, Number(r.operand));
      if (r.operator === ">=" ) lower = Math.max(lower, v);
      if (r.operator === ">")   lower = Math.max(lower, v + 1);
      if (r.operator === "<=")  upper = Math.min(upper, v);
      if (r.operator === "<")   upper = Math.min(upper, v - 1);
    }
    if (lower > upper) {
      problems.push(`${spec.subject} cannot satisfy all of these at once.`);
    }
  }

  return problems;
}
