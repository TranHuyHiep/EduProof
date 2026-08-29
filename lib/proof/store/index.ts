import { LocalStorageProofStore } from "./local-store";
import type { ProofStore } from "./types";

/**
 * The single place the app resolves a store.
 *
 * Wave 2 swaps this line for a chain-backed implementation; nothing else
 * changes, because callers only ever see the ProofStore interface.
 */
export const proofStore: ProofStore = new LocalStorageProofStore();

export type { ProofStore } from "./types";
