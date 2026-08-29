// Checks that no secret has ever entered git history.
//
// Run before making the repository public:
//   npm run check:secrets
//
// A .gitignore only stops the NEXT commit. Anything committed before the
// ignore rule existed is still in history and still reachable by anyone who
// clones — so the question is not "is the file ignored" but "was it ever
// committed". This asks the second question.
//
// Reads the live values from .env.local and searches every commit for each
// one. The values are never printed: a script that prints a seed to prove the
// seed is not exposed would be its own leak.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const SECRETS = [
  "MIDNIGHT_WALLET_SEED",
  "MIDNIGHT_PRIVATE_STATE_PASSWORD",
  "SCHOOL_SIGNING_KEY",
];

/** Paths that must never be tracked, whatever they contain. */
const MUST_BE_IGNORED = [".env.local", ".wallet-state", "midnight-level-db"];

function loadEnvLocal() {
  const values = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m) values[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* reported below */
  }
  return values;
}

function committedAnywhere(value) {
  try {
    const out = execFileSync("git", ["log", "--all", "-S", value, "--oneline"], {
      encoding: "utf8",
    });
    return out.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function isTracked(path) {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", path], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

let failed = false;
const env = loadEnvLocal();

console.log("\nSecrets in git history\n");

for (const name of SECRETS) {
  const value = (env[name] ?? "").trim();
  if (value.length < 8) {
    console.log(`  – ${name}: not set locally, nothing to check`);
    continue;
  }

  // Search for the raw value and, for a mnemonic, the hex seed it derives to —
  // a script could have written either form.
  const forms = [value];
  if (value.split(/\s+/).length >= 12) {
    const { mnemonicToSeedSync } = await import("@scure/bip39");
    forms.push(Buffer.from(mnemonicToSeedSync(value)).toString("hex"));
  }

  const hits = forms.flatMap(committedAnywhere);
  if (hits.length > 0) {
    console.log(`  ✗ ${name}: found in ${hits.length} commit(s)`);
    console.log(`      ${hits.slice(0, 3).join("\n      ")}`);
    failed = true;
  } else {
    console.log(`  ✓ ${name}: never committed`);
  }
}

console.log("\nPaths that must stay untracked\n");

for (const path of MUST_BE_IGNORED) {
  if (isTracked(path)) {
    console.log(`  ✗ ${path} is tracked by git`);
    failed = true;
  } else {
    console.log(`  ✓ ${path}`);
  }
}

if (failed) {
  console.error(
    "\n✗ Something private is in the repository.\n" +
      "  Rotate whatever leaked before doing anything else — an ignore rule\n" +
      "  does not remove it from history, and a public repo is permanent.\n",
  );
  process.exit(1);
}

console.log("\n✓ Nothing private found. Safe to publish.\n");
