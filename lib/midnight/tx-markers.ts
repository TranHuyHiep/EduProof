// What Midnight's serialized transaction bytes say about themselves.
//
// A serialized Transaction is prefixed with a literal ASCII header naming the
// three type markers it was serialized under, e.g.
//   midnight:transaction[v9](signature[v1],proof,pedersen-schnorr[v1]):
//
// ledger-v8's Transaction.deserialize compares that prefix against the markers
// it was ASKED for and throws "expected header tag '<x>', got '<y>'" on any
// mismatch — verified by running the real WASM against the real captured
// transaction bytes in tests/helpers/browser-providers-fixtures.json. It never
// silently mis-decodes.
//
// That makes the prefix an authoritative, side-effect-free way to ask a blob
// "are you signed, and are you bound yet?" — which the DApp Connector API
// itself never answers. `balanceUnsealedTransaction` documents its INPUT
// exactly (Transaction<SignatureEnabled, Proof, PreBinding>) but says only
// "a transaction ready for submission" about what comes back, while
// `submitTransaction` requires Binding. Reading the tag closes that
// documented gap with a fact instead of an assumption.

/** How far in the header can run, so a junk blob is not scanned to its end. */
const MAX_HEADER_BYTES = 128;

/** The binding markers, keyed by the tag ledger-v8 writes for each. */
const BINDING_TAG = {
  "pedersen-schnorr[v1]": "binding",
  "embedded-fr[v1]": "pre-binding",
} as const;

export type BindingMarker = (typeof BINDING_TAG)[keyof typeof BINDING_TAG];

/** The signature marker of a transaction the wallet has actually signed. */
export const SIGNED_MARKER = "signature[v1]";

export interface TxHeader {
  /** The whole tag, verbatim, so an error can quote what was actually seen. */
  tag: string;
  signature: string;
  proof: string;
  /** Null when the binding marker is one this app has no handling for. */
  binding: BindingMarker | null;
}

/**
 * Reads the self-describing header off serialized transaction bytes.
 *
 * Returns null when the bytes do not begin with a Midnight transaction header
 * at all. That is diagnostic rather than exceptional: it means whatever
 * produced them returned something that is not a transaction, and the caller
 * should say so rather than hand the bytes to WASM.
 */
export function readTxHeader(raw: Uint8Array): TxHeader | null {
  // latin1, not utf-8: the header is ASCII but the binary that follows is not
  // valid UTF-8, so a UTF-8 decoder would insert replacement characters part
  // way through the window and could corrupt the tail of the tag.
  const ascii = new TextDecoder("latin1").decode(raw.subarray(0, MAX_HEADER_BYTES));
  const match = /^midnight:transaction\[v\d+\]\(([^,]*),([^,]*),([^)]*)\):/.exec(ascii);
  if (!match) return null;

  const [tag, signature, proof, binding] = match;
  return {
    tag,
    signature,
    proof,
    binding: BINDING_TAG[binding as keyof typeof BINDING_TAG] ?? null,
  };
}
