// An in-memory `PrivateStateProvider` for the browser.
//
// `@midnight-ntwrk/midnight-js-level-private-state-provider` persists to
// disk/IndexedDB via the `level` package and is built for a student running
// many proofs across sessions. publishProof() has no such need: the private
// state proveCredentialPredicate's call needs (`{ studentSk }`) is already
// owned and persisted by lib/midnight/prover.ts's studentSecretKey() under
// its own localStorage key — this provider only has to hand that value
// through the one `callTx` call it is scoped to, then it can be discarded.
//
// Traced in node_modules/@midnight-ntwrk/midnight-js-contracts:
// findDeployedContract calls setContractAddress, then setOrGetInitialSigningKey
// (getSigningKey, and setSigningKey when there is none yet), then get/set for
// the private state itself. The signing key here is the contract's MAINTENANCE
// AUTHORITY — what a later transaction would need to replace a verifier key or
// hand the authority on — not anything used to sign this call. Calling a
// circuit needs it only to exist, which is why a freshly sampled one is fine.
//
// An earlier version left every signing-key method throwing, on the belief
// that publishProof() never reached them. It does, on every call, and the
// throw surfaced to students as "does not implement getSigningKey". Only the
// export/import surface — wallet-grade backup, which this provider has no
// store to back — is still deliberately absent.

import type { PrivateStateProvider } from "@midnight-ntwrk/midnight-js-types";
import type { ContractAddress, SigningKey } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

const unsupported = (method: string) => () => {
  throw new Error(
    `inMemoryPrivateStateProvider does not implement ${method} — publishProof() never calls it.`,
  );
};

/** One call's worth of private state, scoped to a single contract address. */
export function inMemoryPrivateStateProvider<PS>(
  privateStateId: string,
  initialState: PS,
): PrivateStateProvider<string, PS> {
  let contractAddress: string | undefined;
  const store = new Map<string, PS>([[privateStateId, initialState]]);
  const signingKeys = new Map<ContractAddress, SigningKey>();

  return {
    setContractAddress(address) {
      contractAddress = address;
    },
    async get(id) {
      if (!contractAddress) throw new Error("setContractAddress was not called before get().");
      return store.has(id) ? (store.get(id) as PS) : null;
    },
    async set(id, state) {
      if (!contractAddress) throw new Error("setContractAddress was not called before set().");
      store.set(id, state);
    },
    async remove(id) {
      store.delete(id);
    },
    async clear() {
      store.clear();
    },

    async setSigningKey(address, signingKey) {
      signingKeys.set(address, signingKey);
    },
    async getSigningKey(address) {
      // null, not a throw, when there is none: the interface documents null as
      // "no usable value", and setOrGetInitialSigningKey reads it as the cue
      // to sample a fresh key and store it. Throwing here stopped every
      // publish before it began.
      //
      // Deliberately NOT persisted. Keeping a maintenance authority in
      // localStorage would outlive the call that made it and give the page a
      // long-lived key it never uses again; this app only ever calls circuits,
      // and the authority for that is write-once, read-never.
      return signingKeys.get(address) ?? null;
    },
    async removeSigningKey(address) {
      signingKeys.delete(address);
    },
    async clearSigningKeys() {
      signingKeys.clear();
    },

    exportPrivateStates: unsupported("exportPrivateStates"),
    importPrivateStates: unsupported("importPrivateStates"),
    exportSigningKeys: unsupported("exportSigningKeys"),
    importSigningKeys: unsupported("importSigningKeys"),
  } as PrivateStateProvider<string, PS>;
}
