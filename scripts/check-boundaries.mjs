// Enforces the architectural boundaries that the privacy story depends on.
//
// Run: npm run check:boundaries
//
// These are not style rules. Each one, if broken, would make a claim we make
// about the system untrue.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const RULES = [
  {
    // The school is a separate vendor. Hosting its endpoint inside this app is
    // a deployment convenience; letting it depend on EduProof's proof system
    // would make the separation fiction.
    name: "app/api/school must not import lib/proof",
    dir: "app/api/school",
    forbid: /^\s*import\s[^;]*from\s+["'](?:@\/)?(?:\.\.\/)*lib\/proof/m,
  },
  {
    name: "lib/school must not import lib/proof",
    dir: "lib/school",
    forbid: /^\s*import\s[^;]*from\s+["'](?:@\/)?(?:\.\.\/)*lib\/proof/m,
  },
  {
    // Student records belong to the school and reach the browser from the
    // school's API. A bundled copy here would be a second source of truth.
    name: "lib/data.ts must not read students.json",
    dir: "lib/data.ts",
    forbid: /students\.json/,
  },
  {
    // The UI must resolve providers through lib/proof/index, so swapping the
    // mock for Midnight stays a one-line change.
    name: "app must not import mock-provider directly",
    dir: "app",
    forbid: /from\s+["'][^"']*mock-provider["']/,
  },
];

function files(path) {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((e) =>
    e.name === "node_modules" ? [] : files(join(path, e.name))
  );
}

let failed = 0;
for (const rule of RULES) {
  const offenders = files(rule.dir).filter(
    (f) => /\.(ts|tsx|mjs|js)$/.test(f) && rule.forbid.test(readFileSync(f, "utf8"))
  );
  if (offenders.length) {
    failed++;
    console.error(`✗ ${rule.name}`);
    offenders.forEach((f) => console.error(`    ${f}`));
  } else {
    console.log(`✓ ${rule.name}`);
  }
}

if (failed) {
  console.error(`\n${failed} boundary rule(s) violated.`);
  process.exit(1);
}
console.log("\nAll boundaries hold.");
