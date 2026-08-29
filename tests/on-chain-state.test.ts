// What the on-chain half of a verification may say.
//
// `VerificationResult.onChain` is new surface, and it is the kind that leaks:
// it is assembled from chain reads and handed straight to a verifier's screen.
// The rule from tests/privacy.test.ts applies here too — a verifier learns
// propositions, never values, and never anything that links two proofs to one
// student.
//
// These tests are about shape and aggregation, not about the network. The
// chain module is stubbed, because what matters is which fields survive into
// the result, not whether an indexer answered.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { installMemoryLocalStorage } from "./helpers/local-storage";

const SCHOOL_ID = "vnu-hcm";

vi.mock("@/lib/midnight/chain", () => ({
  chainState: vi.fn(),
  issuerRegistered: vi.fn(),
}));

async function verifyWith(
  chain: {
    state: Record<string, unknown>;
    issuer: Record<string, unknown>;
  },
  // Overridable so a caller can verify two *different* proofs. Left fixed, the
  // linkability test below silently passed a link carrying the proof id.
  proofId = "pf_test123456",
) {
  const chainModule = await import("@/lib/midnight/chain");
  vi.mocked(chainModule.chainState).mockResolvedValue(chain.state as never);
  vi.mocked(chainModule.issuerRegistered).mockResolvedValue(chain.issuer as never);

  const { proofStore } = await import("@/lib/proof/store");
  const { MidnightProofProvider } = await import("@/lib/proof/midnight-provider");

  const proof = {
    proofId,
    version: "1",
    provider: "midnight",
    issuer: { schoolId: SCHOOL_ID, schoolName: "X", keyId: "k1", verified: true },
    subject: "sub_abcdef0123456789",
    owner: "addr_test",
    claims: [
      {
        attribute: "gpa",
        operator: "gte",
        operand: 3.5,
        satisfied: true,
        statement: "GPA is at least 3.50",
        label: "GPA ≥ 3.50",
      },
    ],
    withheldAttributes: ["gpa"],
    createdAt: new Date().toISOString(),
    payload: "midnight_abc_def",
  };

  await proofStore.save(proof as never);
  return new MidnightProofProvider().verifyProof(proof.proofId);
}

describe("the on-chain half of a verification", () => {
  beforeEach(() => {
    // The store is the browser's; the provider reads a saved proof back out.
    installMemoryLocalStorage();
    vi.stubEnv("NEXT_PUBLIC_CONTRACT_ADDRESS", "ab".repeat(32));
    vi.resetModules();
  });

  it("reports what the ledger says when the chain answers", async () => {
    const result = await verifyWith({
      state: { available: true, issuerCount: 3, proofsVerified: 42n },
      issuer: { available: true, registered: true },
    });

    expect(result.valid).toBe(true);
    expect(result.onChain?.available).toBe(true);
    expect(result.onChain?.issuerRegistered).toBe(true);
    expect(result.onChain?.proofsVerified).toBe("42");
    expect(result.onChain?.issuerCount).toBe(3);
  });

  it("carries no student values, in any field", async () => {
    const result = await verifyWith({
      state: { available: true, issuerCount: 3, proofsVerified: 42n },
      issuer: { available: true, registered: true },
    });

    // Everything the on-chain block says, flattened. A GPA, a name, or a
    // student number appearing anywhere in here would be a leak — including
    // inside a URL, which is the easy place to miss one.
    const serialised = JSON.stringify(result.onChain);

    for (const forbidden of ["3.72", "372", "Bảo", "SV001", "SV002", "2.91", "291"]) {
      expect(serialised).not.toContain(forbidden);
    }
  });

  it("stays valid, and says why, when the chain cannot be reached", async () => {
    const result = await verifyWith({
      state: { available: false, reason: "indexer unreachable" },
      issuer: { available: false, reason: "indexer unreachable" },
    });

    // The circuit's verdict does not depend on an indexer being up.
    expect(result.valid).toBe(true);
    expect(result.onChain?.available).toBe(false);
    expect(result.onChain?.reason).toBe("indexer unreachable");
    // No tick that stands for nothing.
    expect(result.onChain?.issuerRegistered).toBeUndefined();
  });

  it("exposes only aggregate counters, never a per-proof record", async () => {
    const result = await verifyWith({
      state: { available: true, issuerCount: 3, proofsVerified: 42n },
      issuer: { available: true, registered: true },
    });

    // If a future change adds a per-proof lookup — an index, a nullifier, a
    // record id — two proofs by one student become linkable. Pin the shape.
    //
    // Every field here is a property of the contract or of this device's own
    // copy of the proof. `explorerTxUrl` was the closest call: a transaction
    // hash sounds per-proof, and would be if proving ever submitted one. It is
    // the contract's latest transaction, read with no proof-derived argument,
    // so all verifiers see the same value. Adding a field is a decision to
    // make here deliberately, not a test to update until it passes.
    expect(Object.keys(result.onChain ?? {}).sort()).toEqual(
      [
        "available",
        "explorerTxUrl",
        "explorerUrl",
        "issuerCount",
        "issuerRegistered",
        "proofsVerified",
      ].sort(),
    );
  });

  it("gives every proof the same transaction link, so one cannot single out a student", async () => {
    // Two verifications against one chain. If these ever diverged, the link
    // would identify which proof was being viewed. Run in sequence: the two
    // share a mocked module, so overlapping them would test the mock instead.
    const chain = {
      state: { available: true, issuerCount: 3, proofsVerified: 42n, txHash: "a".repeat(64) },
      issuer: { available: true, registered: true },
    };
    const first = await verifyWith(chain, "pf_aaaaaaaaaaaa");
    const second = await verifyWith(chain, "pf_bbbbbbbbbbbb");

    expect(first.onChain?.explorerTxUrl).toBe(second.onChain?.explorerTxUrl);
    expect(first.onChain?.explorerTxUrl).toContain("a".repeat(64));
  });

  it("omits the transaction link rather than inventing one when the indexer gives no hash", async () => {
    const result = await verifyWith({
      state: { available: true, issuerCount: 3, proofsVerified: 42n },
      issuer: { available: true, registered: true },
    });

    expect(result.onChain?.explorerTxUrl).toBeUndefined();
  });
});
