// readTxHeader, and the ledger behaviour the whole design rests on.
//
// The Lace publish path has to know whether the transaction a wallet handed
// back is signed and bound, because the DApp Connector API does not say:
// balanceUnsealedTransaction documents its input exactly and its output only
// as "ready for submission", while submitTransaction requires Binding. Reading
// the self-describing header off the bytes answers it — but only if two things
// hold, so both are asserted here against the real WASM rather than assumed:
//
//   1. a marker mismatch THROWS, and never silently mis-decodes
//   2. bind() on an already-bound transaction is a no-op
//
// If a future ledger release weakens either, these fail and the design gets
// revisited instead of quietly producing wrong transactions.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readTxHeader } from "@/lib/midnight/tx-markers";

const fixtures = JSON.parse(
  readFileSync(new URL("./helpers/browser-providers-fixtures.json", import.meta.url), "utf8"),
);

const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from((hex.match(/../g) ?? []).map((b) => Number.parseInt(b, 16)));

/** Real bytes of the deploy transaction, captured from the preprod indexer. */
const BOUND_TX = hexToBytes(fixtures.staleTxStatus.transactions[0].raw as string);

/**
 * The same real bytes with one marker rewritten in the ASCII header.
 *
 * No PreBinding transaction can be captured from a chain — it only stores
 * settled transactions, which are all bound — and readTxHeader reads nothing
 * but the prefix, so splicing the prefix exercises exactly the branch under
 * test. The body stays real, and is deliberately never handed to the decoder
 * in these cases.
 */
function spliceHeader(bytes: Uint8Array, from: string, to: string): Uint8Array {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 128));
  const spliced = head.replace(from, to);
  const out = new Uint8Array(bytes.byteLength + (spliced.length - head.length));
  for (let i = 0; i < spliced.length; i++) out[i] = spliced.charCodeAt(i);
  out.set(bytes.subarray(128), spliced.length);
  return out;
}

describe("readTxHeader", () => {
  it("reads a real bound transaction as signed and bound", () => {
    const header = readTxHeader(BOUND_TX);
    expect(header).not.toBeNull();
    expect(header?.signature).toBe("signature[v1]");
    expect(header?.proof).toBe("proof");
    expect(header?.binding).toBe("binding");
  });

  it("recognises a pre-binding transaction — the one needing bind()", () => {
    const preBound = spliceHeader(BOUND_TX, "pedersen-schnorr[v1]", "embedded-fr[v1]");
    expect(readTxHeader(preBound)?.binding).toBe("pre-binding");
  });

  it("surfaces an unsigned transaction rather than treating it as ordinary", () => {
    // What a wallet that balanced but never signed would hand back — the case
    // that would otherwise reach the chain and fail there instead of here.
    const unsigned = spliceHeader(BOUND_TX, "signature[v1]", "()");
    const header = readTxHeader(unsigned);
    expect(header?.signature).toBe("()");
    expect(header?.signature).not.toBe("signature[v1]");
  });

  it("returns null for bytes that are not a transaction at all", () => {
    // Real contract-state bytes: same encoding family, different header, and
    // exactly what a confused caller might pass in.
    const contractState = hexToBytes(fixtures.deployState.contractAction.state as string);
    expect(readTxHeader(contractState)).toBeNull();
  });

  it("returns null for empty bytes", () => {
    expect(readTxHeader(new Uint8Array())).toBeNull();
  });
});

describe("the ledger behaviour readTxHeader is relied on to avoid", () => {
  it("throws on a marker mismatch instead of mis-decoding", async () => {
    const { Transaction } = await import("@midnight-ntwrk/ledger-v8");
    type LedgerV8 = typeof import("@midnight-ntwrk/ledger-v8");

    expect(() =>
      Transaction.deserialize<
        InstanceType<LedgerV8["SignatureEnabled"]>,
        InstanceType<LedgerV8["Proof"]>,
        InstanceType<LedgerV8["PreBinding"]>
      >("signature", "proof", "pre-binding", BOUND_TX),
    ).toThrow(/expected header tag/);
  });

  it("treats bind() on an already-bound transaction as a byte-identical no-op", async () => {
    const { Transaction } = await import("@midnight-ntwrk/ledger-v8");
    type LedgerV8 = typeof import("@midnight-ntwrk/ledger-v8");

    const tx = Transaction.deserialize<
      InstanceType<LedgerV8["SignatureEnabled"]>,
      InstanceType<LedgerV8["Proof"]>,
      InstanceType<LedgerV8["Binding"]>
    >("signature", "proof", "binding", BOUND_TX);

    expect(tx.bind().serialize()).toEqual(tx.serialize());
  });
});
