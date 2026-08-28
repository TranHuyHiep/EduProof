// Domain model. Free of React and of any proof-system specifics.

export type StudentStatus = "active" | "graduated" | "suspended";
export type Degree = "Bachelor" | "Master" | "PhD";

export interface School {
  id: string;
  name: string;
  shortName: string;
  country: string;
  issuerKeyId: string;
  verified: boolean;
}

export interface Student {
  id: string;
  schoolId: string;
  name: string;
  status: StudentStatus;
  gpa: number;
  academicYear: number;
  degree: Degree;
  major: string;
  enrolledAt: string;
  expiresAt: string;
}

// --- Claims -------------------------------------------------------------
// A claim is a PREDICATE over a private attribute, never the attribute itself.
// `attribute` names the private field the predicate reads. It is used to
// explain what stayed hidden; its VALUE is never handed to a verifier.

export type ClaimType =
  | "student_status"
  | "gpa_threshold"
  | "academic_year_threshold"
  | "degree"
  | "major";

export type ClaimOperator = "==" | ">=";

export type PrivateAttribute = "status" | "gpa" | "academicYear" | "degree" | "major";

/** A predicate the student asks to prove. Carries no private value. */
export interface ClaimRequest {
  type: ClaimType;
  attribute: PrivateAttribute;
  operator: ClaimOperator;
  /** The public comparison operand, e.g. 3.5 in `gpa >= 3.5`. */
  operand: string | number;
}

/** The outcome of a predicate. Still carries no private value. */
export interface ClaimResult extends ClaimRequest {
  satisfied: boolean;
  /** Human-readable predicate, e.g. "gpa >= 3.5". */
  statement: string;
  /** Verifier-facing wording, e.g. "GPA is at least 3.5". */
  label: string;
}

// --- Proof --------------------------------------------------------------

/** Stored and shared. Deliberately contains NO private attribute values. */
export interface Proof {
  proofId: string;
  version: string;
  /** Which provider produced it — "mock" now, "midnight" later. */
  provider: string;
  issuer: { schoolId: string; schoolName: string; keyId: string; verified: boolean };
  /** Opaque subject handle. Not the student ID. */
  subject: string;
  claims: ClaimResult[];
  /** Private attributes read by the circuit but never revealed. */
  withheldAttributes: PrivateAttribute[];
  createdAt: string;
  expiresAt: string;
  /** Opaque proof material. Meaningless in the mock provider. */
  payload: string;
}

export interface VerificationResult {
  valid: boolean;
  /** Set when `valid` is false. */
  reason?: string;
  proof?: Proof;
}
