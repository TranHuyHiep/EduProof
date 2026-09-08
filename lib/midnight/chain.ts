// Reading the deployed contract's ledger state.
//
// This is the half of the dual-ledger model that IS public. The circuit runs
// against private witnesses on the student's device; the issuer registry and
// the verification counter live on chain, and anyone can read them without a
// wallet, a key, or permission. That asymmetry is the product, so the app
// should show both halves rather than assert them.
//
// Read-only on purpose. Submitting a transaction costs DUST and takes a block,
// which is the wrong trade for something a verifier does on page load. Writes
// go through scripts/deploy-contract.mjs, which asks first.
//
// Every function here answers "unavailable" rather than throwing when the
// chain cannot be reached: a verifier looking at a proof should still see the
// proof if the indexer is down, with the on-chain part honestly marked absent.

import { midnightConfig } from "./config.ts";

/** What the ledger says, or why it could not be read. */
export interface ChainState {
  available: boolean;
  /** Schools registered on chain. */
  issuerCount?: number;
  /** Predicates this contract has verified since deployment. */
  proofsVerified?: bigint;
  /**
   * The most recent transaction to touch this contract, when the indexer
   * reports one. Carries no per-proof information: it is the contract's own
   * history, identical for every verifier who loads the page.
   */
  txHash?: string;
  /** Set when `available` is false. */
  reason?: string;
}

/** Whether a given school's key is registered on the deployed contract. */
export interface IssuerCheck {
  available: boolean;
  registered?: boolean;
  reason?: string;
  /**
   * The key the contract actually holds, when one is registered.
   *
   * `registered` alone answers a weaker question than it appears to. The
   * registry held a key for this school throughout the period when every
   * proof failed on chain with "bad issuer signature" — it was simply a key
   * from before SCHOOL_SIGNING_KEY was changed. Membership was true; the
   * signature still did not verify. Callers that can obtain the school's
   * current key should compare it against this.
   */
  key?: { x: bigint; y: bigint };
}

/**
 * Whether a publish may proceed, given what the chain holds and what the
 * school signs with.
 *
 * Extracted so the decision can be tested without a wallet, a proof server
 * and a chain — and so the browser path and any script share one rule rather
 * than two that can drift.
 *
 * An unreachable chain returns "proceed" deliberately: an indexer outage is
 * not evidence of a mismatch, and the transaction itself remains the
 * authority. A registered issuer whose key is absent proceeds for the same
 * reason — the reader is allowed not to report one.
 */
export type IssuerVerdict = "proceed" | "not-registered" | "mismatch";

export function issuerVerdict(
  onChain: IssuerCheck,
  signingKey: { x: bigint; y: bigint },
): IssuerVerdict {
  if (!onChain.available) return "proceed";
  if (onChain.registered === false) return "not-registered";
  if (onChain.key && onChain.key.x !== signingKey.x) return "mismatch";
  return "proceed";
}

const NO_CONTRACT = "No contract address is configured.";

/**
 * A contract address is 32 bytes — 64 hex characters, optional `0x`.
 *
 * Checked here because the SDK's own complaint, "Expected an input string with
 * byte length of 32, got 34", names neither the value nor where it came from,
 * and a wrong address is the likeliest thing to be wrong.
 */
function malformed(address: string): string | null {
  const hex = address.startsWith("0x") ? address.slice(2) : address;
  if (!/^[0-9a-f]+$/i.test(hex)) return "NEXT_PUBLIC_CONTRACT_ADDRESS is not hex.";
  if (hex.length !== 64) {
    return `NEXT_PUBLIC_CONTRACT_ADDRESS is ${hex.length} hex characters; a contract address is 64.`;
  }
  return null;
}

async function readLedger() {
  if (!midnightConfig.contractAddress) return { error: NO_CONTRACT } as const;

  const badShape = malformed(midnightConfig.contractAddress);
  if (badShape) return { error: badShape } as const;

  // Queried over plain GraphQL rather than through
  // `indexerPublicDataProvider`, which pulls in a WebSocket client for its
  // subscription API. That client does not survive the browser bundle
  // ("'WebSocket' is not exported from 'isomorphic-ws'"), and a one-off read
  // needs no subscription anyway.
  const response = await fetch(midnightConfig.indexer, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `query ContractState($address: HexEncoded!) {
        contractAction(address: $address) { address state transaction { hash } }
      }`,
      variables: { address: midnightConfig.contractAddress },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    return { error: `The indexer answered ${response.status}.` } as const;
  }

  const body = await response.json();
  if (body?.errors?.length) {
    return { error: `The indexer rejected the query: ${body.errors[0]?.message ?? "unknown"}` } as const;
  }

  const action = body?.data?.contractAction;
  if (!action?.state) {
    // A deploy that has not been indexed yet is indistinguishable from a wrong
    // address, so say neither rather than guess.
    return { error: "The indexer has no contract at this address yet." } as const;
  }

  const [contract, runtime] = await Promise.all([
    import("../../contracts/build/eduproof/contract/index.js"),
    import("@midnight-ntwrk/compact-runtime"),
  ]);

  // The indexer hands back the serialised contract state as hex; the runtime
  // turns it into the typed state the generated `ledger()` reader expects.
  const bytes = Uint8Array.from(
    (action.state.match(/../g) ?? []).map((b: string) => parseInt(b, 16)),
  );

  return {
    ledger: contract.ledger(runtime.ContractState.deserialize(bytes).data),
    // The most recent action on this contract, which for a deployment that has
    // been called is the call rather than the deploy. Optional throughout: the
    // indexer is free to omit it, and a missing link must never look like a
    // failed read.
    txHash: typeof action.transaction?.hash === "string" ? action.transaction.hash : undefined,
  } as const;
}

/**
 * The public state of the deployed contract.
 *
 * `proofsVerified` is a counter the circuit increments, so a non-zero value is
 * evidence the contract has actually been exercised — not merely deployed.
 */
export async function chainState(): Promise<ChainState> {
  try {
    const result = await readLedger();
    if ("error" in result) return { available: false, reason: result.error };

    return {
      available: true,
      issuerCount: Number(result.ledger.issuers.size()),
      proofsVerified: result.ledger.proofsVerified,
      txHash: result.txHash,
    };
  } catch (error) {
    return { available: false, reason: (error as Error)?.message ?? "Could not reach the chain." };
  }
}

/**
 * Whether the chain agrees this school may issue credentials.
 *
 * Wave 1 shipped the issuer list as a JSON file, which meant the app vouched
 * for itself. Asking the ledger is a different claim: the registration is
 * public, and a verifier can check it without trusting this deployment.
 */
export async function issuerRegistered(schoolIdHash: bigint): Promise<IssuerCheck> {
  try {
    const result = await readLedger();
    if ("error" in result) return { available: false, reason: result.error };

    const registered = result.ledger.issuers.member(schoolIdHash);
    if (!registered) return { available: true, registered: false };

    // Returned alongside, so a caller can ask the stronger question: not "is
    // some key registered" but "is it the key this school signs with".
    const pk = result.ledger.issuers.lookup(schoolIdHash);
    return { available: true, registered: true, key: { x: pk.x, y: pk.y } };
  } catch (error) {
    return { available: false, reason: (error as Error)?.message ?? "Could not reach the chain." };
  }
}
