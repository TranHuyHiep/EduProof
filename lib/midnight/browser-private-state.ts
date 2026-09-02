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
// Traced in node_modules/@midnight-ntwrk/midnight-js-contracts: `callTx`
// only ever calls setContractAddress/get/set on this interface. The
// export/import/signing-key surface exists for wallet-grade persistence and
// is intentionally NOT implemented here — see browser-providers.ts for the
// same pattern.

import type { PrivateStateProvider } from "@midnight-ntwrk/midnight-js-types";

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
    setSigningKey: unsupported("setSigningKey"),
    getSigningKey: unsupported("getSigningKey"),
    removeSigningKey: unsupported("removeSigningKey"),
    clearSigningKeys: unsupported("clearSigningKeys"),
    exportPrivateStates: unsupported("exportPrivateStates"),
    importPrivateStates: unsupported("importPrivateStates"),
    exportSigningKeys: unsupported("exportSigningKeys"),
    importSigningKeys: unsupported("importSigningKeys"),
  } as PrivateStateProvider<string, PS>;
}
