// The school's issuer keypair.
//
// The key MUST be stable across restarts. A verifier checks a signature against
// a public key it learned independently — from the registry in Wave 1, from the
// on-chain issuer registry in Wave 2. A key regenerated at boot would invalidate
// every credential already issued, and on serverless it would differ per request.
//
// So: read from SCHOOL_SIGNING_KEY. Generate one with `npm run school:genkey`.

import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as signBytes,
  type KeyObject,
} from "node:crypto";

let cached: { privateKey: KeyObject; publicKey: string } | null = null;

/** Base64 of the SPKI DER — how the public key travels and how it is compared. */
function encodePublicKey(key: KeyObject): string {
  return key.export({ format: "der", type: "spki" }).toString("base64");
}

function load(): { privateKey: KeyObject; publicKey: string } {
  const configured = process.env.SCHOOL_SIGNING_KEY;

  if (configured) {
    const privateKey = createPrivateKey({
      key: Buffer.from(configured, "base64"),
      format: "der",
      type: "pkcs8",
    });
    return { privateKey, publicKey: encodePublicKey(createPublicKey(privateKey)) };
  }

  // No key configured. Generating one keeps `npm run dev` working out of the
  // box, but it is only valid for this process — say so loudly, because the
  // symptom otherwise (signatures that verify locally and fail in production)
  // is miserable to debug.
  console.warn(
    "[school] SCHOOL_SIGNING_KEY is not set — generating an ephemeral key.\n" +
      "[school] Credentials issued now will NOT verify after a restart.\n" +
      "[school] Run `npm run school:genkey` and set SCHOOL_SIGNING_KEY."
  );

  const { privateKey } = generateKeyPairSync("ed25519");
  return { privateKey, publicKey: encodePublicKey(createPublicKey(privateKey)) };
}

function keys() {
  if (!cached) cached = load();
  return cached;
}

/** Base64 SPKI. Published in the school profile so verifiers can check signatures. */
export function issuerPublicKey(): string {
  return keys().publicKey;
}

export function signCanonical(canonical: string): string {
  return signBytes(null, Buffer.from(canonical, "utf8"), keys().privateKey).toString("base64");
}
