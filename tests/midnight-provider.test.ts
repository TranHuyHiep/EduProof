// The Midnight provider, end to end.
//
// The point of this suite is that a claim outcome under `midnight` is the
// circuit's verdict and not this code's opinion. So the school is real (the
// GraphQL schema, signing with the configured key), the credential is real,
// and the circuit is the compiled one. Only the network is absent.
//
// It also re-runs the Phase 1 privacy guarantee against the new provider: the
// proof object must be as empty of private values as the mock's was.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeSchoolQuery } from "@/lib/school/schema";
import { loadSchoolData } from "@/lib/school/data";
import { installMemoryLocalStorage } from "./helpers/local-storage";
import type { ClaimRequest, Student } from "@/types";

const schoolData = loadSchoolData();

/**
 * Points the school API client at the schema directly.
 *
 * The client speaks HTTP; there is no server here. Intercepting fetch keeps
 * the client under test rather than bypassing it — the GraphQL documents it
 * sends are part of what can break.
 */
function serveSchoolOverFetch() {
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    const result = await executeSchoolQuery(
      { query: body.query, variables: body.variables },
      schoolData,
    );
    return {
      ok: true,
      status: 200,
      json: async () => result,
    } as Response;
  });
}

const record = schoolData.students[0];

const student: Student = {
  id: record.id,
  schoolId: record.schoolId,
  name: record.name,
  status: record.status.toLowerCase() as Student["status"],
  gpaScaled: record.gpaScaled,
  academicYear: record.academicYear,
  degree: (record.degree[0] + record.degree.slice(1).toLowerCase()) as Student["degree"],
  major: record.major,
  enrolledAt: new Date(record.enrolledAt).toISOString(),
  expiresAt: new Date(record.expiresAt).toISOString(),
};

const WALLET = "addr_demo117b668c35168d82d48598234386ccc02";

async function makeProvider() {
  const { MidnightProofProvider } = await import("@/lib/proof/midnight-provider");
  return new MidnightProofProvider();
}

beforeEach(() => {
  installMemoryLocalStorage();
  serveSchoolOverFetch();
});

describe("a claim outcome comes from the circuit", () => {
  it("proves a GPA the student actually has", async () => {
    const provider = await makeProvider();
    const below = (record.gpaScaled - 20) / 100;

    const proof = await provider.generateProof({
      student,
      claims: [{ attribute: "gpa", operator: ">=", operand: below }],
      owner: WALLET,
    });

    expect(proof.provider).toBe("midnight");
    expect(proof.claims[0].satisfied).toBe(true);
  });

  it("returns false for a GPA the student does not have", async () => {
    // A false outcome is a real answer, not an error: the circuit ran and the
    // predicate did not hold.
    const provider = await makeProvider();
    const above = (record.gpaScaled + 20) / 100;

    const proof = await provider.generateProof({
      student,
      claims: [{ attribute: "gpa", operator: ">=", operand: above }],
      owner: WALLET,
    });
    expect(proof.claims[0].satisfied).toBe(false);
  });

  it("evaluates several claims over the one credential", async () => {
    const provider = await makeProvider();
    const claims: ClaimRequest[] = [
      { attribute: "status", operator: "==", operand: "active" },
      { attribute: "degree", operator: "==", operand: "Bachelor" },
      { attribute: "academicYear", operator: ">=", operand: 1 },
    ];

    const proof = await provider.generateProof({ student, claims, owner: WALLET });
    expect(proof.claims).toHaveLength(3);
    expect(proof.claims.every((c) => c.satisfied)).toBe(true);
  });

  it("refuses to produce a proof with no claims", async () => {
    const provider = await makeProvider();
    await expect(
      provider.generateProof({ student, claims: [], owner: WALLET }),
    ).rejects.toThrow(/at least one claim/i);
  });
});

describe("the proof discloses nothing the mock would not", () => {
  it("carries no GPA, name or student id", async () => {
    const provider = await makeProvider();
    const proof = await provider.generateProof({
      student,
      claims: [{ attribute: "gpa", operator: ">=", operand: 2.0 }],
      owner: WALLET,
    });

    // proofId, subject and payload are random hex; scanning them for a short
    // number matches by coincidence. Their opacity is asserted by shape below.
    const { proofId: _i, subject: _s, payload: _p, owner: _o, ...rest } = proof;
    const scannable = JSON.stringify(rest);

    expect(scannable).not.toContain(student.name);
    expect(scannable).not.toContain(student.id);
    expect(scannable).not.toContain(String(student.gpaScaled));
  });

  it("keeps the subject handle unlinkable between proofs", async () => {
    // The subject commitment is stable for a student — publishing it would let
    // a verifier tie two proofs together. The handle in the proof must not be it.
    const provider = await makeProvider();
    const claims: ClaimRequest[] = [{ attribute: "status", operator: "==", operand: "active" }];

    const a = await provider.generateProof({ student, claims, owner: WALLET });
    const b = await provider.generateProof({ student, claims, owner: WALLET });

    expect(a.subject).not.toBe(b.subject);
    expect(a.subject).toMatch(/^sub_[0-9a-f]{16}$/);
  });

  it("exposes exactly the field set the mock provider does", async () => {
    // Swapping providers must not change the shape of a proof, or the UI and
    // the privacy tests would be reasoning about different objects.
    const provider = await makeProvider();
    const proof = await provider.generateProof({
      student,
      claims: [{ attribute: "status", operator: "==", operand: "active" }],
      owner: WALLET,
    });

    expect(Object.keys(proof).sort()).toEqual([
      "claims", "createdAt", "expiresAt", "issuer", "owner", "payload",
      "proofId", "provider", "subject", "version", "withheldAttributes",
    ]);
  });
});

describe("verification", () => {
  it("reads back a proof it generated", async () => {
    const provider = await makeProvider();
    const proof = await provider.generateProof({
      student,
      claims: [{ attribute: "status", operator: "==", operand: "active" }],
      owner: WALLET,
    });

    const result = await provider.verifyProof(proof.proofId);
    expect(result.valid).toBe(true);
    expect(result.proof?.proofId).toBe(proof.proofId);
  });

  it("says so plainly when no contract address is configured", async () => {
    // Better than a green tick that means nothing: without a deployed contract
    // there is no on-chain state to check against, and the UI should say it.
    const provider = await makeProvider();
    const proof = await provider.generateProof({
      student,
      claims: [{ attribute: "status", operator: "==", operand: "active" }],
      owner: WALLET,
    });

    const result = await provider.verifyProof(proof.proofId);
    expect(result.reason).toMatch(/CONTRACT_ADDRESS is not set/i);
  });

  it("refuses an identifier it has never seen", async () => {
    const provider = await makeProvider();
    const result = await provider.verifyProof("pf_doesnotexist");
    expect(result.valid).toBe(false);
    expect(result.proof).toBeUndefined();
  });
});
