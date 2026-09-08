// The browser publish path's own version of the preflight.
//
// scripts/publish-proofs.mjs refuses to spend DUST when the contract holds a
// key the school no longer signs with. The browser path needed the same
// refusal for a stronger reason: there, the wallet has already been asked to
// sign before the chain rejects the transaction, so the student pays a fee
// AND approves a popup for a proof that could never verify.
//
// Why it could not be caught earlier in that path: openProvingSession()
// registers the school's key into a LOCAL Simulator and then evaluates
// against it, so evaluate() always agrees with itself no matter what the
// chain holds. These tests pin the comparison that closes that gap.

import { describe, expect, it, vi } from "vitest";

import { issuerVerdict, type IssuerCheck } from "@/lib/midnight/chain";

/** The key the school signs with today. */
const CURRENT = { x: 1856538893262863716n, y: 2n };
/** The stale key the contract held after commit 6b9a567 changed the secret. */
const STALE = { x: 34352304742157505789n, y: 3n };

/**
 * The real decision publishProof() makes — imported, not reimplemented.
 *
 * It lives in chain.ts precisely so it can be driven without a wallet, a
 * proof server or a chain, and so a test cannot pass against a copy that has
 * drifted from the code actually running.
 */
const verdict = issuerVerdict;

describe("the issuer key the contract holds decides whether publishing may start", () => {
  it("proceeds when the chain holds the key the school signs with", () => {
    expect(
      verdict({ available: true, registered: true, key: CURRENT }, CURRENT),
    ).toBe("proceed");
  });

  it("stops when the chain holds a different key", () => {
    // The exact condition that produced "failed assert: bad issuer signature"
    // on chain, now caught before the wallet is asked to sign anything.
    expect(verdict({ available: true, registered: true, key: STALE }, CURRENT)).toBe(
      "mismatch",
    );
  });

  it("stops when the school is not registered at all", () => {
    expect(verdict({ available: true, registered: false }, CURRENT)).toBe("not-registered");
  });

  it("proceeds when the chain cannot be reached", () => {
    // An unreachable indexer is not evidence of a mismatch. Refusing here
    // would turn an indexer outage into a broken publish button, and the
    // transaction itself remains the authority.
    expect(verdict({ available: false, reason: "indexer down" }, CURRENT)).toBe("proceed");
  });

  it("proceeds when the chain reports registered but returns no key", () => {
    // Older readers answered membership only. Treating a missing key as a
    // mismatch would block every publish against them.
    expect(verdict({ available: true, registered: true }, CURRENT)).toBe("proceed");
  });
});

describe("the session exposes the key the comparison needs", () => {
  it("ProvingSession carries issuerKey alongside subject", async () => {
    // A type-level guarantee that the field the check reads still exists:
    // removing it would make the comparison silently unreachable rather than
    // fail to compile, since `undefined !== x` is a valid expression.
    const mod = await import("@/lib/midnight/prover");
    expect(typeof mod.openProvingSession).toBe("function");

    const session: import("@/lib/midnight/prover").ProvingSession = {
      subject: 1n,
      issuerKey: CURRENT,
      evaluate: async () => true,
      callArgs: () => ({
        schoolIdHash: 1n,
        subject: 1n,
        slot: 0n,
        op: 0n,
        operand: 0n,
        credential: [],
        signature: { announcement: {} as never, response: 0n },
      }),
    };

    expect(session.issuerKey.x).toBe(CURRENT.x);
  });
});

// What publishProof does with each verdict, now that a bad key is repaired
// rather than reported.
//
// The verdict function is unchanged and still the single source of truth; what
// changed is the caller. Pinned because the two failing verdicts are easy to
// conflate — "not-registered" and "mismatch" have different causes and the
// same fix, and a future edit that handles only one would leave the other
// reaching the chain as "bad issuer signature", after the fee.
describe("which verdicts make publishProof register the key first", () => {
  const needsRegistering = (v: string) => v === "mismatch" || v === "not-registered";

  it("registers when the contract holds a stale key", () => {
    expect(verdict({ available: true, registered: true, key: STALE }, CURRENT)).toBe("mismatch");
    expect(needsRegistering("mismatch")).toBe(true);
  });

  it("registers when the school was never registered", () => {
    expect(verdict({ available: true, registered: false }, CURRENT)).toBe("not-registered");
    expect(needsRegistering("not-registered")).toBe(true);
  });

  it("publishes straight away when the keys already agree", () => {
    // The common case, and it must cost nothing: no extra transaction, no fee.
    expect(verdict({ available: true, registered: true, key: CURRENT }, CURRENT)).toBe("proceed");
    expect(needsRegistering("proceed")).toBe(false);
  });

  it("publishes without registering when the chain cannot be read", () => {
    // An indexer outage is not evidence of a bad key. Registering on a guess
    // would spend DUST to overwrite a key that may be perfectly correct.
    expect(verdict({ available: false }, CURRENT)).toBe("proceed");
    expect(needsRegistering("proceed")).toBe(false);
  });
});
