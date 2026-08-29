// Which proof system the app is running, and where Midnight lives.
//
// Read once, here, so no other module has to know an environment variable
// exists. Everything is NEXT_PUBLIC_ because proving happens in the browser —
// see PLAN-MUST-READ-FIRST/03-architecture.md §6.

export type ProviderName = "mock" | "midnight";

/**
 * Defaults to mock.
 *
 * A judge who clones the repo and runs `npm run dev` gets a working demo with
 * no toolchain, no wallet and no network. Turning on the real prover is an
 * explicit choice.
 */
export function providerName(): ProviderName {
  return process.env.NEXT_PUBLIC_PROOF_PROVIDER === "midnight" ? "midnight" : "mock";
}

export const midnightConfig = {
  rpc: process.env.NEXT_PUBLIC_MIDNIGHT_RPC ?? "https://rpc.preview.midnight.network",
  indexer:
    process.env.NEXT_PUBLIC_MIDNIGHT_INDEXER ??
    "https://indexer.preview.midnight.network/api/v3/graphql",
  /**
   * The proving service.
   *
   * Verified reachable with permissive CORS on 2026-08-29, so the browser can
   * call it directly and no proxy is needed. That matters for privacy: a proxy
   * of ours would see the witness, which is the one thing the design refuses.
   * The trade-off that remains is stated in the README — the proof server does
   * see the witness, whoever runs it.
   */
  proofServer:
    process.env.NEXT_PUBLIC_PROOF_SERVER ?? "https://proof-server.preprod.midnight.network",
  contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "",
} as const;
