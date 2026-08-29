// The school's circuit-facing GraphQL surface.
//
// The signature the circuit checks is issued over the wire, so the wire format
// is part of the proving contract. These tests treat the schema the way an
// integrating school would: through queries, not through internals.

import { describe, expect, it } from "vitest";
import { executeSchoolQuery } from "@/lib/school/schema";
import { loadSchoolData } from "@/lib/school/data";
import { toCircuitVector } from "@/lib/school/circuit-vector";
import { SLOT } from "@/lib/school/canonical";

const COMMITMENT = "12345678901234567890";

const schoolData = loadSchoolData();

async function run(query: string, variables: Record<string, unknown> = {}) {
  const result = await executeSchoolQuery({ query, variables }, schoolData);
  expect(result.errors, JSON.stringify(result.errors)).toBeUndefined();
  return result.data as Record<string, any>;
}

describe("the school publishes a circuit key", () => {
  it("returns a JubJub point alongside the Ed25519 key", async () => {
    const data = await run(`{ school { issuerPublicKey circuitPublicKey { x y } } }`);
    expect(data.school.issuerPublicKey).toBeTruthy();
    expect(BigInt(data.school.circuitPublicKey.x)).toBeGreaterThan(0n);
    expect(BigInt(data.school.circuitPublicKey.y)).toBeGreaterThan(0n);
  });

  it("returns the same key on every call", async () => {
    // Credentials already issued depend on this. A key that changed per
    // request would fail only after a restart, which is the worst time.
    const a = await run(`{ school { circuitPublicKey { x y } } }`);
    const b = await run(`{ school { circuitPublicKey { x y } } }`);
    expect(a.school.circuitPublicKey).toEqual(b.school.circuitPublicKey);
  });
});

describe("issuing a credential for a circuit", () => {
  const query = `
    query Cred($id: ID!, $c: String) {
      credential(studentId: $id, subjectCommitment: $c) {
        subject
        attributes { status gpaScaled academicYear degree major }
        signature
        circuitVector
        circuitSignature { announcement { x y } response }
      }
    }`;

  it("returns the vector and a signature over it", async () => {
    const id = schoolData.students[0].id;
    const { credential } = await run(query, { id, c: COMMITMENT });

    expect(credential.circuitVector).toHaveLength(16);
    expect(credential.circuitSignature.response).toMatch(/^\d+$/);
  });

  it("binds the credential to the commitment the student supplied", async () => {
    // Slot 1 is what stops a leaked credential being replayed by someone else.
    const id = schoolData.students[0].id;
    const { credential } = await run(query, { id, c: COMMITMENT });
    expect(credential.circuitVector[SLOT.SUBJECT]).toBe(COMMITMENT);
  });

  it("encodes the vector exactly as the shared function does", async () => {
    // The client rebuilds this vector locally to hand to the circuit. If the
    // two ever diverge, the signature stops verifying and nothing says why.
    const student = schoolData.students[0];
    const { credential } = await run(query, { id: student.id, c: COMMITMENT });

    const local = toCircuitVector(
      {
        schema: "eduproof/credential/v1",
        issuer: {
          schoolId: student.schoolId,
          schoolName: schoolData.school.name,
          keyId: schoolData.school.issuerKeyId,
        },
        subject: student.id,
        attributes: {
          status: student.status,
          gpaScaled: student.gpaScaled,
          gpaScale: student.gpaScale,
          academicYear: student.academicYear,
          degree: student.degree,
          major: student.major,
        },
        issuedAt: "ignored",
        expiresAt: new Date(student.expiresAt).toISOString(),
      },
      BigInt(COMMITMENT),
    );

    expect(credential.circuitVector).toEqual(local.map(String));
  });

  it("still issues the conventional Ed25519 credential", async () => {
    // The circuit signature is additive: an integrator who ignores it must
    // keep working exactly as before.
    const id = schoolData.students[0].id;
    const { credential } = await run(query, { id, c: COMMITMENT });
    expect(credential.signature).toBeTruthy();
  });

  it("omits the circuit half when no commitment is supplied", async () => {
    // The vector cannot be built without a holder to bind it to, and inventing
    // one would produce a credential nobody can use.
    const id = schoolData.students[0].id;
    const { credential } = await run(query, { id, c: null });
    expect(credential.circuitSignature).toBeNull();
    expect(credential.circuitVector).toBeNull();
  });

  it("rejects a commitment outside the field instead of trapping", async () => {
    // The commitment comes from a client, so it cannot be assumed to be in
    // range. Out of range the WASM runtime traps with an opaque "unreachable",
    // which would surface to the student as a server fault rather than a bad
    // request. This cost an hour to diagnose once; the guard is why it will not
    // cost it again.
    const tooBig = (
      52435875175126190479447740508185965837690552500527637822603658699938581184513n * 2n
    ).toString();

    const result = await executeSchoolQuery(
      { query, variables: { id: schoolData.students[0].id, c: tooBig } },
      schoolData,
    );

    expect(result.errors?.[0]?.message).toMatch(/out of range/i);
    expect(result.errors?.[0]?.message).not.toMatch(/unreachable/i);
  });

  it("accepts a commitment at the top of the field", async () => {
    const { maxField } = await import("@midnight-ntwrk/compact-runtime");
    const { credential } = await run(query, {
      id: schoolData.students[0].id,
      c: maxField().toString(),
    });
    expect(credential.circuitSignature.response).toMatch(/^\d+$/);
  });

  it("puts no name or student id in the vector", async () => {
    const student = schoolData.students[0];
    const { credential } = await run(query, { id: student.id, c: COMMITMENT });
    const joined = credential.circuitVector.join(",");
    expect(joined).not.toContain(student.name);
    expect(joined).not.toContain(student.id);
  });
});
