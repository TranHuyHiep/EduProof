// The bridge from a connected browser wallet to midnight-js-contracts.
//
// This is the path that, with a real Lace wallet, produced no signing prompt
// and no transaction on chain. Every case below is one of the ways that can
// happen, each of which the provider now has to name rather than swallow —
// plus the transition it has to perform, which nothing downstream does:
// balanceUnsealedTransaction may hand back a PreBinding transaction, and
// submitTransaction requires Binding.
//
// The wallet is stubbed. What is NOT stubbed is the transaction bytes: they
// are the real captured deploy transaction, so the marker reading and the
// ledger decode run exactly as they do in the browser.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { laceWalletProvider } from "@/lib/midnight/lace-provider";
import { publishErrorMessage } from "@/lib/midnight/errors";

const fixtures = JSON.parse(
  readFileSync(new URL("./helpers/browser-providers-fixtures.json", import.meta.url), "utf8"),
);

const BOUND_TX_HEX = fixtures.staleTxStatus.transactions[0].raw as string;

const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from((hex.match(/../g) ?? []).map((b) => Number.parseInt(b, 16)));

/** See tests/tx-markers.test.ts — a chain only stores bound transactions. */
function spliceHeaderHex(hex: string, from: string, to: string): string {
  const bytes = hexToBytes(hex);
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 128));
  const spliced = head.replace(from, to);
  const out = new Uint8Array(bytes.byteLength + (spliced.length - head.length));
  for (let i = 0; i < spliced.length; i++) out[i] = spliced.charCodeAt(i);
  out.set(bytes.subarray(128), spliced.length);
  return Array.from(out, (b) => b.toString(16).padStart(2, "0")).join("");
}

interface StubOptions {
  networkId?: string | null;
  balanced?: string;
  balanceError?: Error;
  submitError?: Error;
}

interface Stub {
  api: ConnectedAPI;
  balanceCalls: Array<{ tx: string; options?: { payFees?: boolean } }>;
  submitted: string[];
}

function stubWallet(options: StubOptions = {}): Stub {
  const balanceCalls: Stub["balanceCalls"] = [];
  const submitted: string[] = [];

  const api = {
    getShieldedAddresses: async () => ({
      shieldedAddress: "mn_shield-addr_test1abc",
      shieldedCoinPublicKey: "coin-pk",
      shieldedEncryptionPublicKey: "enc-pk",
    }),
    async balanceUnsealedTransaction(tx: string, opts?: { payFees?: boolean }) {
      balanceCalls.push({ tx, options: opts });
      if (options.balanceError) throw options.balanceError;
      return { tx: options.balanced ?? BOUND_TX_HEX };
    },
    async submitTransaction(tx: string) {
      submitted.push(tx);
      if (options.submitError) throw options.submitError;
    },
    ...(options.networkId === null
      ? {}
      : {
          getConfiguration: async () => ({
            indexerUri: "https://indexer.preprod.midnight.network/api/v4/graphql",
            indexerWsUri: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
            substrateNodeUri: "https://rpc.preprod.midnight.network",
            networkId: options.networkId ?? "preprod",
          }),
        }),
  } as unknown as ConnectedAPI;

  return { api, balanceCalls, submitted };
}

/**
 * A transaction to hand to balanceTx.
 *
 * balanceTx takes an UnboundTransaction (PreBinding), and no chain stores one
 * to capture — settled transactions are all bound. The bound bytes stand in:
 * the stub wallet never decodes what it is given, and what balanceTx does with
 * the input is serialize it, so the marker of this object never affects the
 * behaviour under test. Cast rather than pretended-to-be-real, so the
 * substitution is visible at the point it is made.
 */
async function aBoundTx() {
  const { Transaction } = await import("@midnight-ntwrk/ledger-v8");
  type LedgerV8 = typeof import("@midnight-ntwrk/ledger-v8");
  return Transaction.deserialize<
    InstanceType<LedgerV8["SignatureEnabled"]>,
    InstanceType<LedgerV8["Proof"]>,
    InstanceType<LedgerV8["Binding"]>
  >("signature", "proof", "binding", hexToBytes(BOUND_TX_HEX));
}

async function anUnprovenTx() {
  const bound = await aBoundTx();
  return bound as unknown as Parameters<
    Awaited<ReturnType<typeof laceWalletProvider>>["balanceTx"]
  >[0];
}

