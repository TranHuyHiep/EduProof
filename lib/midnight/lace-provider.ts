// Bridges a connected Lace wallet (dapp-connector-api's ConnectedAPI,
// hex-string transactions) to midnight-js-contracts' WalletProvider +
// MidnightProvider (ledger-v8's binary Transaction<S,P,B> class).
//
// Both sides operate on the same `Transaction` class from
// @midnight-ntwrk/ledger-v8 — the connector API just sees it hex-encoded, so
// serialize()/deserialize() is most of the bridge. The part that is NOT just
// encoding is the marker transition: `balanceUnsealedTransaction` takes a
// Transaction<SignatureEnabled, Proof, PreBinding> and `submitTransaction`
// requires Transaction<SignatureEnabled, Proof, Binding>, and the API does not
// document which of the two comes back from balancing. The interface this
// implements (midnight-js-types' WalletProvider) promises a
// FinalizedTransaction, and midnight-js-contracts' submitTxCore hands that
// result straight to submitTx untouched — so if the PreBinding -> Binding
// transition does not happen here, it happens nowhere. `readTxHeader` settles
// it per call from the bytes themselves rather than betting on one answer.
//
// getCoinPublicKey/getEncryptionPublicKey are synchronous in WalletProvider,
// so the addresses are fetched once, up front, in `laceWalletProvider` itself
// rather than lazily inside the returned object.

import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import type { MidnightProvider, WalletProvider } from "@midnight-ntwrk/midnight-js-types";
import { NETWORK } from "./config";
import { readTxHeader, SIGNED_MARKER } from "./tx-markers";

type LedgerV8 = typeof import("@midnight-ntwrk/ledger-v8");
type Signed = InstanceType<LedgerV8["SignatureEnabled"]>;
type Proven = InstanceType<LedgerV8["Proof"]>;
type Bound = InstanceType<LedgerV8["Binding"]>;
type PreBound = InstanceType<LedgerV8["PreBinding"]>;

