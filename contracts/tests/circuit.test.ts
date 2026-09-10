// What the circuit actually constrains.
//
// A circuit that returns the right Boolean but forgets to check what binds
// the credential to its holder is worse than no circuit: it looks like a
// proof and proves less than it appears to. So the happy paths here are the
// smaller half. The cases that matter are the ones where a bad input must
// make the circuit refuse outright.
//
// Ownership is now the ONLY security property this circuit enforces — issuer
// authenticity went with the Schnorr verification — so it gets the most
// coverage, and there is a test at the bottom recording exactly what was
// lost.

import { beforeEach, describe, expect, it } from "vitest";
import { SLOT, STATUS_CODE, DEGREE_CODE } from "@/lib/school/canonical";
import { OPERATOR_CODE } from "@/lib/midnight/encoding";
import { Simulator, subjectCommitment } from "./simulator";

const SCHOOL_ID_HASH = 0x1234abcdn;

/** Alice: enrolled, GPA 3.72, third year, BSc Computer Science. */
function aliceCredential(subject: bigint): bigint[] {
  const v = new Array<bigint>(16).fill(0n);
  v[SLOT.SCHOOL_ID] = SCHOOL_ID_HASH;
  v[SLOT.SUBJECT] = subject;
  v[SLOT.STATUS] = BigInt(STATUS_CODE.ACTIVE);
  v[SLOT.GPA_SCALED] = 372n;
  v[SLOT.ACADEMIC_YEAR] = 3n;
  v[SLOT.DEGREE] = BigInt(DEGREE_CODE.BACHELOR);
  v[SLOT.MAJOR] = 0xc0ffeen;
  v[SLOT.EXPIRES_AT] = 21000n;
  return v;
}

const STUDENT_SK = 424242n;

let sim: Simulator;
let subject: bigint;
let credential: bigint[];

beforeEach(async () => {
  sim = await Simulator.create({ studentSk: STUDENT_SK });
  subject = subjectCommitment(STUDENT_SK);
  credential = aliceCredential(subject);
});

/** Runs the main circuit with everything valid except what a test overrides. */
function prove(overrides: Partial<Parameters<Simulator["proveCredentialPredicate"]>[0]> = {}) {
  return sim.proveCredentialPredicate({
    schoolIdHash: SCHOOL_ID_HASH,
    subject,
    slot: SLOT.GPA_SCALED,
    op: OPERATOR_CODE[">="],
    operand: 350n,
    credential,
    ...overrides,
  });
}

describe("the predicate is evaluated on the requested slot", () => {
  it("passes when the GPA clears the bar", async () => {
    // 3.72 >= 3.50. The verifier learns this sentence and not the 372.
    expect(await prove()).toBe(true);
  });

  it("fails when the GPA does not, without refusing to run", async () => {
    // A false outcome is a legitimate result, not an error: the student may
    // want to prove `gpa < 3.0`, and a verifier must be able to see a "no".
    expect(await prove({ operand: 380n })).toBe(false);
  });

  it.each([
    [">=", 350n, true],
    [">=", 372n, true],
    [">=", 373n, false],
    [">", 371n, true],
    [">", 372n, false],
    ["<=", 372n, true],
    ["<=", 371n, false],
    ["<", 373n, true],
    ["<", 372n, false],
    ["==", 372n, true],
    ["==", 371n, false],
    ["!=", 371n, true],
    ["!=", 372n, false],
  ] as const)("applies %s %s on the GPA slot", async (op, operand, expected) => {
    expect(await prove({ op: OPERATOR_CODE[op], operand })).toBe(expected);
  });

  it("reads the status slot, not whichever slot was last used", async () => {
    expect(
      await prove({
        slot: SLOT.STATUS,
        op: OPERATOR_CODE["=="],
        operand: BigInt(STATUS_CODE.ACTIVE),
      }),
    ).toBe(true);
    expect(
      await prove({
        slot: SLOT.STATUS,
        op: OPERATOR_CODE["=="],
        operand: BigInt(STATUS_CODE.SUSPENDED),
      }),
    ).toBe(false);
  });

  it.each([
    ["academic year", SLOT.ACADEMIC_YEAR, OPERATOR_CODE[">="], 3n, true],
    ["academic year", SLOT.ACADEMIC_YEAR, OPERATOR_CODE[">="], 4n, false],
    ["degree", SLOT.DEGREE, OPERATOR_CODE["=="], BigInt(DEGREE_CODE.BACHELOR), true],
    ["degree", SLOT.DEGREE, OPERATOR_CODE["=="], BigInt(DEGREE_CODE.PHD), false],
    ["major", SLOT.MAJOR, OPERATOR_CODE["=="], 0xc0ffeen, true],
    ["major", SLOT.MAJOR, OPERATOR_CODE["!="], 0xc0ffeen, false],
  ] as const)("reads the %s slot", async (_label, slot, op, operand, expected) => {
    expect(await prove({ slot, op, operand })).toBe(expected);
  });

  it("reads an unused slot as zero rather than failing", async () => {
    // Slots 8..15 are reserved for attributes not yet defined. A predicate
    // against one should be answerable, not a crash.
    expect(await prove({ slot: 12, op: OPERATOR_CODE["=="], operand: 0n })).toBe(true);
  });
});

