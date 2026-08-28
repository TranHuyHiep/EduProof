// The guarantee the whole product rests on: a proof discloses the outcome of a
// statement and nothing else.
//
// This is the test to keep if every other test is deleted. It fails loudly the
// day someone adds a convenient field to `Proof` — which is exactly how this
// kind of leak happens: not maliciously, but because a value was handy.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockProofProvider } from "@/lib/proof/mock-provider";
import { ATTRIBUTES } from "@/lib/proof/attributes";
import type { ClaimRequest, Proof, Student } from "@/types";
import { installMemoryLocalStorage } from "./helpers/local-storage";

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

/** Bob fails the GPA bar — a proof that says "no" must leak no more than one that says "yes". */
const bob: Student = {
  ...alice,
  id: "SV002",
  name: "Bob Tran",
  gpaScaled: 291,
  academicYear: 2,
};

const WALLET = "addr_demo117b668c35168d82d48598234386ccc02";

/**
 * Every private value, in each form it could plausibly escape in.
 * The scaled integer matters as much as the decimal: 372 is just as
 * identifying as 3.72, and it is the form the record actually holds.
 *
 * Note what is NOT listed: an operand the student chose to assert. In
 * `major == Computer Science` that string is the public half of the
 * predicate — the verifier has to see what is being claimed. What must never
 * appear is a value the student did not put in a claim, and above all the
 * measured values behind a comparison: the real GPA, the name, the id.
 */
function secretsOf(s: Student): string[] {
  return [
    s.name,
    s.name.split(" ")[0],
    s.id,
    String(s.gpaScaled),
    (s.gpaScaled / 100).toFixed(2),
    (s.gpaScaled / 100).toString(),
    s.enrolledAt,
  ];
}

const provider = new MockProofProvider();

const ALL_CLAIMS: ClaimRequest[] = [
  { attribute: "status", operator: "==", operand: "active" },
  { attribute: "gpa", operator: ">=", operand: 3.5 },
  { attribute: "academicYear", operator: ">=", operand: 3 },
  { attribute: "degree", operator: "==", operand: "Bachelor" },
  { attribute: "major", operator: "==", operand: "Computer Science" },
];

/** What a verifier receives: the proof minus the device-local owner field. */
function asSharedWithVerifier(proof: Proof): Omit<Proof, "owner"> {
  const { owner: _owner, ...shared } = proof;
  return shared;
}

/**
 * The verifier-facing proof with its random fields removed, ready to be
 * scanned for leaked values.
 *
 * `proofId`, `subject` and `payload` are random hex. Searching them for a
 * short number matches by coincidence — "372" turns up in a 64-character hex
 * string often enough to make the suite flaky, while saying nothing about
 * disclosure. Their opacity is asserted separately, by shape.
 */
function scannableFieldsOf(proof: Proof): string {
  const { owner: _owner, proofId: _id, subject: _subject, payload: _payload, ...rest } = proof;
  return JSON.stringify(rest);
}

/**
 * Resolves a provider call that is waiting on a simulated delay.
 *
 * The mock provider sleeps to imitate proving time. Awaiting that for real
 * would add seconds per test, so the clock is driven forward instead.
 */
async function settle<T>(pending: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return pending;
}

