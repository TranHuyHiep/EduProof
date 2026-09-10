// A `PublicDataProvider` that runs in the browser.
//
// `@midnight-ntwrk/midnight-js-indexer-public-data-provider`'s own
// implementation pulls in a WebSocket client that does not survive the
// Next.js client bundle ('WebSocket' is not exported from 'isomorphic-ws') —
// see the same discovery already recorded in lib/midnight/chain.ts, which
// works around it for read-only verify-page queries by calling the indexer's
// GraphQL endpoint directly. This does the same, and implements every method
// `findDeployedContract` actually calls (traced in
// node_modules/@midnight-ntwrk/midnight-js-contracts): before its `callTx`
// handle ever calls `getPublicStates` -> `queryZSwapAndContractState` or
// `submitCallTx` -> `watchForTxData`, `findDeployedContract` itself calls
// `watchForDeployTxData` and `queryDeployContractState` up front, to confirm
// the address really holds the contract this call was compiled against.
// Only the genuinely unrelated methods (unshielded-balance queries, state
// subscriptions) are left unimplemented — publishProof() never reaches those.
//
// No caching, no dedupe: each proof publish is one contract call, not a hot
// path.
//
// One thing to be careful of when editing: the types this returns come from
// TWO different WASM packages, and the interface picks per field —
// ContractState from compact-runtime (onchain-runtime-v3), ZswapChainState
// and LedgerParameters from ledger-v8. Both packages export a class called
// `ContractState`; they are not interchangeable, and the mismatch is caught
// by an `instanceof` deep inside compact-runtime rather than by the compiler.

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

// `contractAction` returns whichever action currently sits at this address —
// the schema's `ContractDeploy | ContractUpdate | ContractCall` union.
// Once at least one call has happened (which `findDeployedContract` cannot
// assume), the live action is a `ContractCall`, and the deploy's own state
// and transaction are reachable only through its `deploy` field — mirrors
// `DEPLOY_CONTRACT_STATE_TX_QUERY`/`DEPLOY_TX_QUERY` in
// @midnight-ntwrk/midnight-js-indexer-public-data-provider.
// `deploy` exists only on the concrete `ContractCall` type, not on the
// `ContractAction` interface `contractAction(address:)` returns — confirmed
// by introspection against indexer.preprod.midnight.network, which rejects
// an un-fragmented `deploy` selection with "Unknown field \"deploy\" on type
// \"ContractAction\"". Hence the inline fragment rather than a bare field.
const DEPLOY_STATE_QUERY = `
  query DeployState($address: HexEncoded!) {
    contractAction(address: $address) {
      __typename
      state
      ... on ContractCall {
        deploy {
          transaction {
            contractActions { address state }
          }
        }
      }
    }
  }
`;

// `fee` (singular) is what the indexer's schema actually exposes on
// RegularTransaction — confirmed by introspection against
// indexer.preprod.midnight.network. The `fees { estimatedFees paidFees }`
// shape belongs to @midnight-ntwrk/midnight-js-indexer-public-data-provider's
// FinalizedTxData type, not to this GraphQL schema; querying it here would
// fail with a schema-validation error at runtime, not a type error.
const DEPLOY_TX_QUERY = `
  query DeployTx($address: HexEncoded!) {
    contractAction(address: $address) {
      __typename
      transaction {
        raw
        hash
        contractActions { address }
        block { hash height timestamp author }
        ... on RegularTransaction { identifiers protocolVersion fee transactionResult { status } }
      }
      ... on ContractCall {
        deploy {
          transaction {
            raw
            hash
            contractActions { address }
            block { hash height timestamp author }
            ... on RegularTransaction { identifiers protocolVersion fee transactionResult { status } }
          }
        }
      }
    }
  }
`;

// The chain tip, used by watchForTxData as the "nothing before this counts"
// marker. `block` with no arguments returns the newest block, and is nullable
// in the schema (confirmed by introspection against
// indexer.preprod.midnight.network) — a null answer is a real possibility on
// a freshly reset indexer, not a case that can be assumed away.
const LATEST_BLOCK_QUERY = `
  query LatestBlock {
    block { height }
  }
`;

/** Maps the indexer's enum to the ledger's status strings — see docs/51 §2. */
function toTxStatus(status: string): FinalizedTxData["status"] {
  if (status === "SUCCESS") return "SucceedEntirely";
  if (status === "PARTIAL_SUCCESS") return "FailFallible";
  return "FailEntirely";
}

interface DeployTxRow {
  raw: string;
  hash: string;
  identifiers?: string[];
  protocolVersion?: number;
  // Singular on the wire — see the comment on DEPLOY_TX_QUERY. Split into a
  // paid/estimated pair only when building FinalizedTxData, same as
  // TX_STATUS_QUERY's `fee` already does below.
  fee?: string;
  contractActions: Array<{ address: string }>;
  block: { hash: string; height: number; timestamp: number; author: string | null };
  transactionResult?: { status: string };
}

