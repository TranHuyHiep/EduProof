// A `ZKConfigProvider` that fetches circuit assets over HTTP instead of `fs`.
//
// Mirrors @midnight-ntwrk/midnight-js-node-zk-config-provider's file layout
// exactly (keys/<circuitId>.prover, keys/<circuitId>.verifier,
// zkir/<circuitId>.bzkir — confirmed by reading that package's source) so the
// same compiled contract assets serve both the Node scripts and the browser,
// just through app/api/circuit-assets instead of the filesystem.

import { ZKConfigProvider, createProverKey, createVerifierKey, createZKIR } from "@midnight-ntwrk/midnight-js-types";

async function fetchBytes(path: string): Promise<Uint8Array> {
  const response = await fetch(`/api/circuit-assets/${path}`);
  if (!response.ok) throw new Error(`Circuit asset ${path} answered ${response.status}.`);
  return new Uint8Array(await response.arrayBuffer());
}

export class BrowserZkConfigProvider<K extends string> extends ZKConfigProvider<K> {
  async getProverKey(circuitId: K) {
    return createProverKey(await fetchBytes(`keys/${circuitId}.prover`));
  }
  async getVerifierKey(circuitId: K) {
    return createVerifierKey(await fetchBytes(`keys/${circuitId}.verifier`));
  }
  async getZKIR(circuitId: K) {
    return createZKIR(await fetchBytes(`zkir/${circuitId}.bzkir`));
  }
}
