// The operator codes crossing the Compact/TypeScript boundary.
//
// encoding.ts writes these numbers out by hand and says why: they mirror an
// enum in another language, and "a mismatch would not fail to compile — it
// would silently prove the wrong statement, which is worse."
//
// That comment describes a risk with nothing enforcing it. The compiled
// contract exports the enum itself, so the two can simply be compared —
// which is what scripts/publish-proofs.mjs relies on when it takes its codes
// from the compiler's output rather than from the mirror.

import { describe, expect, it } from "vitest";

import { OPERATOR_CODE } from "@/lib/midnight/encoding";
import { Operator } from "@/contracts/build/eduproof/contract/index.js";

describe("the hand-written operator codes match the compiled circuit", () => {
  it.each([
    ["==", "EQ"],
    ["!=", "NEQ"],
    [">=", "GTE"],
    [">", "GT"],
    ["<=", "LTE"],
    ["<", "LT"],
  ] as const)("%s is the circuit's %s", (symbol, name) => {
    expect(OPERATOR_CODE[symbol]).toBe(Operator[name]);
  });

  it("covers every operator the circuit defines", () => {
    // A new operator in the circuit with no mirror here would otherwise be
    // invisible until someone tried to use it.
    const circuitOperators = Object.values(Operator).filter((v) => typeof v === "number");
    expect(Object.values(OPERATOR_CODE).sort()).toEqual(circuitOperators.sort());
  });
});
