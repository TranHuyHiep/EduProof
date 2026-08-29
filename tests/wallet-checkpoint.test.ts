// The dust sync checkpoint, and the three ways it is allowed to be useless.
//
// A checkpoint turns a two-and-a-half hour cold sync into catching up from the
// last saved block. That makes it worth having, and also makes it dangerous:
// a checkpoint that is quietly wrong produces a wallet that syncs happily and
// is wrong about its own money.
//
// So the rule is one-directional — a bad checkpoint may cost time, never
// correctness. Every case below is a way of being bad, and every one of them
// must end in "ignore it and sync from scratch".
//
// The version check earns its own test because it nearly shipped inverted:
// the version lookup returned "unknown", every checkpoint mismatched, and
// the feature silently did nothing while looking exactly like "no checkpoint
// yet".

import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  checkpointPath,
  progressIsSane,
  readCheckpoint,
} from "../scripts/lib/wallet-restore.mjs";

const SEED = "ab".repeat(32);

/** The version currently installed — what a good checkpoint must claim. */
function installedDustVersion(): string {
  const pkg = `${process.cwd()}/node_modules/@midnight-ntwrk/wallet-sdk-dust-wallet/package.json`;
  return JSON.parse(require("node:fs").readFileSync(pkg, "utf8")).version;
}

function write(contents: string) {
  const path = checkpointPath(SEED);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
  return path;
}

afterEach(() => {
  rmSync(".wallet-state", { recursive: true, force: true });
});

describe("reading a checkpoint", () => {
  it("loads one written by the installed version", async () => {
    write(
      JSON.stringify({
        savedAt: new Date().toISOString(),
        dustWalletVersion: installedDustVersion(),
        state: "serialized-state",
      }),
    );

    const checkpoint = await readCheckpoint(SEED);
    expect(checkpoint?.state).toBe("serialized-state");
  });

  it("ignores one written by a different version", async () => {
    // The format carries an internal protocolVersion but Midnight documents no
    // cross-version compatibility, so a mismatch is not worth the risk.
    write(
      JSON.stringify({
        savedAt: new Date().toISOString(),
        dustWalletVersion: "999.0.0",
        state: "serialized-state",
      }),
    );

    expect(await readCheckpoint(SEED)).toBeNull();
  });

  it("ignores a file that is not JSON", async () => {
    write("{ this is not json");
    expect(await readCheckpoint(SEED)).toBeNull();
  });

  it("ignores a file with no state in it", async () => {
    write(JSON.stringify({ savedAt: new Date().toISOString() }));
    expect(await readCheckpoint(SEED)).toBeNull();
  });

  it("returns null when there is no checkpoint at all", async () => {
    expect(await readCheckpoint(SEED)).toBeNull();
  });

  it("keys the file by seed, so two wallets cannot collide", () => {
    expect(checkpointPath("aa".repeat(32))).not.toBe(checkpointPath("bb".repeat(32)));
  });

  it("keeps the seed out of the filename", () => {
    // The path ends up in logs and screenshots.
    const seed = "cafe".repeat(16);
    expect(checkpointPath(seed)).not.toContain(seed);
  });
});

describe("sanity-checking a restored wallet", () => {
  it("accepts a wallet that is behind the chain", () => {
    // The normal case: restored, and catching up.
    expect(progressIsSane({ appliedIndex: 100n, highestRelevantWalletIndex: 200n })).toBe(true);
  });

  it("accepts a wallet that is exactly caught up", () => {
    expect(progressIsSane({ appliedIndex: 200n, highestRelevantWalletIndex: 200n })).toBe(true);
  });

  it("rejects a wallet claiming blocks the chain does not have", () => {
    // What restoring another network's state looks like — or a chain reset.
    // Midnight's own testkit makes the same comparison and syncs cold.
    expect(progressIsSane({ appliedIndex: 999n, highestRelevantWalletIndex: 200n })).toBe(false);
  });

  it("rejects missing progress rather than assuming the best", () => {
    expect(progressIsSane(undefined)).toBe(false);
    expect(progressIsSane(null)).toBe(false);
  });
});