// Not Buffer: this runs in the browser bundle, where Buffer exists only
// through a Next.js polyfill this file has no business depending on — the
// same class of assumption that broke the indexer client (see
// browser-providers.ts).
const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex: string): Uint8Array => {
  const body = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (body.length % 2 !== 0) {
    throw new Error("The wallet returned a malformed hex transaction (odd length).");
  }
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

/**
 * Confirms the wallet is on the same chain the contract lives on.
 *
 * Preview and Preprod are separate chains with separate genesis, and a
 * contract deployed to one does not exist on the other — see the note in
 * lib/midnight/config.ts, which records that mixing them "fails at transaction
 * time with an error about something else entirely". One extra round trip per
 * publish is a cheap price for turning that into a sentence a student can act
 * on.
 *
 * Only `networkId` is checked. The connector also reports its preferred
 * indexer, but a different URI within the same network is a preference, not a
 * correctness problem, and this app's public data provider is wired to its own.
 *
 * Skipped when the wallet does not implement getConfiguration: a wallet that
 * cannot be asked is not a wallet that is wrong.
 */
async function assertNetwork(api: ConnectedAPI): Promise<void> {
  if (typeof api.getConfiguration !== "function") return;

  const config = await api.getConfiguration();
  if (config.networkId !== NETWORK) {
    throw new Error(
      `Your wallet is connected to "${config.networkId}", but this app publishes to ` +
        `"${NETWORK}". Switch networks in the wallet and reconnect.`,
    );
  }
}

/**
 * Wraps a connected wallet as both a WalletProvider (balancing) and a
 * MidnightProvider (submission) — the same pairing scripts/register-issuer.mjs
 * gets from one seed-based wallet object.
 */
export async function laceWalletProvider(
  api: ConnectedAPI,
): Promise<WalletProvider & MidnightProvider> {
  const { Transaction } = await import("@midnight-ntwrk/ledger-v8");
  await assertNetwork(api);
  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } = await api.getShieldedAddresses();

  return {
    async balanceTx(tx, _ttl) {
      // "Unsealed" = proven, unsigned, still carrying binding preimages. The
      // wallet pays fees and adds whatever inputs and outputs the transaction
      // needs to balance; payFees is its default but is stated rather than
      // assumed.
      const hex = toHex(tx.serialize());

      let balancedHex: string;
      try {
        ({ tx: balancedHex } = await api.balanceUnsealedTransaction(hex, { payFees: true }));
      } catch (error) {
        // Named apart from every later step because a rejection here is the
        // wallet refusing, not the chain refusing — and it is where a wallet
        // that never prompted the user gives itself away. The original
        // message is kept intact so a nested `Custom error: NNN` still reaches
        // publishErrorMessage.
        throw new Error(
          `The wallet would not balance the transaction: ` +
            `${error instanceof Error ? error.message : String(error)}`,
        );
      }

      const raw = fromHex(balancedHex);
      const header = readTxHeader(raw);
      if (!header) {
        throw new Error(
          `The wallet returned something that is not a Midnight transaction ` +
            `(${raw.byteLength} bytes). Balancing did not produce a transaction to submit.`,
        );
      }
      if (header.signature !== SIGNED_MARKER) {
        // The one shape that would otherwise pass as a hex string through
        // submitTransaction and die on chain instead of in the browser.
        throw new Error(
          `The wallet returned an unsigned transaction (${header.tag}). ` +
            "It balanced the transaction but did not sign it.",
        );
      }
      if (header.binding === null) {
        throw new Error(
          `The wallet returned a transaction this app cannot finalize (${header.tag}).`,
        );
      }

      // Deserialize under the marker the bytes themselves declare. Asking for
      // the wrong one is not a soft failure — ledger-v8 throws "expected
      // header tag '<x>', got '<y>'" and never mis-decodes — which is why
      // guessing was never safe, and why nothing here needs a fallback that
      // could swallow a real error.
      if (header.binding === "binding") {
        return Transaction.deserialize<Signed, Proven, Bound>("signature", "proof", "binding", raw);
      }

      // PreBinding: the transition submitTransaction requires and that nothing
      // downstream performs. This is the browser counterpart of the explicit
      // finalizeRecipe() step the working Node path runs after signing.
      const preBound = Transaction.deserialize<Signed, Proven, PreBound>(
        "signature",
        "proof",
        "pre-binding",
        raw,
      );
      return preBound.bind();
    },

    getCoinPublicKey: () => shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedEncryptionPublicKey,

    async submitTx(tx) {
      const raw = tx.serialize();
      // Read the tag off the bytes actually going out. This is the last point
      // at which "the wallet will drop this" is still detectable in the
      // browser: submitTransaction returns void, so a wallet that declines to
      // relay is otherwise indistinguishable from one that relayed.
      const header = readTxHeader(raw);
      if (header?.binding !== "binding") {
        throw new Error(
          `Refusing to submit: the transaction is not cryptographically bound ` +
            `(${header?.tag ?? "no transaction header"}).`,
        );
      }

      try {
        await api.submitTransaction(toHex(raw));
      } catch (error) {
        throw new Error(
          `The wallet would not submit the transaction: ` +
            `${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // submitTransaction() returns void — the id comes from the transaction
      // itself. identifiers() is a SET, not a list keyed by contract action:
      // ledger-v8 documents any member as usable to watch for this
      // transaction, and the live indexer bears that out (both of this
      // contract's settled transactions carry two identifiers and one action).
      // So index 0 is as good as any — every member resolves to the same
      // transaction.
      //
      // What matters is that it comes from the transaction the wallet just
      // took. A stale id here once produced a publish that "succeeded" against
      // a transaction from weeks earlier, which is why watchForTxData
      // additionally refuses anything that settled before the wait began.
      const [txId] = tx.identifiers();
      if (!txId) throw new Error("Submitted transaction carries no identifier.");
      return txId;
    },
  };
}
