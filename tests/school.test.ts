// The school integration contract.
//
// This schema is a public specification: another university wanting to work
// with EduProof implements it. So these tests describe the contract, not this
// particular implementation — a change that breaks them breaks integrators.
//
// Replaces the four ad-hoc verification scripts from block E.

import { beforeAll, describe, expect, it } from "vitest";
import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { executeSchoolQuery, type SchoolData } from "@/lib/school/schema";
import { loadSchoolData } from "@/lib/school/data";
import { canonicalBodyOf } from "@/lib/school/credential";
import { toCanonicalJson, GPA_SCALE, SLOT, VECTOR_SIZE } from "@/lib/school/canonical";
import { ATTRIBUTES } from "@/lib/proof/attributes";

let data: SchoolData;

const run = (query: string, variables?: Record<string, unknown>) =>
  executeSchoolQuery({ query, variables }, data);

beforeAll(() => {
  // A signing key must be present, or issuing falls back to an ephemeral key
  // and the signature assertions below would be meaningless.
  process.env.SCHOOL_SIGNING_KEY ??= readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith("SCHOOL_SIGNING_KEY="))
    ?.slice("SCHOOL_SIGNING_KEY=".length)
    .trim();

  data = loadSchoolData();
});

describe("the public school profile", () => {
  it("publishes the issuer key a verifier needs", async () => {
    const result = await run(`{ school { id name shortName country issuerKeyId issuerPublicKey } }`);
    expect(result.errors).toBeUndefined();

    const school = (result.data as { school: Record<string, string> }).school;
    expect(school.id).toBe("hanoi-university");
    expect(school.issuerPublicKey).toBeTruthy();
  });

  it("serves the same public key that data/schools.json publishes", async () => {
    // The whole trust model rests on this. If the served key drifts from the
    // registry, every signature verifies against the wrong key — the exact
    // failure that P2 in the vendor contract warns about.
    const result = await run(`{ school { issuerPublicKey } }`);
    const served = (result.data as { school: { issuerPublicKey: string } }).school.issuerPublicKey;

    const registry = JSON.parse(readFileSync("data/schools.json", "utf8")) as {
      schools: Array<{ id: string; issuerPublicKey: string }>;
    };
    const published = registry.schools.find((s) => s.id === "hanoi-university")?.issuerPublicKey;

    expect(served).toBe(published);
  });
});

describe("credential issuing", () => {
  const CREDENTIAL_QUERY = `query C($id: ID!) {
    credential(studentId: $id) {
      schema
      issuer { schoolId schoolName keyId }
      subject
      attributes { status gpaScaled gpaScale academicYear degree major }
      issuedAt expiresAt signature
    }
  }`;

  it("issues a credential for a known student", async () => {
    const result = await run(CREDENTIAL_QUERY, { id: "SV001" });
    expect(result.errors).toBeUndefined();

    const cred = (result.data as { credential: Record<string, unknown> }).credential;
    expect(cred.schema).toBe("eduproof/credential/v1");
    expect(cred.signature).toBeTruthy();
  });

  it("returns null for an unknown student rather than inventing one", async () => {
    const result = await run(CREDENTIAL_QUERY, { id: "SV999" });
    expect((result.data as { credential: unknown }).credential).toBeNull();
  });

  it("expresses GPA as a scaled integer, never a float", async () => {
    // A circuit has no floating point. Publishing `Float` would force a
    // breaking schema change in Wave 2 — hence P4 in the vendor contract.
    const result = await run(CREDENTIAL_QUERY, { id: "SV001" });
    const attrs = (result.data as { credential: { attributes: Record<string, unknown> } })
      .credential.attributes;

    expect(Number.isInteger(attrs.gpaScaled)).toBe(true);
    expect(attrs.gpaScale).toBe(GPA_SCALE);
    expect(attrs.gpaScaled).toBe(372); // Alice: 3.72
  });

  it("does not carry the issuer public key inside the credential", async () => {
    // A key travelling with the credential proves nothing: a forger would just
    // ship their own. The verifier must read it from the registry instead.
    const result = await run(`query C($id: ID!) { credential(studentId: $id) { signature } }`, { id: "SV001" });
    expect(JSON.stringify(result.data)).not.toContain("issuerPublicKey");
  });
});