beforeEach(() => {
  installMemoryLocalStorage();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("a generated proof withholds every private value", () => {
  it("leaks nothing about a student whose claims all pass", async () => {
    const proof = await settle(provider.generateProof({
      student: alice, claims: ALL_CLAIMS, owner: WALLET,
    }));
    const serialized = scannableFieldsOf(proof);

    for (const secret of secretsOf(alice)) {
      expect(serialized, `leaked "${secret}"`).not.toContain(secret);
    }
  });

  it("leaks nothing about a student whose claims fail", async () => {
    // The dangerous case: a false outcome must not narrow down the real value.
    const proof = await settle(provider.generateProof({
      student: bob, claims: ALL_CLAIMS, owner: WALLET,
    }));
    expect(proof.claims.some((c) => !c.satisfied)).toBe(true);

    const serialized = scannableFieldsOf(proof);
    for (const secret of secretsOf(bob)) {
      expect(serialized, `leaked "${secret}"`).not.toContain(secret);
    }
  });

  it("never reveals an attribute the student did not assert", async () => {
    // Proving only enrolment must say nothing about the degree or the field of
    // study, even though the record holds both.
    const proof = await settle(provider.generateProof({
      student: alice,
      claims: [{ attribute: "status", operator: "==", operand: "active" }],
      owner: WALLET,
    }));
    const serialized = scannableFieldsOf(proof);

    expect(serialized).not.toContain(alice.major);
    expect(serialized).not.toContain(alice.degree);

    // The academic year is a small integer, so substring matching would trip
    // over hex and timestamps. Assert on structure: no claim mentions the
    // attribute, and it is not listed as read.
    expect(proof.claims.map((c) => c.attribute)).toEqual(["status"]);
    expect(proof.withheldAttributes).toEqual(["status"]);
  });

  it("discloses an operand only because the student chose to assert it", async () => {
    // The other side of the previous test: `major == Computer Science` is a
    // statement the student is making, so the verifier must be able to read it.
    const proof = await settle(provider.generateProof({
      student: alice,
      claims: [{ attribute: "major", operator: "==", operand: "Computer Science" }],
      owner: WALLET,
    }));
    expect(JSON.stringify(asSharedWithVerifier(proof))).toContain("Computer Science");
    // Still no measured value behind any comparison.
    expect(scannableFieldsOf(proof)).not.toContain("372");
  });

  it("gives two students the same shape, so a proof is not a fingerprint", async () => {
    const a = await settle(provider.generateProof({ student: alice, claims: ALL_CLAIMS, owner: WALLET }));
    const b = await settle(provider.generateProof({ student: bob, claims: ALL_CLAIMS, owner: WALLET }));
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
  });
});

describe("the subject handle is opaque", () => {
  it("is not derived from the student id or the wallet", async () => {
    const proof = await settle(provider.generateProof({
      student: alice, claims: ALL_CLAIMS, owner: WALLET,
    }));
    expect(proof.subject).not.toContain(alice.id);
    expect(proof.subject).not.toContain(WALLET);
    expect(proof.subject).toMatch(/^sub_[0-9a-f]{16}$/);
  });

  it("differs between proofs, so two cannot be linked to one student", async () => {
    const first = await settle(provider.generateProof({ student: alice, claims: ALL_CLAIMS, owner: WALLET }));
    const second = await settle(provider.generateProof({ student: alice, claims: ALL_CLAIMS, owner: WALLET }));
    expect(first.subject).not.toBe(second.subject);
  });
});

describe("the owner field stays on the device", () => {
  // `owner` exists so a student can list their own proofs. It is the one field
  // that could deanonymise them, so its boundary is worth pinning down.
  it("records the wallet for local listing", async () => {
    const proof = await settle(provider.generateProof({
      student: alice, claims: ALL_CLAIMS, owner: WALLET,
    }));
    expect(proof.owner).toBe(WALLET);
  });

  it("is the only field carrying the wallet", async () => {
    const proof = await settle(provider.generateProof({
      student: alice, claims: ALL_CLAIMS, owner: WALLET,
    }));
    expect(JSON.stringify(asSharedWithVerifier(proof))).not.toContain(WALLET);
  });
});

describe("Proof has no field that could hold a private value", () => {
  // Structural, not behavioural: the point is that there is nowhere to put one.
  it("exposes exactly the agreed field set", async () => {
    const proof = await settle(provider.generateProof({
      student: alice, claims: ALL_CLAIMS, owner: WALLET,
    }));
    expect(Object.keys(proof).sort()).toEqual([
      "claims", "createdAt", "expiresAt", "issuer", "owner", "payload",
      "proofId", "provider", "subject", "version", "withheldAttributes",
    ]);
  });

  it("names withheld attributes without quoting their values", async () => {
    const proof = await settle(provider.generateProof({
      student: alice, claims: ALL_CLAIMS, owner: WALLET,
    }));
    // Names of attributes read, never the values behind them.
    expect(proof.withheldAttributes.sort()).toEqual(
      ATTRIBUTES.map((a) => a.id).sort(),
    );
  });

  it("carries opaque proof material only", async () => {
    const proof = await settle(provider.generateProof({
      student: alice, claims: ALL_CLAIMS, owner: WALLET,
    }));
    expect(proof.payload).toMatch(/^mock_[0-9a-f]{64}$/);
  });
});

describe("what a verifier reads back", () => {
  it("returns the claim outcomes and no private value", async () => {
    const proof = await settle(provider.generateProof({
      student: alice, claims: ALL_CLAIMS, owner: WALLET,
    }));
    const result = await settle(provider.verifyProof(proof.proofId));

    expect(result.valid).toBe(true);
    expect(result.proof?.claims).toHaveLength(ALL_CLAIMS.length);

    const serialized = result.proof ? scannableFieldsOf(result.proof) : "";
    for (const secret of secretsOf(alice)) {
      expect(serialized, `leaked "${secret}"`).not.toContain(secret);
    }
  });

  it("refuses an unknown identifier without inventing a proof", async () => {
    const result = await settle(provider.verifyProof("pf_doesnotexist"));
    expect(result.valid).toBe(false);
    expect(result.proof).toBeUndefined();
    expect(result.reason).toBeTruthy();
  });

  it("rejects a proof whose credential has expired", async () => {
    const graduated: Student = { ...alice, expiresAt: "2020-01-01T00:00:00.000Z" };
    const proof = await settle(provider.generateProof({
      student: graduated, claims: ALL_CLAIMS, owner: WALLET,
    }));
    const result = await settle(provider.verifyProof(proof.proofId));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/expired/i);
  });
});

describe("generation refuses to produce an empty proof", () => {
  it("rejects a proof with no claims", async () => {
    await expect(
      provider.generateProof({ student: alice, claims: [], owner: WALLET }),
    ).rejects.toThrow(/at least one claim/i);
  });
});
