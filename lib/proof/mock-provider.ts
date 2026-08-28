import type { Proof, VerificationResult } from "@/types";
import { getSchool } from "@/lib/data";
import { evaluateClaim } from "./claims";
import { readProof, saveProof } from "./store";
import type { GenerateProofInput, ProofProvider } from "./types";

const randomHex = (n: number): string =>
  Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Stand-in for a real proving system.
 *
 * WHAT IS REAL: the claim outcomes, and the guarantee that no private
 * attribute value is written into the Proof object.
 *
 * WHAT IS FAKE: `payload` is random hex, and verification only looks the
 * proof up by id. There is no cryptography and nothing is unforgeable.
 */
export class MockProofProvider implements ProofProvider {
  readonly name = "mock";

  async generateProof({ student, claims }: GenerateProofInput): Promise<Proof> {
    if (claims.length === 0) throw new Error("Select at least one claim to prove.");

    await delay(1400); // stands in for circuit execution

    const school = getSchool(student.schoolId);
    const results = claims.map((c) => evaluateClaim(student, c));

    const proof: Proof = {
      proofId: `pf_${randomHex(12)}`,
      version: "1",
      provider: this.name,
      issuer: {
        schoolId: student.schoolId,
        schoolName: school?.name ?? "Unknown institution",
        keyId: school?.issuerKeyId ?? "unknown",
        verified: school?.verified ?? false,
      },
      // Opaque handle, deliberately NOT the student id.
      subject: `sub_${randomHex(16)}`,
      claims: results,
      // Every attribute the predicates read stays hidden.
      withheldAttributes: [...new Set(results.map((r) => r.attribute))],
      createdAt: new Date().toISOString(),
      expiresAt: student.expiresAt,
      payload: `mock_${randomHex(64)}`,
    };

    saveProof(proof);
    return proof;
  }

  async verifyProof(proofId: string): Promise<VerificationResult> {
    await delay(900); // stands in for verifier-key check

    const proof = readProof(proofId);
    if (!proof) {
      return { valid: false, reason: "No proof matches this identifier." };
    }
    if (proof.expiresAt && new Date(proof.expiresAt) < new Date()) {
      return { valid: false, reason: "The underlying credential has expired.", proof };
    }
    return { valid: true, proof };
  }
}