const unsupported = (method: string) => () => {
  throw new Error(
    `browserPublicDataProvider does not implement ${method} — publishProof() never calls it. ` +
      "If a new caller needs it, this provider needs extending; do not stub it silently.",
  );
};

/**
 * Decodes an indexer transaction row into `FinalizedTxData`, given the txId
 * to report (the indexer keys rows by hash; `FinalizedTxData.txId` is the
 * ledger identifier, which for a multi-action transaction is not the same
 * string — see `correlateForAddress` for how the caller picks it).
 */
async function decodeFinalizedTx(row: DeployTxRow, txId: string): Promise<FinalizedTxData> {
  const { Transaction } = await import("@midnight-ntwrk/ledger-v8");
  type LedgerV8 = typeof import("@midnight-ntwrk/ledger-v8");
  const tx = Transaction.deserialize<
    InstanceType<LedgerV8["SignatureEnabled"]>,
    InstanceType<LedgerV8["Proof"]>,
    InstanceType<LedgerV8["Binding"]>
  >("signature", "proof", "binding", hexToBytes(row.raw));
  return {
    tx,
    status: toTxStatus(row.transactionResult?.status ?? "SUCCESS"),
    txId,
    identifiers: row.identifiers ?? [txId],
    txHash: row.hash,
    blockHash: row.block.hash,
    blockHeight: row.block.height,
    blockTimestamp: row.block.timestamp,
    blockAuthor: row.block.author,
    indexerId: 0,
    protocolVersion: row.protocolVersion ?? 0,
    // The indexer reports one settled fee, not a paid/estimated split — both
    // fields carry the same value rather than guessing a second one.
    fees: { paidFees: row.fee ?? "0", estimatedFees: row.fee ?? "0" },
    segmentStatusMap: undefined,
    unshielded: { created: [], spent: [] },
  };
}

/**
 * Which identifier to report for this contract address — mirrors
 * `correlateDeployTxId` in
 * @midnight-ntwrk/midnight-js-indexer-public-data-provider, which indexes
 * `identifiers` by the address's position in `contractActions`.
 *
 * That pairing is the SDK's assumption, not something the live data bears
 * out: both of this contract's settled transactions carry two identifiers
 * and a single contract action, so the arrays are not parallel. It stays
 * because ledger-v8 documents `identifiers()` as a set where *any* member
 * watches the whole transaction, which makes the choice between them
 * immaterial — picking index 0, as this does for a single-action
 * transaction, names the right transaction either way.
 */
function correlateForAddress(
  contractAddress: string,
  contractActions: Array<{ address: string }>,
  identifiers: string[] | undefined,
): string {
  const index = contractActions.findIndex((a) => a.address === contractAddress);
  const txId = index >= 0 ? identifiers?.[index] : undefined;
  if (!txId) {
    throw new Error(`Indexer data for ${contractAddress} carries no matching identifier.`);
  }
  return txId;
}

