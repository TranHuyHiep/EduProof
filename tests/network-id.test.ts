// The initialisation step every chain-touching path has to perform.
//
// midnight-js keeps the network id in module-level state, and refuses to build
// a transaction without it: "Network ID has not been configured. Call
// setNetworkId() before any wallet or contract operation." Every Node script
// that reaches the chain sets it (scripts/lib/wallet-setup.mjs,
// deploy-contract.mjs, register-dust.mjs). The browser publish path did not,
// and so failed part-way through executing the contract call rather than at
// import time, which is why it took a real wallet to find.
//
// Asserted against the source rather than by running publishProof(), which
// needs a wallet, a proof server and a funded account. What can be checked
// cheaply is that the call exists, uses the shared constant rather than a
// second hardcoded string, and happens before the runtime is first touched —
// and those are exactly the things a later edit could break.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NETWORK } from "@/lib/midnight/config";

const source = readFileSync(
  new URL("../lib/proof/midnight-provider.ts", import.meta.url),
  "utf8",
);

describe("publishProof configures the network before anything else", () => {
  it("calls setNetworkId with the project's network constant", () => {
    // NETWORK, not a literal: a second hardcoded "preprod" is how the app and
    // the wallet end up pointed at different chains — see the note in
    // lib/midnight/config.ts about Preview and Preprod being separate.
    expect(source).toContain("setNetworkId(NETWORK)");
  });

  it("configures it before publishProof opens its proving session", () => {
    // Scoped to publishProof: generateProof calls openProvingSession too, but
    // it runs the circuit in a local Simulator and never builds a transaction,
    // so it needs no network id — comparing against its call would compare
    // against the wrong one.
    const publishProof = source.slice(source.indexOf("async publishProof("));
    const configured = publishProof.indexOf("setNetworkId(NETWORK)");
    const firstRuntimeUse = publishProof.indexOf("await openProvingSession(student)");

    expect(configured).toBeGreaterThan(-1);
    expect(firstRuntimeUse).toBeGreaterThan(-1);
    expect(configured).toBeLessThan(firstRuntimeUse);
  });

  it("targets preprod, the chain the deployed contract lives on", () => {
    expect(NETWORK).toBe("preprod");
  });
});
