// Generates the school's Ed25519 issuer keypair.
//
//   npm run school:genkey
//
// Put the private key in .env.local as SCHOOL_SIGNING_KEY, and the public key
// in data/schools.json as issuerPublicKey. Verifiers read the public key from
// there — never from the credential itself, which would prove nothing.

import { generateKeyPairSync, createPublicKey } from "node:crypto";

const { privateKey } = generateKeyPairSync("ed25519");

const priv = privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
const pub = createPublicKey(privateKey).export({ format: "der", type: "spki" }).toString("base64");

console.log("\n# Add to .env.local (keep secret):");
console.log(`SCHOOL_SIGNING_KEY=${priv}`);
console.log("\n# Add to data/schools.json as issuerPublicKey (public):");
console.log(pub);
console.log();
