// The check that stands between a stale issuer key and ten wasted fees.
//
// scripts/publish-proofs.mjs reads the issuer key off the chain BEFORE it
// opens the wallet, and refuses to submit when that key is not the one the
// school signs with. That check is not a nicety: the drift it looks for is
// exactly what commit 6b9a567 introduced, and the symptom without it is
// "failed assert: bad issuer signature" once per call, each having paid.
//
// These drive the readers against a captured indexer response — the same
// fixture tests/browser-providers.test.ts uses, holding the real registered
// key and proofsVerified: 0 — so the WASM decoder runs the same path a live
// read does rather than a shape that merely satisfies TypeScript.

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readIssuerKey, readProofsVerified } from "@/scripts/publish-proofs.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./helpers/browser-providers-fixtures.json", import.meta.url), "utf8"),
);

const ADDRESS = "89975419a1a887b6f4d74d91e4c857ff3256c966f2c4fb77775e4524f8a0b729";
const INDEXER = "https://indexer.preprod.midnight.network/api/v4/graphql";

/** hashToField("hanoi-university") — the id the deployed contract registered. */
const SCHOOL_ID_HASH = 3226085635n;

/** The key actually on chain in the captured state. */
const ON_CHAIN_X =
  34352304742157505789120914464291012977572064698585816737755583180313001009591n;

let runtime: typeof import("@midnight-ntwrk/compact-runtime");

async function getRuntime() {
  runtime ??= await import("@midnight-ntwrk/compact-runtime");
  return runtime;
}

/** Serves a chosen body to any fetch the reader makes. */
function stubIndexer(body: unknown) {
  vi.stubGlobal("fetch", async () => ({ ok: true, status: 200, json: async () => body }) as Response);
}

afterEach(() => {
  // Scoped rather than a blanket reset: other suites install their own fetch
  // stub, and clearing globally has broken them before.
  vi.unstubAllGlobals();
});

describe("reading the issuer key off the chain", () => {
  it("decodes the real registered key from a captured contract state", async () => {
    stubIndexer({ data: { contractAction: fixtures.deployState.contractAction } });

    const key = await readIssuerKey(INDEXER, ADDRESS, SCHOOL_ID_HASH, await getRuntime());

    // Not merely "something came back": this is the exact key on Preprod, so a
    // decoder that silently produced a different point would fail here.
    expect(key).not.toBeNull();
    expect(key!.x).toBe(ON_CHAIN_X);
  });

  it("returns null for a school that was never registered", async () => {
    // The caller turns this into "register it first", not into a submission.
    stubIndexer({ data: { contractAction: fixtures.deployState.contractAction } });

    expect(await readIssuerKey(INDEXER, ADDRESS, 0xdeadbeefn, await getRuntime())).toBeNull();
  });

  it("returns null when the indexer has no contract at the address", async () => {
    stubIndexer({ data: { contractAction: null } });

    expect(await readIssuerKey(INDEXER, ADDRESS, SCHOOL_ID_HASH, await getRuntime())).toBeNull();
  });

  it("returns null rather than throwing when the indexer is unreachable", async () => {
    // A failed read must not crash the script with a stack trace; the caller
    // reports "not registered" and names the fix.
    vi.stubGlobal("fetch", async () => {
      throw new Error("ECONNREFUSED");
    });

    expect(await readIssuerKey(INDEXER, ADDRESS, SCHOOL_ID_HASH, await getRuntime())).toBeNull();
  });
});

describe("the mismatch that stops the run", () => {
  it("distinguishes the on-chain key from one derived from another secret", async () => {
    // The drift's exact shape, stated as an assertion rather than as prose: if
    // these two were ever equal, the preflight would be comparing a value
    // against itself and could never fire.
    stubIndexer({ data: { contractAction: fixtures.deployState.contractAction } });

    const [key, { publicKeyOf }] = await Promise.all([
      readIssuerKey(INDEXER, ADDRESS, SCHOOL_ID_HASH, await getRuntime()),
      import("@/lib/midnight/schnorr"),
    ]);
    const other = await publicKeyOf(99999n);

    expect(key!.x).not.toBe(other.x);
  });
});

describe("reading proofsVerified back independently", () => {
  it("reports the count held on chain", async () => {
    // Read straight from the indexer, not through the SDK: this is the check
    // that the SDK's own success report is true, so it must not go through the
    // thing being checked.
    stubIndexer({ data: { contractAction: fixtures.deployState.contractAction } });

    expect(await readProofsVerified(INDEXER, ADDRESS, await getRuntime())).toBe(0n);
  });

  it("returns null when the state cannot be read", async () => {
    stubIndexer({ data: { contractAction: null } });

    expect(await readProofsVerified(INDEXER, ADDRESS, await getRuntime())).toBeNull();
  });
});