describe("a credential must name the school it is presented under", () => {
  it("refuses a credential whose issuer slot names another school", async () => {
    // Without this check, a credential issued for school A could be presented
    // as though it came from school B.
    const forged = [...credential];
    forged[SLOT.SCHOOL_ID] = 0x9999n;
    await expect(prove({ credential: forged })).rejects.toThrow(/issuer mismatch/i);
  });

  it("refuses when the statement names a school the credential does not", async () => {
    await expect(prove({ schoolIdHash: 0xbadbadn })).rejects.toThrow(/issuer mismatch/i);
  });
});

describe("only the holder can use a credential", () => {
  it("refuses when the wallet holds the wrong secret", async () => {
    // The stolen-credential case: someone has Alice's credential bytes but not
    // the key behind her subject commitment.
    sim.setPrivateState({ studentSk: 999n });
    await expect(prove()).rejects.toThrow(/not the credential holder/i);
  });

  it("refuses a subject that does not match the private key", async () => {
    await expect(prove({ subject: subjectCommitment(555n) }))
      .rejects.toThrow(/not the credential holder/i);
  });

  it("refuses a credential issued to someone else", async () => {
    // Bob's credential presented under Alice's subject.
    const bobSubject = subjectCommitment(777n);
    const bobCredential = aliceCredential(bobSubject);
    await expect(prove({ credential: bobCredential }))
      .rejects.toThrow(/subject mismatch/i);
  });

  it("accepts the holder whose secret matches", async () => {
    expect(subjectCommitment(STUDENT_SK)).toBe(subject);
    expect(await prove()).toBe(true);
  });
});

describe("the public ledger records use without recording users", () => {
  it("counts verified predicates", async () => {
    expect(sim.ledger.proofsVerified).toBe(0n);
    await prove();
    await prove({ slot: SLOT.ACADEMIC_YEAR, operand: 2n });
    expect(sim.ledger.proofsVerified).toBe(2n);
  });

  it("does not count an attempt the circuit refused", async () => {
    await expect(prove({ schoolIdHash: 0xbadbadn })).rejects.toThrow();
    expect(sim.ledger.proofsVerified).toBe(0n);
  });

  it("holds nothing but a count", () => {
    // The structural privacy guarantee, at the ledger level: there is nowhere
    // for a student value to be written even if a later circuit tried.
    expect(Object.keys(sim.ledger).sort()).toEqual(["proofsVerified"]);
  });
});

// The property this version gave up, written down as a passing test.
//
// It is here so nobody has to read the contract header to discover it, and so
// that restoring issuer authenticity has an obvious place to start: this test
// should FAIL the day a signature check comes back.
describe("what this circuit does NOT prove", () => {
  it("accepts a credential nobody issued", async () => {
    // No school signed this. The GPA is invented. The circuit proves
    // "GPA >= 3.50" over it anyway, because nothing here checks a signature.
    //
    // The proof remains sound about the arithmetic and private about the
    // value — it simply says nothing about where the credential came from.
    const invented = new Array<bigint>(16).fill(0n);
    invented[SLOT.SCHOOL_ID] = SCHOOL_ID_HASH;
    invented[SLOT.SUBJECT] = subject;
    invented[SLOT.GPA_SCALED] = 400n;

    expect(await prove({ credential: invented })).toBe(true);
  });
});