describe("the network the wallet is on", () => {
  it("builds a provider when the wallet is on the same network as the contract", async () => {
    const provider = await laceWalletProvider(stubWallet().api);
    expect(provider.getCoinPublicKey()).toBe("coin-pk");
  });

  it("refuses a wallet on a different chain, naming both networks", async () => {
    // Preview and Preprod have separate genesis: a contract on one does not
    // exist on the other, and the failure would otherwise surface as something
    // unrelated at transaction time.
    await expect(laceWalletProvider(stubWallet({ networkId: "preview" }).api)).rejects.toThrow(
      /connected to "preview".*publishes to "preprod"/s,
    );
  });

  it("still builds a provider for a wallet too old to be asked", async () => {
    const provider = await laceWalletProvider(stubWallet({ networkId: null }).api);
    expect(provider.getEncryptionPublicKey()).toBe("enc-pk");
  });
});

describe("balancing", () => {
  it("states payFees rather than relying on the default", async () => {
    const stub = stubWallet();
    const provider = await laceWalletProvider(stub.api);
    await provider.balanceTx(await anUnprovenTx());

    expect(stub.balanceCalls[0].options).toEqual({ payFees: true });
  });

  it("uses an already-bound transaction as it stands", async () => {
    const provider = await laceWalletProvider(stubWallet().api);
    const balanced = await provider.balanceTx(await anUnprovenTx());

    expect(Array.from(balanced.serialize())).toEqual(Array.from(hexToBytes(BOUND_TX_HEX)));
  });

  it("takes the pre-binding branch — the step nothing downstream performs", async () => {
    // The regression test for the bug: submitTransaction requires Binding, and
    // midnight-js-contracts hands balanceTx's result straight to it untouched,
    // so if the transition is not made here it is made nowhere.
    //
    // These bytes are a real BOUND transaction wearing a spliced pre-binding
    // header, which is as close as a test can get without a wallet: no chain
    // stores an unbound transaction to capture. The header therefore matches
    // what the decoder is asked for and the BODY is what fails. That failure
    // is the assertion — reaching a body error at all proves the pre-binding
    // branch ran, because the bound branch would have decoded these bytes
    // cleanly and returned. The genuine article, with a real pre-binding body,
    // decodes and gets bind() called on it.
    const preBoundHex = spliceHeaderHex(BOUND_TX_HEX, "pedersen-schnorr[v1]", "embedded-fr[v1]");
    const provider = await laceWalletProvider(stubWallet({ balanced: preBoundHex }).api);

    const error = await provider.balanceTx(await anUnprovenTx()).catch((e: unknown) => e);
    expect((error as Error).message).toMatch(/Unable to deserialize Transaction/);
    // Not a tag mismatch: the pre-binding marker was accepted, so the branch
    // under test is the one that ran.
    expect((error as Error).message).not.toMatch(/expected header tag/);
  });

  it("names an unsigned transaction as unsigned", async () => {
    const unsignedHex = spliceHeaderHex(BOUND_TX_HEX, "signature[v1]", "()");
    const provider = await laceWalletProvider(stubWallet({ balanced: unsignedHex }).api);

    await expect(provider.balanceTx(await anUnprovenTx())).rejects.toThrow(/did not sign it/);
  });

  it("says so when the wallet returns something that is not a transaction", async () => {
    const provider = await laceWalletProvider(stubWallet({ balanced: "" }).api);

    await expect(provider.balanceTx(await anUnprovenTx())).rejects.toThrow(
      /not a Midnight transaction/,
    );
  });

  it("keeps a wallet's own error intact so the chain error code still maps", async () => {
    // publishErrorMessage reads `Custom error: NNN` out of whatever it is
    // given, so wrapping must not discard the wallet's message.
    const stub = stubWallet({ balanceError: new Error("1010: Invalid Transaction: Custom error: 173") });
    const provider = await laceWalletProvider(stub.api);

    const error = await provider.balanceTx(await anUnprovenTx()).catch((e: unknown) => e);
    expect((error as Error).message).toMatch(/would not balance/);
    expect(publishErrorMessage(error)).toBe("Not enough DUST to cover the fee.");
  });
});

describe("submitting", () => {
  it("hands the wallet the transaction and reports its identifier", async () => {
    const stub = stubWallet();
    const provider = await laceWalletProvider(stub.api);
    const tx = await aBoundTx();

    const txId = await provider.submitTx(tx);

    expect(stub.submitted).toHaveLength(1);
    expect(txId).toBe(tx.identifiers()[0]);
  });

  it("names a wallet that refuses to relay", async () => {
    // submitTransaction returns void, so a refusal is otherwise
    // indistinguishable from a successful relay.
    const stub = stubWallet({ submitError: new Error("user rejected") });
    const provider = await laceWalletProvider(stub.api);

    await expect(provider.submitTx(await aBoundTx())).rejects.toThrow(/would not submit/);
  });
});
