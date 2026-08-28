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
  return { ...body, signature: signCanonical(toCanonicalJson(body)) };
}

/** Strips the signature and re-derives the canonical bytes it covers. */
export function canonicalBodyOf(credential: SignedCredential): string {
  const { signature: _signature, ...body } = credential;
  return toCanonicalJson(body);
}
