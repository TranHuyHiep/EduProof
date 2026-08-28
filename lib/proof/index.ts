import { MockProofProvider } from "./mock-provider";
import type { ProofProvider } from "./types";

/**
 * The single place the app resolves a provider.
 * Swapping in Midnight later is a one-line change here.
 */
export const proofProvider: ProofProvider = new MockProofProvider();

export * from "./types";
export * from "./claims";
export { listProofs } from "./store";