export function browserPublicDataProvider(): PublicDataProvider {
  return {
    async queryContractState(contractAddress) {
      const { ContractState } = await import("@midnight-ntwrk/compact-runtime");
      const data = await graphql<{ contractAction: { state: string } | null }>(
        CONTRACT_ACTION_QUERY,
        { address: contractAddress },
      );
      if (!data.contractAction) return null;
      return ContractState.deserialize(hexToBytes(data.contractAction.state));
    },

    async queryZSwapAndContractState(contractAddress: ContractAddress) {
      // Two packages, deliberately. PublicDataProvider's own signature takes
      // ContractState from midnight-js-protocol/compact-runtime (which
      // re-exports onchain-runtime-v3) but ZswapChainState and
      // LedgerParameters from midnight-js-protocol/ledger. They are separate
      // WASM builds with separate classes, and compact-runtime's
      // coerceToChargedState decides by `instanceof` — hand it the ledger-v8
      // ContractState and it rejects a state whose contents are perfectly
      // correct with "'contractState' parameter … has unexpected type".
      const [{ ContractState }, { ZswapChainState, LedgerParameters }] = await Promise.all([
        import("@midnight-ntwrk/compact-runtime"),
        import("@midnight-ntwrk/ledger-v8"),
      ]);
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
      // The chain tip as of the moment this wait begins, read BEFORE the first
      // poll and never refreshed.
      //
      // Why this exists: a Midnight transaction carries several identifiers,
      // and `transactions(offset: { identifier: $id })` will happily answer
      // with one that settled weeks ago. Without a floor, a txId belonging to
      // an already-settled transaction — this contract's own deploy, or its
      // registerIssuer call — resolves instantly with status SUCCESS, and the
      // caller reports a publish that never happened. That is not
      // hypothetical: it shipped, and the explorer link it produced pointed at
      // the August deploy while proofsVerified on chain stayed at zero.
      //
      // Refreshing the tip inside the loop would be worse than useless: the
      // floor would climb past a transaction still sitting in the mempool and
      // the wait would never end.
      //
      // Failing to read the tip is fatal on purpose. Carrying on without a
      // floor would restore exactly the behaviour this guards against, and
      // would do so precisely when the indexer is least trustworthy.
      const tip = await graphql<{ block: { height: number } | null }>(LATEST_BLOCK_QUERY, {});
      if (!tip.block) {
        throw new Error(
          "The indexer reports no latest block, so a newly submitted transaction cannot be told " +
            "apart from an old one. Refusing to watch rather than risk confirming the wrong transaction.",
        );
      }
      // `>=`, not `>`: the wallet submits before this line runs, so the
      // transaction may well land in the block that was already the tip. A
      // strict `>` would reject a genuine publish roughly once per block time.
      // The cost is a one-block-wide window in which an older transaction
      // would still be accepted — and the known stale ones sit a hundred
      // thousand blocks below it.
      const floor = tip.block.height;

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

        // The height test sits inside `.find`, not after it: a response
        // carrying both an old and a new row must still yield the new one.
        const found = data.transactions.find(
          (tx) => tx.identifiers?.includes(txId) && (tx.block?.height ?? -1) >= floor,
        );
        if (found?.transactionResult && found.raw && found.block) {
          // `.tx` is spread into the caller's result.public by
          // midnight-js-contracts' TransactionContextImpl[Submit] — a caller
          // reading result.public.tx must get the real finalized transaction,
          // not a stand-in, so it is decoded here rather than omitted.
          return decodeFinalizedTx(
            {
              raw: found.raw,
              hash: found.hash,
              identifiers: found.identifiers,
              protocolVersion: found.protocolVersion,
              fee: found.fee,
              contractActions: [],
              block: found.block,
              transactionResult: found.transactionResult,
            },
            txId,
          );
        }

        // A row matching the identifier but sitting below the floor is not
        // "not yet" — it is a transaction that settled before this wait began,
        // and no amount of further polling turns it into a new one. Naming
        // both the identifier and its block is what tells a developer the txId
        // came out of the wallet stale, rather than the network being slow.
        const stale = data.transactions.find(
          (tx) => tx.identifiers?.includes(txId) && (tx.block?.height ?? -1) < floor,
        );
        if (stale) {
          throw new Error(
            `Identifier ${txId} belongs to transaction ${stale.hash}, settled in block ` +
              `${stale.block?.height} — before this wait began at block ${floor}. ` +
              "The wallet did not submit a new transaction.",
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    },

    async queryDeployContractState(contractAddress: ContractAddress) {
      // compact-runtime's ContractState, not ledger-v8's — see the note in
      // queryZSwapAndContractState.
      const { ContractState } = await import("@midnight-ntwrk/compact-runtime");
      const data = await graphql<{
        contractAction: {
          __typename: string;
          state: string | null;
          deploy: { transaction: { contractActions: Array<{ address: string; state: string }> } } | null;
        } | null;
      }>(DEPLOY_STATE_QUERY, { address: contractAddress });

      const action = data.contractAction;
      if (!action) return null;

      // Once the contract has been called at least once, the live action is
      // a ContractCall, and the deploy's own state is reachable only via its
      // `deploy` field (see the query comment above) — the direct `state`
      // field on a ContractCall is the call's own resulting state, not the
      // constructor's.
      if (action.__typename === "ContractCall") {
        if (!action.deploy) throw new Error(`Indexer data for ${contractAddress} has no deploy record.`);
        const deployAction = action.deploy.transaction.contractActions.find(
          (a) => a.address === contractAddress,
        );
        if (!deployAction) throw new Error(`Indexer data for ${contractAddress} carries no matching deploy action.`);
        return ContractState.deserialize(hexToBytes(deployAction.state));
      }

      if (!action.state) return null;
      return ContractState.deserialize(hexToBytes(action.state));
    },

    queryUnshieldedBalances: unsupported("queryUnshieldedBalances"),
    watchForContractState: unsupported("watchForContractState"),
    watchForUnshieldedBalances: unsupported("watchForUnshieldedBalances"),

    async watchForDeployTxData(contractAddress: ContractAddress): Promise<FinalizedTxData> {
      // "Waits indefinitely" per the interface contract, same as
      // watchForTxData above — polling rather than a push subscription,
      // since this only ever runs once per publishProof() call, not on a
      // hot path.
      for (;;) {
        const data = await graphql<{
          contractAction: {
            __typename: string;
            transaction: (DeployTxRow & { transactionResult?: { status: string } }) | null;
            deploy: { transaction: DeployTxRow & { transactionResult?: { status: string } } } | null;
          } | null;
        }>(DEPLOY_TX_QUERY, { address: contractAddress });

        const action = data.contractAction;
        const row = action?.__typename === "ContractCall" ? action.deploy?.transaction : action?.transaction;
        if (row?.raw && row.block && row.transactionResult) {
          const txId = correlateForAddress(contractAddress, row.contractActions, row.identifiers);
          return decodeFinalizedTx(row, txId);
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    },

    contractStateObservable: unsupported("contractStateObservable"),
    unshieldedBalancesObservable: unsupported("unshieldedBalancesObservable"),
  } as PublicDataProvider;
}
