import type { OnChainState } from "@/types";

/**
 * Which authority vouches for the issuer, and how strongly.
 *
 * Two different authorities once wore the same green "Verified" badge here.
 * `issuer.verified` is a hand-maintained flag in data/schools.json — this app
 * vouching for itself. `onChain.issuerRegistered` is the contract's registry,
 * which a verifier can check without trusting us. Showing both the same way
 * made the weaker claim look like the stronger one.
 *
 * When the chain has an answer it is the only badge shown. A chain that says
 * "not registered" must never fall through to the app's own green tick, which
 * is why this is exported and tested rather than inlined in the markup.
 */
export function issuerBadge(
  onChain: OnChainState | undefined,
  listedByApp: boolean,
): { label: string; tone: "proven" | "failed" | "neutral" } | null {
  if (onChain?.available) {
    return onChain.issuerRegistered
      ? { label: "Registered on chain", tone: "proven" }
      : { label: "Not on the chain registry", tone: "failed" };
  }
  return listedByApp ? { label: "Listed by this app", tone: "neutral" } : null;
}
