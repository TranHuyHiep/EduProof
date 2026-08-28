// The claim engine: does a predicate produce the right boolean?
//
// This is the logic Wave 2 moves inside a Compact circuit. The truth table has
// to be settled here first — a circuit that faithfully implements the wrong
// comparison is still wrong, and much harder to debug.

import { describe, expect, it } from "vitest";
import {
  contradictions,
  defaultClaim,
  evaluateClaim,
  isDuplicate,
  labelOf,
  sentenceOf,
  statementOf,
} from "@/lib/proof/claims";
import { ATTRIBUTES, attributeSpec, operatorPhrase, valueLabel } from "@/lib/proof/attributes";
import type { ClaimOperator, ClaimRequest, Student } from "@/types";

/** Alice: active, GPA 3.72, year 3, Bachelor, Computer Science. */
const alice: Student = {
  id: "SV001",
  schoolId: "hanoi-university",
  name: "Alice Nguyen",
  status: "active",
  gpaScaled: 372,
  academicYear: 3,
  degree: "Bachelor",
  major: "Computer Science",
  enrolledAt: "2023-09-01T00:00:00.000Z",
  expiresAt: "2027-06-30T00:00:00.000Z",
};

const claim = (
  attribute: ClaimRequest["attribute"],
  operator: ClaimOperator,
  operand: string | number,
): ClaimRequest => ({ attribute, operator, operand });

const holds = (c: ClaimRequest) => evaluateClaim(alice, c).satisfied;

describe("numeric predicates run on scaled integers", () => {
  // GPA is stored ×100 (3.72 → 372) because a circuit has no floating point.
  // The operand is written in human units and scaled on the way in, so these
  // cases also pin down that conversion.
  it.each<[ClaimOperator, number, boolean]>([
    [">=", 3.5, true],
    [">=", 3.72, true],   // boundary: equal satisfies >=
    [">=", 3.8, false],
    [">", 3.72, false],   // boundary: equal fails >
    [">", 3.71, true],
    ["<=", 3.72, true],   // boundary: equal satisfies <=
    ["<=", 3.7, false],
    ["<", 3.72, false],   // boundary: equal fails <
    ["<", 3.73, true],
    ["==", 3.72, true],
    ["==", 3.7, false],
  ])("gpa %s %s → %s", (operator, operand, expected) => {
    expect(holds(claim("gpa", operator, operand))).toBe(expected);
  });

  it("compares 3.7 against 3.72 without floating-point drift", () => {
    // 3.7 * 100 is 370.00000000000006 in IEEE 754; rounding is what saves this.
    expect(holds(claim("gpa", ">=", 3.7))).toBe(true);
    expect(holds(claim("gpa", "==", 3.7))).toBe(false);
  });

  it.each<[ClaimOperator, number, boolean]>([
    [">=", 3, true],
    [">=", 4, false],
    [">", 2, true],
    ["<=", 3, true],
    ["<", 3, false],
    ["==", 3, true],
    ["!=", 3, false],
  ])("academicYear %s %s → %s", (operator, operand, expected) => {
    expect(holds(claim("academicYear", operator, operand))).toBe(expected);
  });
});

describe("enum predicates compare by identity", () => {
  it.each<[ClaimRequest["attribute"], ClaimOperator, string, boolean]>([
    ["status", "==", "active", true],
    ["status", "==", "suspended", false],
    ["status", "!=", "suspended", true],
    ["status", "!=", "active", false],
    ["degree", "==", "Bachelor", true],
    ["degree", "==", "PhD", false],
    ["degree", "!=", "PhD", true],
    ["major", "==", "Computer Science", true],
    ["major", "!=", "Physics", true],
  ])("%s %s %s → %s", (attribute, operator, operand, expected) => {
    expect(holds(claim(attribute, operator, operand))).toBe(expected);
  });
});

describe("every attribute supports every operator it advertises", () => {
  // The builder only offers `spec.operators`, so each must evaluate without
  // throwing and return an actual boolean — no undefined leaking through.
  for (const spec of ATTRIBUTES) {
    for (const operator of spec.operators) {
      it(`${spec.id} ${operator}`, () => {
        const operand = spec.kind === "number"
          ? (spec.suggestions?.[0] ?? spec.range?.min ?? 0)
          : (spec.options?.[0]?.value ?? "");
        expect(typeof holds(claim(spec.id, operator, operand))).toBe("boolean");
      });
    }
  }
});

