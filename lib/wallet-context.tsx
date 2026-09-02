"use client";
// Keeps one connected wallet alive for the lifetime of the browser session.
//
// lib/session.ts persists only the address string, which survives reloads
// but cannot sign anything. The live WalletConnectedAPI — needed to actually
// sign and submit a transaction (see publishProof() in
// lib/proof/midnight-provider.ts) — has to live somewhere that outlives the
// page that first connected it, so a student who connects on /student/login
// does not have to reconnect again on the proof page. A context, not
// module-level state: module state survives Next.js fast-refresh in dev in
// confusing ways and is invisible to React's render cycle.
//
// Lost on reload, same as most wallet dApps — re-connecting after a reload is
// expected of the pattern, not a bug in this implementation.

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { WalletConnection } from "./wallet";
import { setWalletAddress } from "./session";

interface WalletContextValue {
  wallet: WalletConnection | null;
  setWallet: (connection: WalletConnection) => void;
  clearWallet: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletContextProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWalletState] = useState<WalletConnection | null>(null);

  const setWallet = useCallback((connection: WalletConnection) => {
    setWalletState(connection);
    setWalletAddress(connection.address);
  }, []);

  const clearWallet = useCallback(() => setWalletState(null), []);

  const value = useMemo(() => ({ wallet, setWallet, clearWallet }), [wallet, setWallet, clearWallet]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

/**
 * The live wallet connection, if one was made this session.
 *
 * `wallet.api` is present only for a real connection — see WalletConnection
 * in lib/wallet.ts. A student who reloaded the page, or who never connected
 * a real wallet, gets `wallet === null` here even if lib/session.ts still
 * remembers an address from before.
 */
export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet() called outside WalletContextProvider.");
  return ctx;
}
