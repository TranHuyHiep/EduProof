// Checks that a deployed contract address is real, and that the app reflects it.
//
// Run after `npm run contract:deploy` succeeds:
//   node scripts/verify-deployment.mjs
//
// The deploy script printing an address is not proof of anything: it prints
// what the SDK returned, and the SDK returns what it built locally. This asks
// the indexer whether the chain actually has a contract there, which is a
// different question and the one that matters.

import { readFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* the checks below name what is missing */
  }
}

const pass = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => {
  console.log(`  ✗ ${m}`);
  process.exitCode = 1;
};

async function main() {
  loadEnvLocal();

  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
  const provider = process.env.NEXT_PUBLIC_PROOF_PROVIDER ?? "";

  console.log("\nDeployment\n");

  if (!address) {
    fail("NEXT_PUBLIC_CONTRACT_ADDRESS is empty — nothing to verify.");
    return;
  }
  pass(`address ${address}`);

  // Both are needed. With the address alone the app still runs the mock, so
  // the contract is on chain and invisible — the easy mistake.
  if (provider === "midnight") pass("NEXT_PUBLIC_PROOF_PROVIDER=midnight");
  else fail(`NEXT_PUBLIC_PROOF_PROVIDER is "${provider}" — the app still runs the mock.`);

  const { midnightConfig, explorerContractUrl } = await import("../lib/midnight/config.ts");

  console.log("\nOn chain\n");

  // The indexer is the authority here, not the deploy script's own output.
  const query = `{"query":"{ contractAction(address: \\"${address}\\") { __typename address } }"}`;
  try {
    const res = await fetch(midnightConfig.indexer, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: query,
      signal: AbortSignal.timeout(20000),
    });
    const json = await res.json();
    const action = json?.data?.contractAction;

    if (action?.address) {
      pass(`indexer confirms a contract at this address (${action.__typename})`);
    } else if (json?.errors) {
      fail(`indexer rejected the query: ${JSON.stringify(json.errors).slice(0, 200)}`);
    } else {
      // Deploy submitted but not yet indexed looks exactly like this.
      fail("indexer has no contract at this address — it may still be indexing.");
    }
  } catch (error) {
    fail(`could not reach the indexer: ${error?.message ?? error}`);
  }

  console.log(`\n  explorer  ${explorerContractUrl()}\n`);

  await checkDocLinks();
}

/**
 * Opens every explorer link the docs advertise.
 *
 * Worth its own check because a stale link is invisible from the inside: the
 * deploy succeeded, the indexer agrees, `contract:verify` passes, and the doc
 * still points at a transaction from a superseded deploy. The only symptom is
 * a judge clicking through to a 404.
 *
 * That has already happened once — docs/10-wave-1-plan.md kept the tx id of an
 * earlier deploy, 66 hex characters where a real one is 64.
 */
async function checkDocLinks() {
  const files = ["README.md", "docs/10-wave-1-plan.md", "docs/11-wave-1-features.md", "docs/13-acceptance.md"];
  const links = new Map();

  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue; // A doc that does not exist advertises nothing.
    }
    for (const [url] of text.matchAll(/https:\/\/preprod\.midnightexplorer\.com\/\S*?(?=[)\s,]|$)/g)) {
      if (!links.has(url)) links.set(url, file);
    }
  }

  if (links.size === 0) return;

  console.log("Explorer links in docs\n");

  for (const [url, file] of links) {
    // Length before network: an id of the wrong size is malformed regardless
    // of what the explorer happens to answer today.
    const id = url.split("/").pop().replace(/^0x/, "");
    if (!/^[0-9a-f]{64}$/i.test(id)) {
      fail(`${file} — id is ${id.length} hex characters, expected 64: ${url}`);
      continue;
    }

    try {
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20000) });
      if (res.ok) pass(`${file} — ${res.status} ${short(url)}`);
      else fail(`${file} — ${res.status} ${url}`);
    } catch (error) {
      // A network failure is not a broken link; say so rather than failing.
      console.log(`  ? ${file} — could not reach the explorer (${error?.message ?? error})`);
    }
  }

  console.log("");
}

/** Explorer URLs are mostly a 64-character id; show enough to tell them apart. */
function short(url) {
  return url.replace(/(0x[0-9a-f]{8})[0-9a-f]+/i, "$1\u2026");
}

main().catch((error) => {
  console.error(`\n✗ ${error?.message ?? error}\n`);
  process.exit(1);
});
