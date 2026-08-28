import type { ClaimRequest, Proof, Student, VerificationResult } from "@/types";

export interface GenerateProofInput {
  student: Student;
  claims: ClaimRequest[];
}

/**
 * The seam between the app and whatever produces proofs.
 *
 * Today: MockProofProvider (no cryptography).
 * Later: MidnightProofProvider, backed by a Compact circuit — the student
 * record becomes a private witness and only claim outcomes become public.
 *
 * Implementations MUST NOT return private attribute values in `Proof`.
 */
export interface ProofProvider {
  readonly name: string;
  generateProof(input: GenerateProofInput): Promise<Proof>;
  verifyProof(proofId: string): Promise<VerificationResult>;
}
