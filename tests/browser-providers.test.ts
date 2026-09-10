// browserPublicDataProvider — the piece publishProof() uses in place of
// @midnight-ntwrk/midnight-js-indexer-public-data-provider (which does not
// survive the browser bundle; see the file's own header comment).
//
// This regression-tests a bug found by code review, not by a failed run:
// findDeployedContract() (from @midnight-ntwrk/midnight-js-contracts) calls
// watchForDeployTxData() and queryDeployContractState() before it ever
// reaches callTx — confirmed by reading that package's source. An earlier
// version of this provider left both throwing "not implemented", believing
// them to be deploy-only and therefore unreachable from publishProof(). They
// are not: every call through findDeployedContract hits them, wallet or no
// wallet, so publishProof() would throw before a real transaction was ever
// attempted.
//
// Fixtures are real indexer responses, captured by hand against
// indexer.preprod.midnight.network for the deployed contract (see
// docs/15-wave-1-smartcontract-call.md) — real ContractState and Transaction
// bytes so the WASM decoders in the assertions below exercise the same path
// a live call does, not a shape that merely satisfies TypeScript.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const fixtures = JSON.parse(
  readFileSync(new URL("./helpers/browser-providers-fixtures.json", import.meta.url), "utf8"),
);

const ADDRESS = "89975419a1a887b6f4d74d91e4c857ff3256c966f2c4fb77775e4524f8a0b729";
const DEPLOY_TX_HASH = "53a28aeb8e050e068b22ccebcc351cee87c3eb44d3e6fa06ba6695293a4884aa";
// The ledger identifier at the deploy action's own index in `identifiers` —
// not its tx hash. Captured alongside the fixtures above.
const DEPLOY_TX_ID = "00da646396c2d39d8e2358fd2b326bf8ee2d54af2aa4565ad639dc1029c23318df";

/** Chain tip in the `latestBlock` fixture, and the floor every wait compares against. */
const TIP_HEIGHT = 2418769;
/** Where the stale (August) transaction actually settled. */
const STALE_HEIGHT = 2317008;

interface Routes {
  latestBlock?: unknown;
  txStatus?: unknown;
  contractAction?: unknown;
  onLatestBlock?: () => void;
}

function mockIndexerFetch(routes: Routes = {}) {
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    const query = body.query as string;

    if (query.includes("query DeployState")) return jsonResponse(fixtures.deployState);
    if (query.includes("query DeployTx")) return jsonResponse(fixtures.deployTx);
    if (query.includes("query LatestBlock")) {
      routes.onLatestBlock?.();
      return jsonResponse(routes.latestBlock ?? fixtures.latestBlock);
    }
    if (query.includes("query TxStatus")) {
      return jsonResponse(routes.txStatus ?? fixtures.emptyTxStatus);
    }
    if (query.includes("query ContractAction")) {
      return jsonResponse({ contractAction: routes.contractAction ?? null });
    }
    throw new Error(`Unexpected query in test: ${query.slice(0, 80)}`);
  });
}

function jsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => ({ data }) } as Response;
}

describe("browserPublicDataProvider — the deploy-lookup methods findDeployedContract calls first", () => {
  it("queryDeployContractState decodes the real constructor state, not a stub", async () => {
    mockIndexerFetch();
    const { browserPublicDataProvider } = await import("@/lib/midnight/browser-providers");
    const provider = browserPublicDataProvider();

    const state = await provider.queryDeployContractState(ADDRESS);
    expect(state).not.toBeNull();
  });

  it("watchForDeployTxData resolves with the real deploy transaction, not the throwaway stub", async () => {
    mockIndexerFetch();
    const { browserPublicDataProvider } = await import("@/lib/midnight/browser-providers");
    const provider = browserPublicDataProvider();

    const finalized = await provider.watchForDeployTxData(ADDRESS);
    expect(finalized.status).toBe("SucceedEntirely");
    expect(finalized.txHash).toBe(DEPLOY_TX_HASH);
    expect(finalized.txId).toBe(DEPLOY_TX_ID);
    expect(finalized.blockHeight).toBeGreaterThan(0);
  });
});

