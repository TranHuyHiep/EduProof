import { describe, expect, it } from "vitest";
import { issuerBadge } from "@/lib/issuer-badge";

/**
 * Which authority the issuer badge speaks for.
 *
 * The failing case is the point: data/schools.json carries a hand-written
 * `verified: true`, and the chain is the only party that can contradict it.
 * If a chain "not registered" ever fell through to the app's own green tick,
 * the page would vouch for an issuer the contract does not know.
 */
describe("issuer badge authority", () => {
  it("prefers the chain when the chain has an answer", () => {
    expect(issuerBadge({ available: true, issuerRegistered: true }, true)).toEqual({
      label: "Registered on chain",
      tone: "proven",
    });
  });

  it("never shows a green badge when the chain says the issuer is absent", () => {
    const badge = issuerBadge({ available: true, issuerRegistered: false }, true);
    expect(badge?.tone).toBe("failed");
    expect(badge?.label).toBe("Not on the chain registry");
  });

  it("falls back to the app's own list, labelled as the app's own claim", () => {
    expect(issuerBadge({ available: false }, true)).toEqual({
      label: "Listed by this app",
      tone: "neutral",
    });
  });

  it("shows nothing when neither the chain nor the app vouches", () => {
    expect(issuerBadge({ available: false }, false)).toBeNull();
  });

  it("treats the mock provider, which has no chain at all, as the app's own claim", () => {
    expect(issuerBadge(undefined, true)).toEqual({
      label: "Listed by this app",
      tone: "neutral",
    });
  });
});
