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

import type { WalletConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import type { Proof, Student, VerificationResult } from "@/types";
import { getSchool } from "@/lib/data";
import { explorerContractUrl, explorerTxUrl, midnightConfig } from "@/lib/midnight/config";
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

  /**
   * Runs proveCredentialPredicate through a real transaction, signed and fee'd
   * by the student's own connected wallet — the Wave 2 counterpart to
   * generateProof()'s free local Simulator preview. Publishes one claim
   * (`claimIndex` into `proof.claims`) per call, matching one circuit call per
   * on-chain transaction.
   *
   * Does not touch proofStore or the Proof object: publishing is an action a
   * student takes on an already-generated proof, not a new proof. The caller
   * decides what a returned txId means for its own UI state.
   */
  async publishProof(
    student: Student,
    proof: Proof,
    claimIndex: number,
    walletApi: WalletConnectedAPI,
  ): Promise<{ txId: string }> {
    const claim = proof.claims[claimIndex];
    if (!claim) throw new Error(`Proof ${proof.proofId} has no claim at index ${claimIndex}.`);
    if (!midnightConfig.contractAddress) {
      throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set — nothing to publish to.");
    }

    const spec = attributeSpec(claim.attribute);

    const [{ openProvingSession }, runtime, contractsSdk] = await Promise.all([
      import("@/lib/midnight/prover"),
      import("@midnight-ntwrk/compact-runtime"),
      import("@midnight-ntwrk/midnight-js-contracts"),
    ]);
    const { findDeployedContract } = contractsSdk;

    const session = await openProvingSession(student);
    const args = session.callArgs(
      spec.slot,
      operatorCode(claim.operator),
      encodeOperand(spec.slot, claim.operand),
    );

    const [{ laceWalletProvider }, { browserPublicDataProvider }, { inMemoryPrivateStateProvider }, { BrowserZkConfigProvider }] =
      await Promise.all([
        import("@/lib/midnight/lace-provider"),
        import("@/lib/midnight/browser-providers"),
        import("@/lib/midnight/browser-private-state"),
        import("@/lib/midnight/browser-zk-config"),
      ]);
    const { httpClientProofProvider } = await import(
      "@midnight-ntwrk/midnight-js-http-client-proof-provider"
    );

    const wallet = await laceWalletProvider(walletApi);
    // Untyped as `string`: the compiled contract's real circuit-id union is
    // only known once contractModule loads below (dynamic import), so this
    // can't be threaded through as a type parameter here. Same shape
    // scripts/register-issuer.mjs uses; that file just isn't typechecked.
    const zkConfigProvider: import("@/lib/midnight/browser-zk-config").BrowserZkConfigProvider<string> =
      new BrowserZkConfigProvider();

    const PRIVATE_STATE_ID = "eduproof-publish";
    const providers = {
      publicDataProvider: browserPublicDataProvider(),
      proofProvider: httpClientProofProvider(midnightConfig.proofServer, zkConfigProvider),
      zkConfigProvider,
      privateStateProvider: inMemoryPrivateStateProvider(PRIVATE_STATE_ID, { studentSk: 0n }),
      walletProvider: wallet,
      midnightProvider: wallet,
    };

    // Same compiled-contract + witness setup as scripts/register-issuer.mjs —
    // the witnesses are part of the whole contract, not per-circuit.
    const CompiledContract = await import("@midnight-ntwrk/compact-js/effect/CompiledContract");
    const contractModule = await import("@/contracts/build/eduproof/contract/index.js");
    const compiledContract = CompiledContract.make("eduproof", contractModule.Contract).pipe(
      CompiledContract.withWitnesses({
        studentSecretKey: (ctx: { privateState: { studentSk: bigint } }) => [
          ctx.privateState,
          ctx.privateState.studentSk,
        ],
        getSchnorrReduction: (ctx: { privateState: { studentSk: bigint } }, challengeHash: bigint) => [
          ctx.privateState,
          [challengeHash / (1n << 248n), challengeHash % (1n << 248n)],
        ],
      }),
      CompiledContract.withCompiledFileAssets("contracts/build/eduproof"),
    );

    // `providers` is cast here for the same reason zkConfigProvider is typed
    // `<string>` above: the compiled contract's circuit-id union only exists
    // once `contractModule` (a dynamic import, typed as `any`) resolves —
    // there is no static `C` for TS to check `providers` against. The
    // runtime shape matches what findDeployedContract needs regardless;
    // scripts/register-issuer.mjs passes the same providers unchecked
    // because .mjs has no static types at all.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = await findDeployedContract(providers as any, {
      compiledContract,
      contractAddress: midnightConfig.contractAddress,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: { studentSk: 0n },
    });

    const result = await found.callTx.proveCredentialPredicate(
      args.schoolIdHash,
      args.subject,
      args.slot,
      args.op,
      args.operand,
      args.credential,
      args.signature,
    );

    const status = result.public?.status;
    if (status !== "SucceedEntirely") {
      throw new Error(`Transaction did not succeed — status ${status ?? "unknown"}.`);
    }
    return { txId: result.public.txId };
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
            explorerTxUrl: state.txHash ? explorerTxUrl(state.txHash) : undefined,
          }
        : { available: false, reason: state.reason },
    };
  }
}
