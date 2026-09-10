// Asking the wallet for signing permission before a publish needs it.
//
// The DApp Connector API's `hintUsage` is documented as a wallet's opportunity
// to "ask user for permissions and in such case - resolve the promise only
// after the user has granted the permissions". This app never called it: the
// connection was stored as the narrower WalletConnectedAPI, which does not
// carry the method — and a real Lace wallet then produced no signing prompt
// and no transaction. These lock in that it is called, once, at connect time,
// and that the two wallets which cannot answer it are handled differently: one
// that lacks it entirely still connects, one that refuses does not.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import { connectWallet } from "@/lib/wallet";

interface WalletStub {
  hinted: Array<Array<string>>;
  calls: string[];
}

/**
 * Installs one wallet under `window.midnight`, as an extension would.
 *
 * `hintUsage` is omitted entirely when `withHint` is false — not stubbed as a
 * no-op — because the case being modelled is an older wallet where the method
 * does not exist at all.
 */
function installWallet(
  options: { withHint?: boolean; hintError?: Error } = {},
): WalletStub {
  const { withHint = true, hintError } = options;
  const stub: WalletStub = { hinted: [], calls: [] };

  const connected = {
    getUnshieldedAddress: async () => {
      stub.calls.push("getUnshieldedAddress");
      return { unshieldedAddress: "mn_addr_preprod1test" };
    },
    ...(withHint
      ? {
          hintUsage: async (methods: Array<string>) => {
            stub.calls.push("hintUsage");
            stub.hinted.push(methods);
            if (hintError) throw hintError;
          },
        }
      : {}),
  } as unknown as ConnectedAPI;

  const api = {
    name: "Test Wallet",
    rdns: "test.wallet",
    apiVersion: "4.0.0",
    connect: async () => {
      stub.calls.push("connect");
      return connected;
    },
  } as unknown as InitialAPI;

  vi.stubGlobal("window", { midnight: { test: api } });
  return stub;
}

// Only `window` is put back, and only after this file's own tests. An
// unstubAllGlobals here would also drop the `fetch` other suites install,
// which made the run order matter and the suite flaky.
afterEach(() => {
  vi.stubGlobal("window", undefined);
});

describe("connecting a wallet asks for signing permission", () => {
  it("hints the methods a publish will use, exactly once", async () => {
    const stub = installWallet();
    await connectWallet();

    expect(stub.hinted).toHaveLength(1);
    expect(stub.hinted[0]).toContain("balanceUnsealedTransaction");
    expect(stub.hinted[0]).toContain("submitTransaction");
  });

  it("hints before the connection is handed out, not when a publish needs it", async () => {
    // Publishing runs once per claim, so a hint deferred to publish time would
    // re-prompt per claim, mid-spinner.
    const stub = installWallet();
    const connection = await connectWallet();

    expect(stub.calls).toContain("hintUsage");
    expect(connection.api).toBeDefined();
  });

  it("connects a wallet too old to have the method at all", async () => {
    const stub = installWallet({ withHint: false });
    const connection = await connectWallet();

    expect(connection.address).toBe("mn_addr_preprod1test");
    expect(stub.hinted).toHaveLength(0);
  });

  it("refuses to hand out a connection whose permission was declined", async () => {
    // Saying so here beats failing later with something about binding.
    installWallet({ hintError: new Error("User rejected the request") });

    await expect(connectWallet()).rejects.toThrow(/declined permission/);
  });
});
