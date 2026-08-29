// The translation layer between a credential and the circuit.
//
// This is where a mistake is silent. A wrong slot or a wrong operator code
// does not crash: it produces a valid proof of a statement nobody asked for.
// The circuit tests prove the circuit is right about the vector it is given;
// these prove it is given the right vector.

import { describe, expect, it } from "vitest";
import {
  OPERATOR_CODE,
  encodeOperand,
  operatorCode,
  schoolIdHash,
  toCircuitVector,
} from "@/lib/midnight/encoding";
import { DEGREE_CODE, SLOT, STATUS_CODE } from "@/lib/school/canonical";
import { ATTRIBUTES } from "@/lib/proof/attributes";
import type { CredentialBody } from "@/lib/school/types";

const body: CredentialBody = {
  schema: "eduproof/credential/v1",
  issuer: { schoolId: "hanoi-university", schoolName: "Hanoi University", keyId: "key-1" },
  subject: "SV001",
  attributes: {
    status: "ACTIVE",
    gpaScaled: 372,
    gpaScale: 100,
    academicYear: 3,
    degree: "BACHELOR",
    major: "Computer Science",
  },
  issuedAt: "2026-08-01T00:00:00.000Z",
  expiresAt: "2027-06-30T00:00:00.000Z",
};

const COMMITMENT = 987654321n;

describe("the credential vector", () => {
  const v = toCircuitVector(body, COMMITMENT);

  it("has exactly the sixteen slots the circuit declares", () => {
    expect(v).toHaveLength(16);
    expect(v.every((x) => typeof x === "bigint")).toBe(true);
  });

  it("puts each attribute in the slot the circuit reads it from", () => {
    expect(v[SLOT.SUBJECT]).toBe(COMMITMENT);
    expect(v[SLOT.STATUS]).toBe(BigInt(STATUS_CODE.ACTIVE));
    expect(v[SLOT.GPA_SCALED]).toBe(372n);
    expect(v[SLOT.ACADEMIC_YEAR]).toBe(3n);
    expect(v[SLOT.DEGREE]).toBe(BigInt(DEGREE_CODE.BACHELOR));
  });

  it("carries the GPA as the scaled integer, never as a decimal", () => {
    // 3.72 has no representation in a circuit. 372 does.
    expect(v[SLOT.GPA_SCALED]).toBe(372n);
    expect(String(v[SLOT.GPA_SCALED])).not.toContain(".");
  });

  it("hashes the issuer id into the slot the ledger is keyed by", () => {
    expect(v[SLOT.SCHOOL_ID]).toBe(schoolIdHash("hanoi-university"));
  });

  it("carries no name, no student id and no free text", () => {
    // Every slot is a number, so there is nowhere for a string to hide — but
    // assert it, because this is the guarantee the vector exists to provide.
    const serialized = v.map(String).join(",");
    expect(serialized).not.toContain("SV001");
    expect(serialized).not.toContain("Computer Science");
    expect(serialized).not.toContain("Hanoi");
  });

  it("turns the expiry into whole days, not milliseconds", () => {
    // Epoch millis would overflow the 64-bit comparison the circuit narrows to.
    expect(v[SLOT.EXPIRES_AT]).toBe(BigInt(Math.floor(Date.parse(body.expiresAt) / 86_400_000)));
    expect(v[SLOT.EXPIRES_AT]).toBeLessThan(100_000n);
  });

  it("leaves the unassigned slots at zero", () => {
    expect(v.slice(8)).toEqual(new Array(8).fill(0n));
  });

  it("is stable across calls, so a re-issued credential verifies", () => {
    expect(toCircuitVector(body, COMMITMENT)).toEqual(v);
  });

  it("changes when any attribute changes, so a rewrite breaks the signature", () => {
    const altered = { ...body, attributes: { ...body.attributes, gpaScaled: 400 } };
    expect(toCircuitVector(altered, COMMITMENT)).not.toEqual(v);
  });
});

describe("operator codes match the contract's enum", () => {
  it("uses the numbering declared in eduproof.compact", () => {
    // Written out rather than derived: this is the whole point of the test.
    expect(OPERATOR_CODE).toEqual({ "==": 0, "!=": 1, ">=": 2, ">": 3, "<=": 4, "<": 5 });
  });

  it("covers every operator the claim builder offers", () => {
    const offered = new Set(ATTRIBUTES.flatMap((a) => a.operators));
    for (const op of offered) {
      expect(OPERATOR_CODE, `operator ${op} has no circuit code`).toHaveProperty(op);
    }
  });

  it("returns a bigint, as the circuit argument requires", () => {
    expect(operatorCode(">=")).toBe(2n);
  });
});

describe("operands are encoded for the slot they are compared against", () => {
  it("scales a GPA the student typed", () => {
    expect(encodeOperand(SLOT.GPA_SCALED, 3.5)).toBe(350n);
    expect(encodeOperand(SLOT.GPA_SCALED, 3.72)).toBe(372n);
  });

  it("maps a status word to its code, not its characters", () => {
    expect(encodeOperand(SLOT.STATUS, "active")).toBe(BigInt(STATUS_CODE.ACTIVE));
    expect(encodeOperand(SLOT.STATUS, "graduated")).toBe(BigInt(STATUS_CODE.GRADUATED));
  });

  it("maps a degree the same way", () => {
    expect(encodeOperand(SLOT.DEGREE, "Bachelor")).toBe(BigInt(DEGREE_CODE.BACHELOR));
  });

  it("hashes a major so it matches the hashed slot", () => {
    const v = toCircuitVector(body, COMMITMENT);
    expect(encodeOperand(SLOT.MAJOR, "Computer Science")).toBe(v[SLOT.MAJOR]);
  });

  it("gives a different major a different hash", () => {
    expect(encodeOperand(SLOT.MAJOR, "Physics")).not.toBe(encodeOperand(SLOT.MAJOR, "Mathematics"));
  });

  it("passes a plain integer through", () => {
    expect(encodeOperand(SLOT.ACADEMIC_YEAR, 3)).toBe(3n);
  });
});

describe("the registry and the slot table stay in lockstep", () => {
  it("gives every provable attribute a slot the vector has", () => {
    // If these drift, the claim builder offers something the circuit cannot
    // read — and the failure would look like a wrong answer, not an error.
    for (const attribute of ATTRIBUTES) {
      expect(attribute.slot).toBeGreaterThanOrEqual(0);
      expect(attribute.slot).toBeLessThan(16);
    }
  });

  it("gives no two attributes the same slot", () => {
    const slots = ATTRIBUTES.map((a) => a.slot);
    expect(new Set(slots).size).toBe(slots.length);
  });

  it("never points an attribute at the subject or issuer slots", () => {
    // Those two are structural: a predicate over them would be meaningless.
    for (const attribute of ATTRIBUTES) {
      expect(attribute.slot).not.toBe(SLOT.SUBJECT);
      expect(attribute.slot).not.toBe(SLOT.SCHOOL_ID);
    }
  });
});
