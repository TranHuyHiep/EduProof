import type { ClaimRequest, Proof, Student, VerificationResult } from "@/types";

export interface GenerateProofInput {
  student: Student;
  claims: ClaimRequest[];
  /**
   * The wallet asking for the proof.
   *
   * Recorded so a student can list their own proofs. It is device-local and
   * never shown to a verifier — see `Proof.owner`.
   */
  owner: string;
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
