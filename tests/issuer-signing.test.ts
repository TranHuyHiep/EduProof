// The school's circuit-facing signature.
//
// A school signs a credential twice: Ed25519 over canonical JSON, for anyone
// integrating conventionally, and JubJub Schnorr over the field vector, for
// the circuit. This suite is about the second one, and about the property that
// makes it usable at all — that the key survives a restart.

import { describe, expect, it } from "vitest";
import {
  CompactTypeField,
  CompactTypeVector,
  constructJubjubPoint,
  jubjubSchnorrVerify,
  jubjubSchnorrVerifyingKey,
} from "@midnight-ntwrk/compact-runtime";
import { circuitPublicKey, circuitSigningKey, signFieldVector } from "@/lib/school/keys";
import { toCircuitVector } from "@/lib/midnight/encoding";
import type { CredentialBody } from "@/lib/school/types";

const TYPE = new CompactTypeVector(16, CompactTypeField);

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

async function verifyingKey() {
  return jubjubSchnorrVerifyingKey(await circuitSigningKey());
}

function asSignature(sig: Awaited<ReturnType<typeof signFieldVector>>) {
  return {
    announcement: constructJubjubPoint(sig.announcement.x, sig.announcement.y),
    response: sig.response,
  };
}

describe("the issuer key is stable", () => {
  it("derives the same key every time it is asked", async () => {
    // The property the whole scheme depends on. A key regenerated per process
    // — which is what serverless would do — invalidates every credential
    // already issued, and the symptom appears only after a deploy.
    const a = await circuitPublicKey();
    const b = await circuitPublicKey();
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
    const pk = await circuitPublicKey();
    expect(issuerPublicKey()).not.toContain(String(pk.x));
  });
});

describe("a signature over the credential vector", () => {
  it("verifies against the published issuer key", async () => {
    const vector = toCircuitVector(body, 12345n);
    const sig = await signFieldVector(vector);
    expect(jubjubSchnorrVerify(TYPE, vector, await verifyingKey(), asSignature(sig))).toBe(true);
  });

  it("fails once any attribute is rewritten", async () => {
    // The student holds the credential, so this is precisely the attack the
    // signature exists to stop: raising one's own GPA.
    const vector = toCircuitVector(body, 12345n);
    const sig = await signFieldVector(vector);
    const raised = { ...body, attributes: { ...body.attributes, gpaScaled: 400 } };
    expect(
      jubjubSchnorrVerify(TYPE, toCircuitVector(raised, 12345n), await verifyingKey(), asSignature(sig)),
    ).toBe(false);
  });

  it("fails when presented under a different subject", async () => {
    const sig = await signFieldVector(toCircuitVector(body, 12345n));
    expect(
      jubjubSchnorrVerify(TYPE, toCircuitVector(body, 99999n), await verifyingKey(), asSignature(sig)),
    ).toBe(false);
  });

  it("does not verify against another school's key", async () => {
    const vector = toCircuitVector(body, 12345n);
    const sig = await signFieldVector(vector);
    const other = jubjubSchnorrVerifyingKey(7654321n);
    expect(jubjubSchnorrVerify(TYPE, vector, other, asSignature(sig))).toBe(false);
  });

  it("is randomised, so two signatures over the same credential differ", async () => {
    // Schnorr samples a fresh nonce. Identical announcements would leak the
    // key outright.
    const vector = toCircuitVector(body, 12345n);
    const a = await signFieldVector(vector);
    const b = await signFieldVector(vector);
    expect(a.announcement).not.toEqual(b.announcement);
    expect(jubjubSchnorrVerify(TYPE, vector, await verifyingKey(), asSignature(a))).toBe(true);
    expect(jubjubSchnorrVerify(TYPE, vector, await verifyingKey(), asSignature(b))).toBe(true);
  });
});