// Both @midnight-ntwrk/ledger-v8 and @midnight-ntwrk/compact-runtime export a
// class named ContractState, from separate WASM builds. PublicDataProvider's
// signature takes compact-runtime's, and compact-runtime decides by
// `instanceof` — so returning ledger-v8's produces a state whose CONTENTS are
// perfectly correct and which is still rejected, deep inside the SDK, with
// "'contractState' parameter … has unexpected type".
//
// TypeScript cannot see the difference (structurally identical, both `any`
// across the dynamic-import boundary), so an assertion on the class is the
// only thing standing between a future edit and that error coming back.
describe("contract state comes from the runtime the SDK checks against", () => {
  it("queryDeployContractState returns compact-runtime's ContractState", async () => {
    mockIndexerFetch();
    const [{ browserPublicDataProvider }, ocrt, ledger] = await Promise.all([
      import("@/lib/midnight/browser-providers"),
      import("@midnight-ntwrk/compact-runtime"),
      import("@midnight-ntwrk/ledger-v8"),
    ]);

    const state = await browserPublicDataProvider().queryDeployContractState(ADDRESS);

    expect(state).toBeInstanceOf(ocrt.ContractState);
    // Stated the other way round too: the two classes are genuinely distinct,
    // so passing this pair of assertions cannot be a coincidence of naming.
    expect(state).not.toBeInstanceOf(ledger.ContractState);
  });

  it("queryContractState returns compact-runtime's ContractState", async () => {
    mockIndexerFetch({ contractAction: fixtures.deployState.contractAction });
    const [{ browserPublicDataProvider }, ocrt] = await Promise.all([
      import("@/lib/midnight/browser-providers"),
      import("@midnight-ntwrk/compact-runtime"),
    ]);

    const state = await browserPublicDataProvider().queryContractState(ADDRESS);

    expect(state).toBeInstanceOf(ocrt.ContractState);
  });
});

// A publish reported success against a transaction that had settled in
// August: `transactions(offset: { identifier: $id })` answers for ANY of a
// transaction's identifiers, and the deploy's happened to be the one being
// watched for. The chain tip read at the start of the wait is what stops
// that, and these lock it in.
//
// `freshTxStatus`/`atTipTxStatus` are the same real captured response with
// ONLY the block height moved — no proveCredentialPredicate transaction
// exists on chain to capture instead, and `raw` has to stay real so the WASM
// decoder runs the same path a live call does.
describe("watchForTxData refuses transactions older than the wait", () => {
  it("rejects a transaction that settled before the wait began", async () => {
    mockIndexerFetch({ txStatus: fixtures.staleTxStatus });
    const { browserPublicDataProvider } = await import("@/lib/midnight/browser-providers");

    await expect(browserPublicDataProvider().watchForTxData(DEPLOY_TX_ID)).rejects.toThrow(
      new RegExp(`settled in block ${STALE_HEIGHT}`),
    );
  });

  it("accepts a transaction in a block after the tip", async () => {
    mockIndexerFetch({ txStatus: fixtures.freshTxStatus });
    const { browserPublicDataProvider } = await import("@/lib/midnight/browser-providers");

    const finalized = await browserPublicDataProvider().watchForTxData(DEPLOY_TX_ID);
    expect(finalized.status).toBe("SucceedEntirely");
    expect(finalized.blockHeight).toBe(TIP_HEIGHT + 1);
  });

  it("accepts a transaction in the very block that was the tip", async () => {
    // Not a nicety: the wallet submits before the wait starts, so a block
    // that is current at that moment is still open. A strict `>` would
    // reject a real publish about once per block time.
    mockIndexerFetch({ txStatus: fixtures.atTipTxStatus });
    const { browserPublicDataProvider } = await import("@/lib/midnight/browser-providers");

    const finalized = await browserPublicDataProvider().watchForTxData(DEPLOY_TX_ID);
    expect(finalized.blockHeight).toBe(TIP_HEIGHT);
  });

  it("refuses to watch at all when the chain tip cannot be read", async () => {
    // The stale row is served too: if anyone ever reintroduces a "carry on
    // without a floor" fallback, this resolves instead of rejecting.
    mockIndexerFetch({ latestBlock: fixtures.noBlock, txStatus: fixtures.staleTxStatus });
    const { browserPublicDataProvider } = await import("@/lib/midnight/browser-providers");

    await expect(browserPublicDataProvider().watchForTxData(DEPLOY_TX_ID)).rejects.toThrow(
      /no latest block/i,
    );
  });

  it("reads the tip once, before polling, so the floor cannot climb past a pending transaction", async () => {
    let tipQueries = 0;
    mockIndexerFetch({
      txStatus: fixtures.freshTxStatus,
      onLatestBlock: () => { tipQueries += 1; },
    });
    const { browserPublicDataProvider } = await import("@/lib/midnight/browser-providers");

    await browserPublicDataProvider().watchForTxData(DEPLOY_TX_ID);
    expect(tipQueries).toBe(1);
  });
});
