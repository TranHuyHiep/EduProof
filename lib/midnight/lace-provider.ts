// Bridges a connected Lace wallet (dapp-connector-api's WalletConnectedAPI,
// hex-string transactions) to midnight-js-contracts' WalletProvider +
// MidnightProvider (ledger-v8's binary Transaction<S,P,B> class).
//
// Both sides operate on the same `Transaction` class from
// @midnight-ntwrk/ledger-v8 — WalletConnectedAPI just sees it hex-encoded.
// `serialize()`/`deserialize()` is the whole bridge; see docs/51 for the type
// table this was derived from.
//
// getCoinPublicKey/getEncryptionPublicKey are synchronous in WalletProvider,
// so the addresses are fetched once, up front, in `laceWalletProvider`
// itself, rather than lazily inside the returned object.

import type { WalletConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import type { MidnightProvider, WalletProvider } from "@midnight-ntwrk/midnight-js-types";

/**
 * Wraps a connected Lace API as both a WalletProvider (balancing) and a
 * MidnightProvider (submission) — the same pairing scripts/register-issuer.mjs
 * uses one seed-based wallet object for.
 */
export async function laceWalletProvider(
  api: WalletConnectedAPI,
): Promise<WalletProvider & MidnightProvider> {
  const { Transaction } = await import("@midnight-ntwrk/ledger-v8");
  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } = await api.getShieldedAddresses();

  return {
    async balanceTx(tx, _ttl) {
      // `unsealed` = with proofs, no signatures yet — the state an
      // UnboundTransaction (Transaction<SignatureEnabled, Proof, PreBinding>)
      // is in before the wallet balances and signs it. See the method's own
      // doc comment in dapp-connector-api/dist/api.d.ts.
      //
      // deserialize's marker args are the `instance` string literal each
      // marker class exposes ('signature' | 'proof' | 'binding'), not an
      // object — ledger-v8.d.ts types them as `S['instance']`.
      const hex = Buffer.from(tx.serialize()).toString("hex");
      const { tx: balancedHex } = await api.balanceUnsealedTransaction(hex);
      const raw = Buffer.from(balancedHex, "hex");
      // Explicit type arguments: deserialize infers the widest
      // Signaturish/Proofish/Bindingish from string literals alone, which
      // would not match WalletProvider.balanceTx's fixed FinalizedTransaction
      // return type (see the same fix in browser-providers.ts).
      type LedgerV8 = typeof import("@midnight-ntwrk/ledger-v8");
      return Transaction.deserialize<
        InstanceType<LedgerV8["SignatureEnabled"]>,
        InstanceType<LedgerV8["Proof"]>,
        InstanceType<LedgerV8["Binding"]>
      >("signature", "proof", "binding", raw);
    },

    getCoinPublicKey: () => shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedEncryptionPublicKey,

    async submitTx(tx) {
      const hex = Buffer.from(tx.serialize()).toString("hex");
      await api.submitTransaction(hex);
      // submitTransaction() returns void — the id comes from the transaction
      // itself. identifiers() can return more than one; the first is this
      // call's own, matching what proveCredentialPredicate's callTx result
      // will be watched for.
      const [txId] = tx.identifiers();
      if (!txId) throw new Error("Submitted transaction carries no identifier.");
      return txId;
    },
  };
}
