// Wallet connection.
//
// Tries a CIP-30 browser wallet (Lace, Nami, Eternl) and falls back to a
// generated demo keypair when none is installed. The fallback exists so the
// demo never depends on a browser extension being present on the machine —
// the flow it drives is identical either way.

const DEMO_WALLET_KEY = "eduproof.demo.wallet";

export interface WalletConnection {
  address: string;
  /** True when the address came from a generated demo key, not a real wallet. */
  isDemo: boolean;
}

interface Cip30Api {
  getRewardAddresses?: () => Promise<string[]>;
  getUsedAddresses?: () => Promise<string[]>;
}

interface Cip30Wallet {
  enable: () => Promise<Cip30Api>;
}

/** Wallet extensions that inject themselves onto `window.cardano`. */
const CANDIDATES = ["lace", "nami", "eternl", "flint"] as const;

function findInjectedWallet(): { name: string; api: Cip30Wallet } | null {
  if (typeof window === "undefined") return null;
  const cardano = (window as unknown as { cardano?: Record<string, Cip30Wallet> }).cardano;
  if (!cardano) return null;

  for (const name of CANDIDATES) {
    if (cardano[name]) return { name, api: cardano[name] };
  }
  return null;
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

export async function connectWallet(): Promise<WalletConnection> {
  const injected = findInjectedWallet();

  if (injected) {
    try {
      const api = await injected.api.enable();
      const addresses =
        (await api.getRewardAddresses?.()) ?? (await api.getUsedAddresses?.()) ?? [];
      if (addresses[0]) return { address: addresses[0], isDemo: false };
    } catch {
      // User declined, or the extension misbehaved — fall through to demo mode
      // rather than dead-ending the flow.
    }
  }

  return { address: demoAddress(), isDemo: true };
}

/** Shortens an address for display: `addr_demo1a3f…9c2b`. */
export function shortAddress(address: string): string {
  return address.length <= 20 ? address : `${address.slice(0, 12)}…${address.slice(-4)}`;
}
