// Types for the school's own system.
//
// Deliberately separate from types/index.ts: those are EduProof's domain
// types, these belong to the institution on the other side of the boundary.
// A school integrating with EduProof implements THIS shape.

export type StudentStatus = "ACTIVE" | "GRADUATED" | "SUSPENDED";
export type Degree = "BACHELOR" | "MASTER" | "PHD";

/** A record as the school holds it internally. Never leaves the registrar zone. */
export interface StudentRecord {
  id: string;
  schoolId: string;
  name: string;
  status: StudentStatus;
  /** GPA ×100. 372 means 3.72. */
  gpaScaled: number;
  gpaScale: number;
  academicYear: number;
  degree: Degree;
  major: string;
  enrolledAt: string;
  expiresAt: string;
}

export interface SchoolProfile {
  id: string;
  name: string;
  shortName: string;
  country: string;
  issuerKeyId: string;
  /** Ed25519 public key, base64 SPKI. Verifiers cross-check against a registry. */
  issuerPublicKey: string;
}

/**
 * The private witness. Lives only on the student's device.
 *
 * Every value is an integer or an enum so the Wave 2 circuit can read it
 * without a conversion step that could diverge between languages.
 */
export interface CredentialAttributes {
  status: StudentStatus;
  gpaScaled: number;
  gpaScale: number;
  academicYear: number;
  degree: Degree;
  major: string;
}

export interface CredentialIssuer {
  schoolId: string;
  schoolName: string;
  keyId: string;
}

/** Everything covered by the signature. */
export interface CredentialBody {
  schema: string;
  issuer: CredentialIssuer;
  subject: string;
  attributes: CredentialAttributes;
  issuedAt: string;
  expiresAt: string;
}

export interface SignedCredential extends CredentialBody {
  /** Ed25519 over the canonical form, base64. */
  signature: string;
}
