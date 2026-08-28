import type { Proof } from "@/types";

/**
 * Where proofs live.
 *
 * Every method is async even though the Wave 1 implementation is synchronous
 * localStorage. That is deliberate: Wave 2 reads proofs from chain, and a
 * later deployment may put them in Postgres. Both are async, and widening a
 * synchronous API afterwards means touching every call site.
 */
export interface ProofStore {
  readonly name: string;
  save(proof: Proof): Promise<void>;
  read(proofId: string): Promise<Proof | null>;
  /** Newest first. */
  listBySubject(subject: string): Promise<Proof[]>;
  /** Every proof this device knows about. Newest first. */
  list(): Promise<Proof[]>;
  remove(proofId: string): Promise<void>;
}
