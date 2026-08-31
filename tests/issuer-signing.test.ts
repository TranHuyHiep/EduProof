// The school's circuit-facing signature.
//
// A school signs a credential twice: Ed25519 over canonical JSON, for anyone
// integrating conventionally, and JubJub Schnorr over the field vector, for
// the circuit. This suite is about the second one, and about the property that
// makes it usable at all — that the key survives a restart.

import { describe, expect, it } from "vitest";
import { publicKeyOf, verify } from "@/lib/midnight/schnorr";
import { circuitPublicKey, circuitSigningKey, signFieldVector } from "@/lib/school/keys";
import { toCircuitVector } from "@/lib/midnight/encoding";
import type { CredentialBody } from "@/lib/school/types";

const SCHOOL_ID = "hanoi-university";

const body: CredentialBody = {
  schema: "eduproof/credential/v1",
  issuer: { schoolId: SCHOOL_ID, schoolName: "Hanoi University", keyId: "key-1" },
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

async function verifyingKey() {
  return publicKeyOf(await circuitSigningKey(SCHOOL_ID));
}

describe("the issuer key is stable", () => {
  it("derives the same key every time it is asked", async () => {
    // The property the whole scheme depends on. A key regenerated per process
    // — which is what serverless would do — invalidates every credential
    // already issued, and the symptom appears only after a deploy.
    const a = await circuitPublicKey(SCHOOL_ID);
    const b = await circuitPublicKey(SCHOOL_ID);
    expect(a).toEqual(b);
  });

  it("is a valid point on the curve", async () => {
    const pk = await verifyingKey();
    expect(typeof pk.x).toBe("bigint");
    expect(typeof pk.y).toBe("bigint");
  });

  it("is not the Ed25519 key, because the curves differ", async () => {
    // Two signatures over two representations. Conflating them would produce a
    // key that verifies neither.
    const { issuerPublicKey } = await import("@/lib/school/keys");
    const pk = await circuitPublicKey(SCHOOL_ID);
    expect(issuerPublicKey(SCHOOL_ID)).not.toContain(String(pk.x));
  });
});

describe("a signature over the credential vector", () => {
  it("verifies against the published issuer key", async () => {
    const vector = toCircuitVector(body, 12345n);
    const sig = await signFieldVector(SCHOOL_ID, vector);
    expect(await verify(vector, sig, await verifyingKey())).toBe(true);
  });

  it("fails once any attribute is rewritten", async () => {
    // The student holds the credential, so this is precisely the attack the
    // signature exists to stop: raising one's own GPA.
    const vector = toCircuitVector(body, 12345n);
    const sig = await signFieldVector(SCHOOL_ID, vector);
    const raised = { ...body, attributes: { ...body.attributes, gpaScaled: 400 } };
    expect(
      await verify(toCircuitVector(raised, 12345n), sig, await verifyingKey()),
    ).toBe(false);
  });

  it("fails when presented under a different subject", async () => {
    const sig = await signFieldVector(SCHOOL_ID, toCircuitVector(body, 12345n));
    expect(
      await verify(toCircuitVector(body, 99999n), sig, await verifyingKey()),
    ).toBe(false);
  });

  it("does not verify against another school's key", async () => {
    const vector = toCircuitVector(body, 12345n);
    const sig = await signFieldVector(SCHOOL_ID, vector);
    const other = await publicKeyOf(7654321n);
    expect(await verify(vector, sig, other)).toBe(false);
  });

  it("is randomised, so two signatures over the same credential differ", async () => {
    // Schnorr samples a fresh nonce. Identical announcements would leak the
    // key outright.
    const vector = toCircuitVector(body, 12345n);
    const a = await signFieldVector(SCHOOL_ID, vector);
    const b = await signFieldVector(SCHOOL_ID, vector);
    expect(a.announcement).not.toEqual(b.announcement);
    expect(await verify(vector, a, await verifyingKey())).toBe(true);
    expect(await verify(vector, b, await verifyingKey())).toBe(true);
  });
});
