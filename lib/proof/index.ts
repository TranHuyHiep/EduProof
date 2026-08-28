import { MockProofProvider } from "./mock-provider";
import type { ProofProvider } from "./types";

/**
 * The single place the app resolves a provider.
 *
 * Phase 1 uses the mock provider — no blockchain, no cryptography.
 * Phase 2 swaps this one line for a Midnight-backed implementation.
 */
export const proofProvider: ProofProvider = new MockProofProvider();

export * from "./types";
export * from "./claims";
export { listProofs } from "./store";
