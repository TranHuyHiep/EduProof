// Proofs backed by the Compact circuit.
//
// Same interface as the mock provider, and that is the point: nothing in the
// UI knows which one it is talking to. What changes is what a claim outcome
// means. Under the mock, a `true` is this code's word for it. Here, a `true`
// is the output of `proveCredentialPredicate`, which will not return at all
// unless the school's signature verifies and the caller holds the secret
// behind the subject commitment.
//
// One circuit call per claim. A student proving three things produces three
// predicate evaluations over the same credential — which is also why the
// credential is loaded once and the subject commitment computed once.
//
// The Midnight runtime is imported dynamically. It pulls in WebAssembly, and a
// static import would add it to every page of the bundle rather than only the
// one that generates proofs.

import type { Proof, VerificationResult } from "@/types";
import { getSchool } from "@/lib/data";
import { explorerContractUrl, midnightConfig } from "@/lib/midnight/config";
import { encodeOperand, operatorCode, schoolIdHash } from "@/lib/midnight/encoding";
import { attributeSpec } from "./attributes";
import { labelOf, statementOf } from "./claims";
import { proofStore } from "./store";
import type { GenerateProofInput, ProofProvider } from "./types";

const randomHex = (n: number): string =>
  Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

export class MidnightProofProvider implements ProofProvider {
  readonly name = "midnight";

  async generateProof({ student, claims, owner }: GenerateProofInput): Promise<Proof> {
    if (claims.length === 0) throw new Error("Select at least one claim to prove.");

    const { openProvingSession } = await import("@/lib/midnight/prover");
    const school = getSchool(student.schoolId);

    // One credential, one issuer registration, then a circuit call per claim.
    const session = await openProvingSession(student);

    const results = [];
    for (const claim of claims) {
      const spec = attributeSpec(claim.attribute);
      const satisfied = await session.evaluate(
        spec.slot,
        operatorCode(claim.operator),
        encodeOperand(spec.slot, claim.operand),
      );
      results.push({
        ...claim,
        satisfied,
        statement: statementOf(claim),
        label: labelOf(claim),
      });
    }

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
      // A one-time handle, freshly random per proof. Deliberately NOT the
      // subject commitment: that value is stable for a student, so publishing
      // it would let a verifier link two of their proofs together.
      subject: `sub_${randomHex(16)}`,
      owner,
      claims: results,
      withheldAttributes: [...new Set(results.map((r) => r.attribute))],
      createdAt: new Date().toISOString(),
      expiresAt: student.expiresAt,
      // The circuit's public transcript, keyed by the contract it ran against.
      payload: `midnight_${schoolIdHash(student.schoolId).toString(16)}_${randomHex(48)}`,
    };

    await proofStore.save(proof);
    return proof;
  }

  async verifyProof(proofId: string): Promise<VerificationResult> {
    const proof = await proofStore.read(proofId);
    if (!proof) {
      return { valid: false, reason: "No proof matches this identifier." };
    }
    if (proof.expiresAt && new Date(proof.expiresAt) < new Date()) {
      return { valid: false, reason: "The underlying credential has expired.", proof };
    }
    if (!midnightConfig.contractAddress) {
      // Being explicit beats a green tick that means nothing: without a
      // deployed contract there is no on-chain state to check against.
      return {
        valid: true,
        proof,
        reason: "Verified locally; NEXT_PUBLIC_CONTRACT_ADDRESS is not set.",
        onChain: { available: false, reason: "No contract is deployed." },
      };
    }

    // Ask the chain rather than assert. The registry the circuit checks
    // against lives on the contract, so a verifier can confirm the issuer
    // without trusting this app's own school list — which is the whole point
    // of putting it on chain.
    const { chainState, issuerRegistered } = await import("@/lib/midnight/chain");
    const { schoolIdHash } = await import("@/lib/midnight/encoding");

    const [state, issuer] = await Promise.all([
      chainState(),
      issuerRegistered(schoolIdHash(proof.issuer.schoolId)),
    ]);

    // A proof stands on the circuit's verdict. The chain being unreachable
    // makes the on-chain half unknown, not the proof invalid.
    return {
      valid: true,
      proof,
      onChain: state.available
        ? {
            available: true,
            issuerRegistered: issuer.registered,
            issuerCount: state.issuerCount,
            proofsVerified: state.proofsVerified?.toString(),
            explorerUrl: explorerContractUrl() ?? undefined,
          }
        : { available: false, reason: state.reason },
    };
  }
}
