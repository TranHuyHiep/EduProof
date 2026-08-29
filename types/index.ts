// Domain model. Free of React and of any proof-system specifics.

export type StudentStatus = "active" | "graduated" | "suspended";
export type Degree = "Bachelor" | "Master" | "PhD";

export interface School {
  id: string;
  name: string;
  shortName: string;
  country: string;
  issuerKeyId: string;
  /** Ed25519 public key, base64 SPKI. Read from the school, not the credential. */
  issuerPublicKey?: string;
  verified: boolean;
}

export interface Student {
  id: string;
  schoolId: string;
  name: string;
  status: StudentStatus;
  /** GPA ×100. Integers only — a ZK circuit has no floating point. */
  gpaScaled: number;
  academicYear: number;
  degree: Degree;
  major: string;
  enrolledAt: string;
  expiresAt: string;
}

/** 372 → "3.72". Display only; comparisons run on the scaled integer. */
export function formatGpa(gpaScaled: number): string {
  return (gpaScaled / 100).toFixed(2);
}

// --- Claims -------------------------------------------------------------
// A claim is a PREDICATE over a private attribute, never the attribute itself.
// `attribute` names the private field the predicate reads. It is used to
// explain what stayed hidden; its VALUE is never handed to a verifier.

/**
 * A claim is a PREDICATE over a private attribute, never the attribute itself.
 *
 * Every claim reads as `<subject> <operator> <value>`:
 *
 *     My GPA              is at least      3.5
 *     My student status   is not           suspended
 *     My degree           is               a Bachelor's
 *
 * The three parts are chosen independently, which is what makes the claim
 * builder dynamic: adding an attribute means adding one registry entry, not
 * editing five places.
 */

export type ClaimOperator = "==" | "!=" | ">=" | ">" | "<=" | "<";

/** Decides which operators apply and how the value is picked in the UI. */
export type AttributeKind = "enum" | "number";

export type PrivateAttribute = "status" | "gpa" | "academicYear" | "degree" | "major";

export interface AttributeOption {
  value: string | number;
  /** Reads as the tail of a sentence: "My degree is **a Bachelor's**". */
  label: string;
}

/**
 * Describes one provable attribute.
 *
 * `slot` ties this registry to the field-vector layout in
 * lib/school/canonical.ts. Wave 2's circuit takes (slot, operator, operand),
 * so a mismatch here would break proving, not just display.
 */
export interface AttributeSpec {
  id: PrivateAttribute;
  kind: AttributeKind;
  slot: number;
  /** Sentence subject: "My GPA", "My student status". */
  subject: string;
  /** How a verifier sees the attribute named among what was withheld. */
  withheldLabel: string;
  operators: ClaimOperator[];
  /** enum only. */
  options?: AttributeOption[];
  /** number only. */
  range?: { min: number; max: number; step: number };
  /** number only — presets offered as quick picks. */
  suggestions?: number[];
  /** Multiplier applied before comparison, so circuits see integers. */
  scale?: number;
  defaultOperator: ClaimOperator;
  defaultValue: string | number;
}

/** A predicate the student asks to prove. Carries no private value. */
export interface ClaimRequest {
  attribute: PrivateAttribute;
  operator: ClaimOperator;
  /** The public comparison operand, e.g. 3.5 in `gpa >= 3.5`. */
  operand: string | number;
}

/** The outcome of a predicate. Still carries no private value. */
export interface ClaimResult extends ClaimRequest {
  satisfied: boolean;
  /** Machine-readable predicate, e.g. "gpa >= 3.5". */
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
  /** Opaque subject handle shown to verifiers. Not the student ID. */
  subject: string;
  /**
   * Which wallet made this proof — used to list a student's own proofs.
   *
   * Local to the device that created it and never sent to a verifier: it is
   * absent from every verifier-facing view. Wave 2 drops it entirely, because
   * the chain answers "which proofs are mine" without the app storing a link.
   */
  owner: string;
  claims: ClaimResult[];
  /** Private attributes read by the circuit but never revealed. */
  withheldAttributes: PrivateAttribute[];
  createdAt: string;
  expiresAt: string;
  /** Opaque proof material. Meaningless in the mock provider. */
  payload: string;
}

/**
 * What the deployed contract's public ledger says, at verification time.
 *
 * Deliberately only aggregates. Nothing here is per-student or per-proof:
 * `issuerRegistered` is about a school, and `proofsVerified` counts every
 * predicate the contract has ever checked. Putting anything narrower on chain
 * would let a verifier link proofs back to a person, which is the one thing
 * this product refuses.
 */
export interface OnChainState {
  /** False when no contract is configured or the indexer cannot be reached. */
  available: boolean;
  /** Whether the chain's issuer registry holds this proof's school. */
  issuerRegistered?: boolean;
  /** Schools registered on the contract. */
  issuerCount?: number;
  /** Predicates the contract has verified since deployment. */
  proofsVerified?: string;
  /** Where a human can check this themselves. */
  explorerUrl?: string;
  /** Why the chain could not be consulted. */
  reason?: string;
}

export interface VerificationResult {
  valid: boolean;
  /** Set when `valid` is false. */
  reason?: string;
  proof?: Proof;
  /**
   * The chain's side of the story. Absent under the mock provider, and
   * `available: false` when nothing is deployed — never a green tick that
   * stands for nothing.
   */
  onChain?: OnChainState;
}
