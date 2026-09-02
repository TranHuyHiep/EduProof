// Wallet connection.
//
// Looks for a Midnight wallet extension (Lace, 1am) via the DApp Connector
// API. Connecting to a real extension and falling back to a demo keypair are
// two DELIBERATE, SEPARATE actions — never one silently substituted for the
// other. An earlier version of this file treated any connection failure
// (extension missing, user declined, extension misbehaving) as "fall back to
// demo", which meant a student — or anyone testing a real transaction — could
// not tell whether they were holding a real wallet or a fake one. Signing a
// real transaction needs the real WalletConnectedAPI kept alive afterwards,
// which a silently-substituted demo key can never provide.
//
// This is NOT the Cardano CIP-30 standard (`window.cardano.*`). Midnight
// wallets inject under `window.midnight[<key>]`, one entry per wallet, and the
// key a wallet chooses is not standardised — identify a wallet by its `name`
// or `rdns`, never by guessing the key. See
// @midnight-ntwrk/dapp-connector-api, and docs/22-lessons.md for why guessing
// a wallet API from a different chain's convention costs hours here.

import type { InitialAPI, WalletConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { NETWORK } from "@/lib/midnight/config";

const DEMO_WALLET_KEY = "eduproof.demo.wallet";

export interface WalletConnection {
  address: string;
  /** True when the address came from a generated demo key, not a real wallet. */
  isDemo: boolean;
  /** The connected wallet's display name. Only set when isDemo is false. */
  walletName?: string;
  /**
   * The live connected API, present only for a real wallet. This is what a
   * caller needs to sign and submit an actual transaction (see
   * lib/wallet-context.tsx) — a demo connection has nothing behind it to sign
   * with.
   */
  api?: WalletConnectedAPI;
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

/** A demo identity, chosen explicitly — never substituted for a failed real connection. */
export function connectDemoWallet(): WalletConnection {
  return { address: demoAddress(), isDemo: true };
}

/**
 * Connects to one specific injected wallet by key (as returned by
 * `installedWallets()`).
 *
 * @throws if the wallet is not found, the user declines the connection, or
 *   the extension does not return an address. Callers must show this to the
 *   student rather than quietly treating it as "use the demo instead" — see
 *   the file header.
 */
export async function connectInjectedWallet(key: string): Promise<WalletConnection> {
  const wallet = installedWallets().find((w) => w.key === key);
  if (!wallet) throw new Error("That wallet is no longer available. Refresh and try again.");

  const connected = await wallet.api.connect(NETWORK);
  const { unshieldedAddress } = await connected.getUnshieldedAddress();
  if (!unshieldedAddress) {
    throw new Error(`${wallet.api.name} did not return an address.`);
  }
  return { address: unshieldedAddress, isDemo: false, walletName: wallet.api.name, api: connected };
}

/**
 * Connects the one installed wallet directly.
 *
 * @throws if no wallet is installed, or more than one is (the caller must
 *   offer a picker via `installedWallets()` instead of guessing which one),
 *   or the connection itself fails — see `connectInjectedWallet`.
 */
export async function connectWallet(): Promise<WalletConnection> {
  const wallets = installedWallets();
  if (wallets.length === 0) {
    throw new Error("No Midnight wallet extension found. Install Lace, or use the demo wallet.");
  }
  if (wallets.length > 1) {
    throw new Error("More than one wallet is installed — pick one instead of connecting blindly.");
  }
  return connectInjectedWallet(wallets[0].key);
}

/** Shortens an address for display: `addr_demo1a3f…9c2b`. */
export function shortAddress(address: string): string {
  return address.length <= 20 ? address : `${address.slice(0, 12)}…${address.slice(-4)}`;
}
