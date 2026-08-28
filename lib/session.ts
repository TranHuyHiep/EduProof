// Wallet-based session, plus the credential the school issued to this device.
//
// Two things live here, and the split matters:
//
//   • wallet address — who the student is, as far as EduProof is concerned
//   • credential     — the signed record, held ONLY on this device
//
// The credential never leaves the browser except as a zero-knowledge proof.
// Nothing here is sent to the EduProof backend.

import type { SignedCredential } from "./school-api";

const WALLET_KEY = "eduproof.session.wallet";
const CREDENTIAL_KEY = "eduproof.session.credential";
const SCHOOL_KEY = "eduproof.session.schoolId";

const read = (k: string) => (typeof window === "undefined" ? null : window.localStorage.getItem(k));
const write = (k: string, v: string) => {
  try { window.localStorage.setItem(k, v); } catch {}
};
const drop = (k: string) => {
  try { window.localStorage.removeItem(k); } catch {}
};

// --- Wallet -------------------------------------------------------------

export const getWalletAddress = () => read(WALLET_KEY);
export const setWalletAddress = (address: string) => write(WALLET_KEY, address);

// --- School selection ---------------------------------------------------

export const getSessionSchoolId = () => read(SCHOOL_KEY);
export const setSessionSchoolId = (id: string) => write(SCHOOL_KEY, id);

// --- Credential (private, device-local) ---------------------------------

export function getCredential(): SignedCredential | null {
  const raw = read(CREDENTIAL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SignedCredential;
  } catch {
    return null;
  }
}

export function setCredential(credential: SignedCredential): void {
  write(CREDENTIAL_KEY, JSON.stringify(credential));
}

export const clearSession = () => {
  drop(WALLET_KEY);
  drop(CREDENTIAL_KEY);
  drop(SCHOOL_KEY);
};
