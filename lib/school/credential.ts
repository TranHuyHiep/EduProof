// Issuing a credential: assemble, canonicalise, sign.

import { GPA_SCALE, toCanonicalJson } from "./canonical.ts";
import { signCanonical } from "./keys.ts";
import type { CredentialBody, SchoolProfile, SignedCredential, StudentRecord } from "./types.ts";

export const CREDENTIAL_SCHEMA = "eduproof/credential/v1";

export function issueCredential(
  student: StudentRecord,
  school: SchoolProfile
): SignedCredential {
  const body: CredentialBody = {
    schema: CREDENTIAL_SCHEMA,
    issuer: {
      schoolId: student.schoolId,
      schoolName: school.name,
      keyId: school.issuerKeyId,
    },
    subject: student.id,
    attributes: {
      status: student.status,
      gpaScaled: student.gpaScaled,
      gpaScale: GPA_SCALE,
      academicYear: student.academicYear,
      degree: student.degree,
      major: student.major,
    },
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(student.expiresAt).toISOString(),
  };

  // Sign the canonical form, not JSON.stringify output — key order must not
  // depend on which language built the object.
  return { ...body, signature: signCanonical(student.schoolId, toCanonicalJson(body)) };
}

/** Strips the signature and re-derives the canonical bytes it covers. */
export function canonicalBodyOf(credential: SignedCredential): string {
  const { signature: _signature, ...body } = credential;
  return toCanonicalJson(body);
}

// --- Circuit-facing issuance ---------------------------------------------



/**
 * Signs the credential in the form a zero-knowledge circuit can check.
 *
 * The JSON signature above is for conventional integrators; this one is for
 * the circuit, which has no parser and reads sixteen integers in fixed
 * positions. Both cover the same facts.
 *
 * `subjectCommitment` comes from the student, who computed it from a secret
 * the school never sees. Signing it into slot 1 is what binds the credential
 * to its holder: without it, a leaked credential would prove just as well for
 * whoever picked it up.
 */
export async function signForCircuit(
  body: CredentialBody,
  subjectCommitment: bigint
): Promise<{
  circuitVector: string[];
  circuitSignature: {
    announcement: { x: string; y: string };
    response: string;
  };
}> {
  const { toCircuitVector } = await import("./circuit-vector.ts");
  const { signFieldVector } = await import("./keys.ts");

  // The commitment arrives from a client, so it cannot be assumed to be in
  // range. Out of range, the runtime traps with an opaque "unreachable"
  // instead of raising, and a bad request would look like a server fault.
  // `maxField()` is the runtime's own bound, rather than a constant repeated
  // here that could drift from it.
  const { maxField } = await import("@midnight-ntwrk/compact-runtime");
  if (subjectCommitment < 0n || subjectCommitment > maxField()) {
    throw new Error("subjectCommitment is out of range for the field.");
  }

  const vector = toCircuitVector(body, subjectCommitment);
  const signature = await signFieldVector(body.issuer.schoolId, vector);

  return {
    circuitVector: vector.map(String),
    circuitSignature: {
      announcement: {
        x: signature.announcement.x.toString(),
        y: signature.announcement.y.toString(),
      },
      response: signature.response.toString(),
    },
  };
}
