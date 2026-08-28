// Mock persistence: localStorage, browser-local, no backend.
// The Midnight build replaces this with a shared store so a proof link
// opens on any device.

import type { Proof } from "@/types";

const KEY = "eduproof.proofs.v1";

function readAll(): Record<string, Proof> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, Proof>;
  } catch {
    return {};
  }
}

export function saveProof(proof: Proof): void {
  if (typeof window === "undefined") return;
  const all = readAll();
  all[proof.proofId] = proof;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* quota or private mode — proof simply won't persist */
  }
}

export function readProof(proofId: string): Proof | null {
  return readAll()[proofId] ?? null;
}

export function listProofs(): Proof[] {
  return Object.values(readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
