// Wallet connection.
//
// Looks for a Midnight wallet extension (Lace, 1am) via the DApp Connector
// API and falls back to a generated demo keypair when none is installed. The
// fallback exists so the demo never depends on a browser extension being
// present on the machine — the flow it drives is identical either way.
//
// This is NOT the Cardano CIP-30 standard (`window.cardano.*`). Midnight
// wallets inject under `window.midnight[<key>]`, one entry per wallet, and the
// key a wallet chooses is not standardised — identify a wallet by its `name`
// or `rdns`, never by guessing the key. See
// @midnight-ntwrk/dapp-connector-api, and docs/22-lessons.md for why guessing
// a wallet API from a different chain's convention costs hours here.

import type { InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import { NETWORK } from "@/lib/midnight/config";

const DEMO_WALLET_KEY = "eduproof.demo.wallet";

export interface WalletConnection {
  address: string;
  /** True when the address came from a generated demo key, not a real wallet. */
  isDemo: boolean;
  /** The connected wallet's display name. Only set when isDemo is false. */
  walletName?: string;
}

/** Wallets currently injected into `window.midnight`, keyed as the wallet chose. */
export function installedWallets(): Array<{ key: string; api: InitialAPI }> {
  if (typeof window === "undefined") return [];
  const midnight = (window as unknown as { midnight?: Record<string, InitialAPI> }).midnight;
  if (!midnight) return [];
  return Object.entries(midnight).map(([key, api]) => ({ key, api }));
}

/** A stable pseudo-address for this browser, so the demo survives reloads. */
function demoAddress(): string {
  const existing = window.localStorage.getItem(DEMO_WALLET_KEY);
  if (existing) return existing;

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const address = `addr_demo1${hex}`;

  try { window.localStorage.setItem(DEMO_WALLET_KEY, address); } catch {}
  return address;
}

/**
 * Connects to one specific injected wallet by key (as returned by
 * `installedWallets()`), falling back to a demo address on any failure —
 * the user declining the connection, or the extension misbehaving.
 */
export async function connectInjectedWallet(key: string): Promise<WalletConnection> {
  const wallet = installedWallets().find((w) => w.key === key);
  if (!wallet) return { address: demoAddress(), isDemo: true };

  try {
    const connected = await wallet.api.connect(NETWORK);
    const { unshieldedAddress } = await connected.getUnshieldedAddress();
    if (unshieldedAddress) {
      return { address: unshieldedAddress, isDemo: false, walletName: wallet.api.name };
    }
  } catch {
    // User declined, or the extension misbehaved — fall through to demo mode
    // rather than dead-ending the flow.
  }

  return { address: demoAddress(), isDemo: true };
}

/**
 * Connects a wallet. When exactly one is installed, connects it directly.
 * When none are installed, returns a demo address immediately. When more than
 * one is installed, the caller must ask the user which one — see
 * `installedWallets()` — rather than guessing.
 */
export async function connectWallet(): Promise<WalletConnection> {
  const wallets = installedWallets();
  if (wallets.length === 1) return connectInjectedWallet(wallets[0].key);
  if (wallets.length === 0) return { address: demoAddress(), isDemo: true };

  // More than one wallet installed: the login page should have offered a
  // picker instead of calling this. Connecting the first one silently would
  // pick on the user's behalf, so fall back to demo rather than guess.
  return { address: demoAddress(), isDemo: true };
}

/** Shortens an address for display: `addr_demo1a3f…9c2b`. */
export function shortAddress(address: string): string {
  return address.length <= 20 ? address : `${address.slice(0, 12)}…${address.slice(-4)}`;
}
