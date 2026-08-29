// What the circuit actually constrains.
//
// A circuit that returns the right Boolean but forgets to check the signature
// is worse than no circuit: it looks like a proof and proves nothing. So the
// happy paths here are the smaller half. The cases that matter are the ones
// where a bad input must make the circuit refuse outright.

import { beforeEach, describe, expect, it } from "vitest";
import { SLOT, STATUS_CODE, DEGREE_CODE } from "@/lib/school/canonical";
import { OPERATOR_CODE } from "@/lib/midnight/encoding";
import { School, Simulator, subjectCommitment } from "./simulator";

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

let school: School;
let sim: Simulator;
let subject: bigint;
let credential: bigint[];
let signature: Awaited<ReturnType<School["sign"]>>;

beforeEach(async () => {
  school = await School.create();
  sim = await Simulator.create({ studentSk: STUDENT_SK });
  await sim.registerIssuer(SCHOOL_ID_HASH, school.pk);

  subject = subjectCommitment(STUDENT_SK);
  credential = aliceCredential(subject);
  signature = await school.sign(credential);
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
    signature,
    ...overrides,
  });
}

describe("the issuer registry", () => {
  it("records the school's key on the public ledger", () => {
    expect(sim.ledger.issuers.member(SCHOOL_ID_HASH)).toBe(true);
    expect(sim.ledger.issuers.size()).toBe(1n);
  });

  it("holds no key for a school that never registered", () => {
    expect(sim.ledger.issuers.member(0xdeadn)).toBe(false);
  });
});

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

describe("a credential must come from a registered issuer", () => {
  it("refuses a school the ledger does not know", async () => {
    await expect(prove({ schoolIdHash: 0xbadbadn })).rejects.toThrow(/unknown issuer/i);
  });

  it("refuses a signature from a different school", async () => {
    const impostor = await School.create();
    await expect(prove({ signature: await impostor.sign(credential) }))
      .rejects.toThrow(/bad issuer signature/i);
  });

  it("refuses a credential whose issuer slot names another school", async () => {
    // Without this check, a signature valid under school A could be presented
    // against school B's registry entry.
    const forged = [...credential];
    forged[SLOT.SCHOOL_ID] = 0x9999n;
    await expect(prove({ credential: forged, signature: await school.sign(forged) }))
      .rejects.toThrow(/issuer mismatch/i);
  });
});

describe("the credential must not have been altered", () => {
  it.each([
    ["GPA", SLOT.GPA_SCALED, 400n],
    ["status", SLOT.STATUS, BigInt(STATUS_CODE.GRADUATED)],
    ["academic year", SLOT.ACADEMIC_YEAR, 8n],
    ["expiry", SLOT.EXPIRES_AT, 99999n],
  ] as const)("refuses a credential with a rewritten %s", async (_label, slot, value) => {
    // The student is the one holding the credential, so this is exactly the
    // attack the signature exists to stop.
    const tampered = [...credential];
    tampered[slot] = value;
    await expect(prove({ credential: tampered }))
      .rejects.toThrow(/bad issuer signature/i);
  });

  it("refuses a credential re-signed by the holder", async () => {
    const forger = await School.create();
    const tampered = [...credential];
    tampered[SLOT.GPA_SCALED] = 400n;
    await expect(prove({ credential: tampered, signature: await forger.sign(tampered) }))
      .rejects.toThrow(/bad issuer signature/i);
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
    // Bob's credential, correctly signed, presented under Alice's subject.
    const bobSubject = subjectCommitment(777n);
    const bobCredential = aliceCredential(bobSubject);
    await expect(
      prove({ credential: bobCredential, signature: await school.sign(bobCredential) }),
    ).rejects.toThrow(/subject mismatch/i);
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

  it("holds nothing but issuer keys and a count", () => {
    // The structural privacy guarantee, at the ledger level: there is nowhere
    // for a student value to be written even if a later circuit tried.
    expect(Object.keys(sim.ledger).sort()).toEqual(["issuers", "proofsVerified"]);
  });
});
