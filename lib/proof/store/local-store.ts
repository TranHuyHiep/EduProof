// Browser-local proof storage.
//
// A proof link only opens on the device that made it. Wave 2 replaces this
// with an on-chain lookup, at which point a link works anywhere — that swap is
// why ProofStore is async.

import type { Proof } from "@/types";
import type { ProofStore } from "./types";

const KEY = "eduproof.proofs.v1";

function readAll(): Record<string, Proof> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, Proof>;
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, Proof>): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* quota exceeded, or private mode — the proof simply will not persist */
  }
}

const newestFirst = (a: Proof, b: Proof) => b.createdAt.localeCompare(a.createdAt);

export class LocalStorageProofStore implements ProofStore {
  readonly name = "local";

  async save(proof: Proof): Promise<void> {
    if (typeof window === "undefined") return;
    const all = readAll();
    all[proof.proofId] = proof;
    writeAll(all);
  }

  async read(proofId: string): Promise<Proof | null> {
    return readAll()[proofId] ?? null;
  }

  async listBySubject(subject: string): Promise<Proof[]> {
    return Object.values(readAll())
      .filter((p) => p.owner === subject)
      .sort(newestFirst);
  }

  async list(): Promise<Proof[]> {
    return Object.values(readAll()).sort(newestFirst);
  }

  async remove(proofId: string): Promise<void> {
    if (typeof window === "undefined") return;
    const all = readAll();
    delete all[proofId];
    writeAll(all);
  }
}