describe("a claim result carries no private value", () => {
  // The structural guarantee, asserted at the smallest unit. `Proof` is checked
  // end to end in privacy.test.ts; this catches a regression at the source.
  it("exposes only the predicate, the operand and the outcome", () => {
    const result = evaluateClaim(alice, claim("gpa", ">=", 3.5));
    expect(Object.keys(result).sort()).toEqual(
      ["attribute", "label", "operand", "operator", "satisfied", "statement"],
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("372");
    expect(serialized).not.toContain("3.72");
    expect(serialized).not.toContain("Alice");
    expect(serialized).not.toContain("SV001");
  });

  it("says nothing different when the claim fails", () => {
    // A failing claim must not hint at the real value either.
    const result = evaluateClaim(alice, claim("gpa", ">=", 3.9));
    expect(result.satisfied).toBe(false);
    expect(JSON.stringify(result)).not.toContain("372");
  });
});

describe("sentences are generated, never hand-written", () => {
  it("reads in the first person for the student", () => {
    expect(sentenceOf(claim("gpa", ">=", 3.5))).toBe("My GPA is at least 3.50");
    expect(sentenceOf(claim("status", "!=", "suspended")))
      .toBe("My student status is not suspended");
    expect(sentenceOf(claim("degree", "==", "Bachelor")))
      .toBe("My degree is a Bachelor's");
  });

  it("reads in the third person for the verifier", () => {
    expect(labelOf(claim("gpa", ">=", 3.5))).toBe("GPA is at least 3.50");
    expect(labelOf(claim("status", "==", "active"))).toBe("student status is active");
  });

  it("keeps the machine-readable predicate separate from the wording", () => {
    expect(statementOf(claim("gpa", ">=", 3.5))).toBe("gpa >= 3.5");
  });

  it("never produces a dangling sentence for any attribute", () => {
    // V4 was exactly this: "My degree is" with nothing after it.
    for (const spec of ATTRIBUTES) {
      const sentence = sentenceOf(defaultClaim(spec.id));
      expect(sentence.startsWith(spec.subject)).toBe(true);
      expect(sentence.length).toBeGreaterThan(spec.subject.length + 2);
      expect(sentence.trimEnd()).toBe(sentence);
    }
  });

  it("phrases the same operator differently per kind", () => {
    expect(operatorPhrase("==", "enum")).toBe("is");
    expect(operatorPhrase("==", "number")).toBe("is exactly");
  });

  it("formats a scaled value to two decimals", () => {
    expect(valueLabel(attributeSpec("gpa"), 3.5)).toBe("3.50");
    expect(valueLabel(attributeSpec("academicYear"), 3)).toBe("3");
  });
});

describe("builder guards", () => {
  it("treats same attribute, operator and operand as a duplicate", () => {
    expect(isDuplicate(claim("gpa", ">=", 3.5), claim("gpa", ">=", 3.5))).toBe(true);
    expect(isDuplicate(claim("gpa", ">=", 3.5), claim("gpa", ">=", 3.0))).toBe(false);
    expect(isDuplicate(claim("gpa", ">=", 3.5), claim("gpa", "<", 3.5))).toBe(false);
  });

  it("flags an unsatisfiable numeric range", () => {
    expect(contradictions([claim("gpa", ">=", 3.5), claim("gpa", "<", 3.0)])).toHaveLength(1);
    expect(contradictions([claim("academicYear", ">", 4), claim("academicYear", "<=", 4)]))
      .toHaveLength(1);
  });

  it("accepts a range that is merely narrow", () => {
    expect(contradictions([claim("gpa", ">=", 3.0), claim("gpa", "<=", 3.5)])).toHaveLength(0);
    // A single point is satisfiable, so it must not be flagged.
    expect(contradictions([claim("gpa", ">=", 3.5), claim("gpa", "<=", 3.5)])).toHaveLength(0);
  });

  it("leaves enum attributes alone", () => {
    // Contradiction detection is range-based; enums have no ordering.
    expect(contradictions([claim("status", "==", "active"), claim("degree", "==", "PhD")]))
      .toHaveLength(0);
  });

  it("starts each attribute from a claim it actually allows", () => {
    for (const spec of ATTRIBUTES) {
      const row = defaultClaim(spec.id);
      expect(spec.operators).toContain(row.operator);
      if (spec.kind === "enum") {
        expect(spec.options?.map((o) => o.value)).toContain(row.operand);
      }
    }
  });

  it("rejects an unknown attribute rather than guessing", () => {
    expect(() => attributeSpec("nope" as never)).toThrow(/Unknown attribute/);
  });
});
