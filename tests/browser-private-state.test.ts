// The private state provider publishProof() hands to findDeployedContract.
//
// Third instance of one mistake: a method was stubbed to throw on the belief
// that "publishProof() never calls it", and the SDK called it on every publish.
// The first was watchForDeployTxData, the second queryDeployContractState,
// this one getSigningKey — which reached students as
// "inMemoryPrivateStateProvider does not implement getSigningKey".
//
// The full set findDeployedContract touches was read straight out of
// node_modules/@midnight-ntwrk/midnight-js-contracts rather than guessed:
// setContractAddress, getSigningKey, setSigningKey, get, set. All five are
// asserted here, so a future stub cannot quietly reintroduce the same failure.
import { describe, expect, it } from "vitest";
import { inMemoryPrivateStateProvider } from "@/lib/midnight/browser-private-state";

const ADDRESS = "89975419a1a887b6f4d74d91e4c857ff3256c966f2c4fb77775e4524f8a0b729";
const STATE_ID = "eduproof-publish";

interface StudentState {
  studentSk: bigint;
}

const newProvider = () =>
  inMemoryPrivateStateProvider<StudentState>(STATE_ID, { studentSk: 0n });

describe("the signing key findDeployedContract asks for", () => {
  it("answers null rather than throwing when no key is stored yet", async () => {
    // setOrGetInitialSigningKey reads null as "sample a fresh one and store
    // it". Throwing here stopped every publish before it began.
    const provider = newProvider();
    provider.setContractAddress(ADDRESS);

    await expect(provider.getSigningKey(ADDRESS)).resolves.toBeNull();
  });

  it("returns a key that was stored, so a second call reuses the first", async () => {
    const provider = newProvider();
    provider.setContractAddress(ADDRESS);

    // The shape SDK's sampleSigningKey() produces is opaque to this provider —
    // it only has to hand back what it was given.
    const key = "0123456789abcdef" as never;
    await provider.setSigningKey(ADDRESS, key);

    await expect(provider.getSigningKey(ADDRESS)).resolves.toBe(key);
  });

  it("keeps keys apart by contract address", async () => {
    const other = "0".repeat(64);
    const provider = newProvider();
    provider.setContractAddress(ADDRESS);

    await provider.setSigningKey(ADDRESS, "for-eduproof" as never);

    await expect(provider.getSigningKey(other)).resolves.toBeNull();
  });

  it("forgets a removed key", async () => {
    const provider = newProvider();
    provider.setContractAddress(ADDRESS);
    await provider.setSigningKey(ADDRESS, "temporary" as never);

    await provider.removeSigningKey(ADDRESS);

    await expect(provider.getSigningKey(ADDRESS)).resolves.toBeNull();
  });

  it("forgets every key when cleared", async () => {
    const provider = newProvider();
    provider.setContractAddress(ADDRESS);
    await provider.setSigningKey(ADDRESS, "temporary" as never);

    await provider.clearSigningKeys();

    await expect(provider.getSigningKey(ADDRESS)).resolves.toBeNull();
  });
});

describe("the private state the circuit reads", () => {
  it("hands back the state it was constructed with", async () => {
    const provider = newProvider();
    provider.setContractAddress(ADDRESS);

    await expect(provider.get(STATE_ID)).resolves.toEqual({ studentSk: 0n });
  });

  it("stores an updated state", async () => {
    const provider = newProvider();
    provider.setContractAddress(ADDRESS);

    await provider.set(STATE_ID, { studentSk: 42n });

    await expect(provider.get(STATE_ID)).resolves.toEqual({ studentSk: 42n });
  });

  it("refuses to read before the contract address is known", async () => {
    // Ordering the SDK guarantees; a violation means the caller built the
    // provider chain wrong, and silence would hide it.
    const provider = newProvider();

    await expect(provider.get(STATE_ID)).rejects.toThrow(/setContractAddress/);
  });
});