describe("signatures", () => {
  async function issuedCredential(id: string) {
    const result = await run(`query C($id: ID!) {
      credential(studentId: $id) {
        schema issuer { schoolId schoolName keyId } subject
        attributes { status gpaScaled gpaScale academicYear degree major }
        issuedAt expiresAt signature
      }
    }`, { id });
    return (result.data as { credential: Record<string, unknown> }).credential;
  }

  function publishedKey() {
    const registry = JSON.parse(readFileSync("data/schools.json", "utf8")) as {
      schools: Array<{ id: string; issuerPublicKey: string }>;
    };
    const b64 = registry.schools.find((s) => s.id === "hanoi-university")!.issuerPublicKey;
    return createPublicKey({ key: Buffer.from(b64, "base64"), format: "der", type: "spki" });
  }

  it("verifies against the key published in the registry", async () => {
    const cred = await issuedCredential("SV001");
    const ok = verify(
      null,
      Buffer.from(canonicalBodyOf(cred as never), "utf8"),
      publishedKey(),
      Buffer.from(cred.signature as string, "base64"),
    );
    expect(ok).toBe(true);
  });

  it("fails once an attribute is tampered with", async () => {
    const cred = await issuedCredential("SV001");
    const tampered = {
      ...cred,
      attributes: { ...(cred.attributes as object), gpaScaled: 400 },
    };
    const ok = verify(
      null,
      Buffer.from(canonicalBodyOf(tampered as never), "utf8"),
      publishedKey(),
      Buffer.from(cred.signature as string, "base64"),
    );
    expect(ok).toBe(false);
  });
});

describe("canonicalisation (RFC 8785)", () => {
  // An integrating school signs in another language. If canonical bytes depend
  // on key insertion order, their signatures will not verify here.
  it("is independent of key order", () => {
    expect(toCanonicalJson({ b: 1, a: 2 })).toBe(toCanonicalJson({ a: 2, b: 1 }));
  });

  it("sorts keys and emits no insignificant whitespace", () => {
    expect(toCanonicalJson({ b: 1, a: { d: 4, c: 3 } })).toBe('{"a":{"c":3,"d":4},"b":1}');
  });

  it("preserves array order, which is significant", () => {
    expect(toCanonicalJson([3, 1, 2])).toBe("[3,1,2]");
  });

  it("omits undefined members instead of emitting null", () => {
    expect(toCanonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
  });
});

describe("the Wave 2 slot layout", () => {
  // These indices are part of the proving contract: the circuit takes
  // (slot, operator, operand). Renumbering silently breaks proofs.
  it("gives every provable attribute a slot inside the vector", () => {
    for (const attribute of ATTRIBUTES) {
      expect(attribute.slot).toBeGreaterThanOrEqual(0);
      expect(attribute.slot).toBeLessThan(VECTOR_SIZE);
    }
  });

  it("assigns each attribute a distinct slot", () => {
    const slots = ATTRIBUTES.map((a) => a.slot);
    expect(new Set(slots).size).toBe(slots.length);
  });

  it("keeps the registry aligned with the canonical layout", () => {
    // The registry and the credential encoder must agree, or a claim would
    // prove something about the wrong field.
    const bySlot: Record<string, number> = {
      status: SLOT.STATUS,
      gpa: SLOT.GPA_SCALED,
      academicYear: SLOT.ACADEMIC_YEAR,
      degree: SLOT.DEGREE,
      major: SLOT.MAJOR,
    };
    for (const attribute of ATTRIBUTES) {
      expect(attribute.slot).toBe(bySlot[attribute.id]);
    }
  });
});

describe("schema validation", () => {
  it("rejects a field that is not in the schema", async () => {
    // Real GraphQL validation, not regex matching on the query string — the
    // difference between a specification and a mock (P1 in the contract).
    const result = await run(`{ school { thisFieldDoesNotExist } }`);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it("rejects a malformed query", async () => {
    const result = await run(`{ school {`);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it("answers introspection so integrators can discover the schema", async () => {
    const result = await run(`{ __schema { queryType { name } } }`);
    expect(result.errors).toBeUndefined();
    expect(result.data).toBeTruthy();
  });

  it("has no public query returning every student record", async () => {
    // A roster endpoint without auth is a bulk-disclosure hole (P3).
    const result = await run(`{ students { id name } }`);
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});
