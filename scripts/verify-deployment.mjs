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
}

main().catch((error) => {
  console.error(`\n✗ ${error?.message ?? error}\n`);
  process.exit(1);
});
