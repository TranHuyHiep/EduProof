import type { OnChainState } from "@/types";

/**
 * Which authority vouches for the issuer, and how strongly.
 *
 * Two different authorities once wore the same green "Verified" badge here.
 * `issuer.verified` is a hand-maintained flag in data/schools.json — this app
 * vouching for itself. The contract's issuer registry was the stronger claim,
 * checkable without trusting us. Showing both the same way made the weaker
 * claim look like the stronger one.
 *
 * The stronger claim is gone. The circuit no longer verifies a school's
 * signature, so the contract holds no issuer registry and the chain has no
 * opinion about who issued anything — see contracts/src/eduproof.compact.
 *
 * What is left is the app's own list, and this function's job is now to make
 * sure it is never dressed up as more than that: "Listed by this app" is a
 * neutral badge, deliberately, and there is no path here that returns
 * `proven`. Restoring issuer authenticity means restoring that path.
 */
export function issuerBadge(
  _onChain: OnChainState | undefined,
  listedByApp: boolean,
): { label: string; tone: "proven" | "failed" | "neutral" } | null {
  return listedByApp ? { label: "Listed by this app", tone: "neutral" } : null;
}
