// The ProofStore contract.
//
// Written against the interface rather than the class on purpose. Wave 2 adds
// a chain-backed store and a deployment may add Postgres; whatever implements
// ProofStore has to satisfy exactly this, or the pages built on it will break
// in ways that only show up at runtime.

import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorageProofStore } from "@/lib/proof/store/local-store";
import type { ProofStore } from "@/lib/proof/store/types";
import type { Proof } from "@/types";
import { installMemoryLocalStorage } from "./helpers/local-storage";

const ALICE_WALLET = "addr_alice";
const BOB_WALLET = "addr_bob";

function makeProof(overrides: Partial<Proof> = {}): Proof {
  return {
    proofId: "pf_000000000001",
    version: "1",
    provider: "mock",
    issuer: {
      schoolId: "hanoi-university",
      schoolName: "Hanoi University",
      keyId: "hu-issuer-key-01",
      verified: true,
    },
    subject: "sub_0000000000000001",
    owner: ALICE_WALLET,
    claims: [{
      attribute: "status",
      operator: "==",
      operand: "active",
      satisfied: true,
      statement: "status == active",
      label: "student status is active",
    }],
    withheldAttributes: ["status"],
    createdAt: "2026-08-01T10:00:00.000Z",
    expiresAt: "2027-06-30T00:00:00.000Z",
    payload: "mock_deadbeef",
    ...overrides,
  };
}

let store: ProofStore;

beforeEach(() => {
  installMemoryLocalStorage();
  store = new LocalStorageProofStore();
});

describe("save and read", () => {
  it("returns a saved proof unchanged", async () => {
    const proof = makeProof();
    await store.save(proof);
    expect(await store.read(proof.proofId)).toEqual(proof);
  });

  it("returns null for an unknown id rather than throwing", async () => {
    // The verify page depends on this: a mistyped reference is an ordinary
    // outcome to render, not an exception to catch.
    expect(await store.read("pf_missing")).toBeNull();
  });

  it("overwrites a proof saved under the same id", async () => {
    await store.save(makeProof({ payload: "mock_first" }));
    await store.save(makeProof({ payload: "mock_second" }));
    expect((await store.read("pf_000000000001"))?.payload).toBe("mock_second");
    expect(await store.list()).toHaveLength(1);
  });
});

describe("listBySubject", () => {
  it("returns only the proofs belonging to that wallet", async () => {
    await store.save(makeProof({ proofId: "pf_a", owner: ALICE_WALLET }));
    await store.save(makeProof({ proofId: "pf_b", owner: BOB_WALLET }));

    const mine = await store.listBySubject(ALICE_WALLET);
    expect(mine.map((p) => p.proofId)).toEqual(["pf_a"]);
  });

  it("orders newest first", async () => {
    await store.save(makeProof({ proofId: "pf_old", createdAt: "2026-08-01T00:00:00.000Z" }));
    await store.save(makeProof({ proofId: "pf_new", createdAt: "2026-08-20T00:00:00.000Z" }));
    await store.save(makeProof({ proofId: "pf_mid", createdAt: "2026-08-10T00:00:00.000Z" }));

    const listed = await store.listBySubject(ALICE_WALLET);
    expect(listed.map((p) => p.proofId)).toEqual(["pf_new", "pf_mid", "pf_old"]);
  });

  it("returns an empty array, not null, when the wallet has none", async () => {
    // The proofs page distinguishes "still loading" from "nothing here", so an
    // empty result must be an array.
    expect(await store.listBySubject("addr_nobody")).toEqual([]);
  });

  it("keys on owner rather than on the opaque subject handle", async () => {
    // `subject` is regenerated per proof, so it cannot identify a student.
    await store.save(makeProof({ proofId: "pf_a", subject: "sub_1111", owner: ALICE_WALLET }));
    await store.save(makeProof({ proofId: "pf_b", subject: "sub_2222", owner: ALICE_WALLET }));
    expect(await store.listBySubject(ALICE_WALLET)).toHaveLength(2);
    expect(await store.listBySubject("sub_1111")).toHaveLength(0);
  });
});

describe("list", () => {
  it("returns every proof on the device, newest first", async () => {
    await store.save(makeProof({ proofId: "pf_a", owner: ALICE_WALLET, createdAt: "2026-08-01T00:00:00.000Z" }));
    await store.save(makeProof({ proofId: "pf_b", owner: BOB_WALLET, createdAt: "2026-08-02T00:00:00.000Z" }));
    expect((await store.list()).map((p) => p.proofId)).toEqual(["pf_b", "pf_a"]);
  });

  it("starts empty", async () => {
    expect(await store.list()).toEqual([]);
  });
});

describe("remove", () => {
  it("makes a proof unreadable afterwards", async () => {
    await store.save(makeProof({ proofId: "pf_a" }));
    await store.remove("pf_a");
    expect(await store.read("pf_a")).toBeNull();
  });

  it("leaves other proofs untouched", async () => {
    await store.save(makeProof({ proofId: "pf_a" }));
    await store.save(makeProof({ proofId: "pf_b" }));
    await store.remove("pf_a");
    expect((await store.list()).map((p) => p.proofId)).toEqual(["pf_b"]);
  });

  it("ignores an unknown id", async () => {
    await expect(store.remove("pf_missing")).resolves.toBeUndefined();
  });
});

describe("resilience", () => {
  it("treats corrupt storage as empty instead of throwing", async () => {
    // Better a student sees no proofs than a blank page: the pages calling this
    // have no meaningful way to recover from a parse error.
    const storage = installMemoryLocalStorage();
    storage.setItem("eduproof.proofs.v1", "{not json");
    const fresh = new LocalStorageProofStore();

    expect(await fresh.list()).toEqual([]);
    expect(await fresh.read("pf_a")).toBeNull();
  });

  it("survives a write into corrupt storage", async () => {
    const storage = installMemoryLocalStorage();
    storage.setItem("eduproof.proofs.v1", "{not json");
    const fresh = new LocalStorageProofStore();

    await fresh.save(makeProof({ proofId: "pf_a" }));
    expect((await fresh.list()).map((p) => p.proofId)).toEqual(["pf_a"]);
  });
});

describe("the interface stays async", () => {
  // Wave 2 reads from chain and a deployment may use Postgres — both async.
  // If someone "simplifies" these to synchronous returns, every call site
  // breaks later, so pin the promise-returning shape here.
  it("returns promises from every method", () => {
    expect(store.save(makeProof())).toBeInstanceOf(Promise);
    expect(store.read("pf_a")).toBeInstanceOf(Promise);
    expect(store.listBySubject(ALICE_WALLET)).toBeInstanceOf(Promise);
    expect(store.list()).toBeInstanceOf(Promise);
    expect(store.remove("pf_a")).toBeInstanceOf(Promise);
  });
});
