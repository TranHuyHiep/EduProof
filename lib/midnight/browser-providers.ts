// A `PublicDataProvider` that runs in the browser.
//
// `@midnight-ntwrk/midnight-js-indexer-public-data-provider`'s own
// implementation pulls in a WebSocket client that does not survive the
// Next.js client bundle ('WebSocket' is not exported from 'isomorphic-ws') —
// see the same discovery already recorded in lib/midnight/chain.ts, which
// works around it for read-only verify-page queries by calling the indexer's
// GraphQL endpoint directly. This does the same, but implements only the
// slice of `PublicDataProvider` that `findDeployedContract`'s `callTx` path
// actually calls (traced in node_modules/@midnight-ntwrk/midnight-js-contracts —
// `getPublicStates` → `queryZSwapAndContractState`, `submitCallTx` →
// `watchForTxData`), not the full interface (deploy-only and
// subscription-only methods are intentionally NOT implemented — calling them
// throws, since publishProof() never reaches them).
//
// No caching, no dedupe: each proof publish is one contract call, not a hot
// path.

import type { FinalizedTxData, PublicDataProvider } from "@midnight-ntwrk/midnight-js-types";
import type { ContractAddress, TransactionId } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { midnightConfig } from "./config";

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(midnightConfig.indexer, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Indexer answered ${response.status}.`);
  const body = await response.json();
  if (body?.errors?.length) {
    throw new Error(`Indexer rejected the query: ${body.errors[0]?.message ?? "unknown"}`);
  }
  return body.data as T;
}

const hexToBytes = (hex: string): Uint8Array =>
  new Uint8Array(Buffer.from(hex.startsWith("0x") ? hex.slice(2) : hex, "hex"));

const CONTRACT_ACTION_QUERY = `
  query ContractAction($address: HexEncoded!) {
    contractAction(address: $address) {
      state
      zswapState
      transaction { block { ledgerParameters } }
    }
  }
`;

const TX_STATUS_QUERY = `
  query TxStatus($id: HexEncoded!) {
    transactions(offset: { identifier: $id }) {
      hash
      ... on RegularTransaction {
        raw
        identifiers
        protocolVersion
        fee
        transactionResult { status }
        block { hash height timestamp author }
      }
    }
  }
`;

/** Maps the indexer's enum to the ledger's status strings — see docs/51 §2. */
function toTxStatus(status: string): FinalizedTxData["status"] {
  if (status === "SUCCESS") return "SucceedEntirely";
  if (status === "PARTIAL_SUCCESS") return "FailFallible";
  return "FailEntirely";
}

const unsupported = (method: string) => () => {
  throw new Error(
    `browserPublicDataProvider does not implement ${method} — publishProof() never calls it. ` +
      "If a new caller needs it, this provider needs extending; do not stub it silently.",
  );
};

export function browserPublicDataProvider(): PublicDataProvider {
  return {
    async queryContractState(contractAddress) {
      const { ContractState } = await import("@midnight-ntwrk/ledger-v8");
      const data = await graphql<{ contractAction: { state: string } | null }>(
        CONTRACT_ACTION_QUERY,
        { address: contractAddress },
      );
      if (!data.contractAction) return null;
      return ContractState.deserialize(hexToBytes(data.contractAction.state));
    },

    async queryZSwapAndContractState(contractAddress: ContractAddress) {
      const { ContractState, ZswapChainState, LedgerParameters } = await import(
        "@midnight-ntwrk/ledger-v8"
      );
      const data = await graphql<{
        contractAction: {
          state: string;
          zswapState: string;
          transaction: { block: { ledgerParameters: string } };
        } | null;
      }>(CONTRACT_ACTION_QUERY, { address: contractAddress });
      if (!data.contractAction) return null;

      const { state, zswapState, transaction } = data.contractAction;
      return [
        ZswapChainState.deserialize(hexToBytes(zswapState)),
        ContractState.deserialize(hexToBytes(state)),
        LedgerParameters.deserialize(hexToBytes(transaction.block.ledgerParameters)),
      ];
    },

    async watchForTxData(txId: TransactionId): Promise<FinalizedTxData> {
      const { Transaction } = await import("@midnight-ntwrk/ledger-v8");

      // "Waits indefinitely" per the interface contract — bounded here by
      // polling forever at a fixed interval rather than by a timeout, exactly
      // as the doc comment on PublicDataProvider.watchForTxData requires.
      // Callers that want a deadline (the UI does) wrap this call themselves.
      for (;;) {
        const data = await graphql<{
          transactions: Array<{
            hash: string;
            raw?: string;
            identifiers?: string[];
            protocolVersion?: number;
            fee?: string;
            transactionResult?: { status: string };
            block?: { hash: string; height: number; timestamp: number; author: string | null };
          }>;
        }>(TX_STATUS_QUERY, { id: txId });

        const found = data.transactions.find((tx) => tx.identifiers?.includes(txId));
        if (found?.transactionResult && found.raw && found.block) {
          // `.tx` is spread into the caller's result.public by
          // midnight-js-contracts' TransactionContextImpl[Submit] — a caller
          // reading result.public.tx must get the real finalized transaction,
          // not a stand-in, so it is decoded here rather than omitted.
          //
          // Explicit type arguments: the marker params are typed `S['instance']`
          // (a string literal), so TS cannot narrow S/P/B from the string
          // values alone — it infers the widest Signaturish/Proofish/Bindingish
          // otherwise, which does not match FinalizedTxData's fixed
          // SignatureEnabled/Proof/Binding.
          type LedgerV8 = typeof import("@midnight-ntwrk/ledger-v8");
          const tx = Transaction.deserialize<
            InstanceType<LedgerV8["SignatureEnabled"]>,
            InstanceType<LedgerV8["Proof"]>,
            InstanceType<LedgerV8["Binding"]>
          >("signature", "proof", "binding", hexToBytes(found.raw));
          const identifiers = found.identifiers ?? [txId];
          const finalized: FinalizedTxData = {
            tx,
            status: toTxStatus(found.transactionResult.status),
            txId,
            identifiers,
            txHash: found.hash,
            blockHash: found.block.hash,
            blockHeight: found.block.height,
            blockTimestamp: found.block.timestamp,
            blockAuthor: found.block.author,
            indexerId: 0,
            protocolVersion: found.protocolVersion ?? 0,
            // The indexer reports one settled fee, not a paid/estimated split
            // — both fields carry the same value rather than guessing a second one.
            fees: { paidFees: found.fee ?? "0", estimatedFees: found.fee ?? "0" },
            segmentStatusMap: undefined,
            unshielded: { created: [], spent: [] },
          };
          return finalized;
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    },

    queryDeployContractState: unsupported("queryDeployContractState"),
    queryUnshieldedBalances: unsupported("queryUnshieldedBalances"),
    watchForContractState: unsupported("watchForContractState"),
    watchForUnshieldedBalances: unsupported("watchForUnshieldedBalances"),
    watchForDeployTxData: unsupported("watchForDeployTxData"),
    contractStateObservable: unsupported("contractStateObservable"),
    unshieldedBalancesObservable: unsupported("unshieldedBalancesObservable"),
  } as PublicDataProvider;
}
