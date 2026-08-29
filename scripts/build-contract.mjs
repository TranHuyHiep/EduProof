// Compiles the Compact contract and commits the artifacts.
//
// Run: npm run contract:build
//
// The output is checked into the repository on purpose. Compiling on Vercel
// would need the Compact toolchain in the build image and would run against
// the free tier's time limit; shipping the artifacts means a deploy is just a
// Next.js build. See docs/deployment.md.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "contracts/src/eduproof.compact";
const OUT = "contracts/build/eduproof";

// The toolchain version is pinned, and the pin matters more than it looks.
//
// Preprod runs ledger 8, which means compact-runtime 0.16.0, which means
// toolchain 0.31.1 — the version the official support matrix names. Building
// with 0.34.0 instead produces artifacts asserting checkRuntimeVersion(0.19.0),
// whose runtime pulls onchain-runtime-v4 (ledger 9). Those artifacts load
// without complaint and fail only when a transaction is assembled, after fees
// have been spent. See docs/lessons.md.
const TOOLCHAIN = "0.31.1";

// The toolchain is installed per-user rather than as a dependency, so it is
// not on PATH under npm. Point at it directly and say so if it is missing.
const COMPACT = join(process.env.HOME ?? "", ".local/bin/compact");

if (!existsSync(COMPACT)) {
  console.error(
    "compact not found at ~/.local/bin/compact.\n" +
      `Install the Compact toolchain, then: compact update ${TOOLCHAIN}\n` +
      "See https://docs.midnight.network/"
  );
  process.exit(1);
}

console.log(`compiling ${SOURCE} -> ${OUT}  (toolchain ${TOOLCHAIN}, ledger 8)`);
execFileSync(COMPACT, ["compile", `+${TOOLCHAIN}`, SOURCE, OUT], { stdio: "inherit" });

// The compiler's source map also names the Compact standard library, which the
// toolchain does not distribute — tools that read the map warn about the
// missing files. Left alone deliberately: the `mappings` field indexes into
// `sources` by position, so removing entries silently corrupts the map.

console.log("done");
