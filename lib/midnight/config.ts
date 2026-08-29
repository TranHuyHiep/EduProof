// Which proof system the app is running, and where Midnight lives.
//
// Read once, here, so no other module has to know an environment variable
// exists. Everything is NEXT_PUBLIC_ because proving happens in the browser —
// see docs/architecture.md §6.

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

/**
 * The network. Preprod, and every endpoint below belongs to it.
 *
 * Midnight runs two public test networks, Preview and Preprod, and they are
 * separate chains — different genesis, different node versions, and a contract
 * deployed to one does not exist on the other. Mixing endpoints between them
 * is the kind of mistake that fails at transaction time with an error about
 * something else entirely.
 *
 * Preprod because it is the one with a public block explorer, and a judge
 * being able to look the contract up for themselves is worth more than any
 * claim this README could make.
 */
export const NETWORK = "preprod" as const;

export const midnightConfig = {
  rpc: process.env.NEXT_PUBLIC_MIDNIGHT_RPC ?? "https://rpc.preprod.midnight.network",

  // api/v4, which is what the support matrix names for Preprod and what
  // testkit's own PreprodTestEnvironment returns. v3 answers, but returns a
  // different shape, and the wallet then fails to sync with a timeout that
  // names nothing.
  indexer:
    process.env.NEXT_PUBLIC_MIDNIGHT_INDEXER ??
    "https://indexer.preprod.midnight.network/api/v4/graphql",

  /** The indexer's subscription endpoint. Same service, WebSocket transport. */
  indexerWs:
    process.env.NEXT_PUBLIC_MIDNIGHT_INDEXER_WS ??
    "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",

  /**
   * The proving service.
   *
   * Verified reachable with permissive CORS on 2026-08-29, so the browser can
   * call it directly and no proxy is needed. That matters for privacy: a proxy
   * of ours would see the witness, which is the one thing the design refuses.
   * The trade-off that remains is stated in the README — the proof server does
   * see the witness, whoever runs it.
   *
   * Submitting a transaction is different: it needs a proof server the wallet
   * trusts, which Midnight requires to be a local one. See docs/deployment.md.
   */
  proofServer:
    process.env.NEXT_PUBLIC_PROOF_SERVER ?? "https://proof-server.preprod.midnight.network",

  contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "",

  /**
   * The public block explorer.
   *
   * The point of deploying at all: anyone can check the contract exists
   * without taking our word for it.
   */
  explorer: "https://preprod.midnightexplorer.com",
} as const;

// The explorer's own URL shapes, read off the live site rather than guessed:
// both paths are plural, and identifiers carry an 0x prefix.

/** Where to look this contract up. Null until one is deployed. */
export function explorerContractUrl(address = midnightConfig.contractAddress): string | null {
  return address ? `${midnightConfig.explorer}/contracts/${withHexPrefix(address)}` : null;
}

/** Where to look a transaction up. */
export function explorerTxUrl(txId: string): string {
  return `${midnightConfig.explorer}/transactions/${withHexPrefix(txId)}`;
}

/**
 * The SDK returns identifiers as bare hex; the explorer links them with an
 * 0x prefix. Normalising here keeps every caller from having to remember.
 */
function withHexPrefix(id: string): string {
  return id.startsWith("0x") ? id : `0x${id}`;
}
