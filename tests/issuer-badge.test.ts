import { describe, expect, it } from "vitest";
import { issuerBadge } from "@/lib/issuer-badge";

/**
 * Which authority the issuer badge speaks for.
 *
 * It used to arbitrate between two: the app's hand-written `verified: true`
 * in data/schools.json, and the contract's on-chain issuer registry. The
 * registry is gone — the circuit no longer verifies a school's signature, so
 * the chain has no opinion about who issued anything.
 *
 * That makes this function's job narrower and more important: there is now
 * only the app's own claim, and it must never be dressed up as more. These
 * tests exist to stop a green "proven" badge coming back without the
 * signature check that would justify it.
 */
describe("issuer badge authority", () => {
  it("never claims the chain vouches for an issuer, because it cannot", () => {
    // Even with the chain reachable and reporting a healthy contract, there
    // is no issuer registry to consult. A "Registered on chain" badge here
    // would be describing a check that does not happen.
    const badge = issuerBadge({ available: true, proofsVerified: "42" }, true);
    expect(badge).toEqual({ label: "Listed by this app", tone: "neutral" });
  });

  it("never returns a proven tone, whatever the chain says", () => {
    // The strongest statement in the codebase about what was lost. If issuer
    // authenticity is restored, this test should fail and be rewritten —
    // that is the point of it.
    for (const onChain of [
      { available: true, proofsVerified: "42" },
      { available: false, reason: "unreachable" },
      undefined,
    ]) {
      expect(issuerBadge(onChain, true)?.tone).not.toBe("proven");
    }
  });

  it("labels the app's own list as the app's own claim", () => {
    expect(issuerBadge({ available: false }, true)).toEqual({
      label: "Listed by this app",
      tone: "neutral",
    });
  });

  it("shows nothing when the app does not vouch either", () => {
    expect(issuerBadge({ available: false }, false)).toBeNull();
  });

  it("treats the mock provider, which has no chain at all, as the app's own claim", () => {
    expect(issuerBadge(undefined, true)).toEqual({
      label: "Listed by this app",
      tone: "neutral",
    });
  });
});
