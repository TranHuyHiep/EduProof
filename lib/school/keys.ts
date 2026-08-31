// The schools' issuer keypairs — one per school, each an independent vendor.
//
// A key MUST be stable across restarts. A verifier checks a signature against
// a public key it learned independently — from the registry in Wave 1, from the
// on-chain issuer registry in Wave 2. A key regenerated at boot would invalidate
// every credential already issued, and on serverless it would differ per request.
//
// So: read from an env var per school. Generate one with `npm run school:genkey`.

import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as signBytes,
  type KeyObject,
} from "node:crypto";

const cached = new Map<string, { privateKey: KeyObject; publicKey: string }>();

/** Base64 of the SPKI DER — how the public key travels and how it is compared. */
function encodePublicKey(key: KeyObject): string {
  return key.export({ format: "der", type: "spki" }).toString("base64");
}

/**
 * The env var a school's key is read from.
 *
 * `hanoi-university` keeps the original unsuffixed `SCHOOL_SIGNING_KEY` —
 * it is the one issuer actually registered on Preprod, and renaming its
 * variable would mean editing every deployment's `.env.local` for no reason.
 * Every other school gets `SCHOOL_SIGNING_KEY_<SCHOOL_ID>`.
 */
function envVarFor(schoolId: string): string {
  if (schoolId === "hanoi-university") return "SCHOOL_SIGNING_KEY";
  return `SCHOOL_SIGNING_KEY_${schoolId.toUpperCase().replace(/-/g, "_")}`;
}

function load(schoolId: string): { privateKey: KeyObject; publicKey: string } {
  const envVar = envVarFor(schoolId);
  const configured = process.env[envVar];

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
    `[school] ${envVar} is not set — generating an ephemeral key for ${schoolId}.\n` +
      "[school] Credentials issued now will NOT verify after a restart.\n" +
      `[school] Run \`npm run school:genkey\` and set ${envVar}.`
  );

  const { privateKey } = generateKeyPairSync("ed25519");
  return { privateKey, publicKey: encodePublicKey(createPublicKey(privateKey)) };
}

function keys(schoolId: string) {
  let entry = cached.get(schoolId);
  if (!entry) {
    entry = load(schoolId);
    cached.set(schoolId, entry);
  }
  return entry;
}

/** Base64 SPKI. Published in the school profile so verifiers can check signatures. */
export function issuerPublicKey(schoolId: string): string {
  return keys(schoolId).publicKey;
}

export function signCanonical(schoolId: string, canonical: string): string {
  return signBytes(null, Buffer.from(canonical, "utf8"), keys(schoolId).privateKey).toString("base64");
}

// --- Circuit signing key -------------------------------------------------
//
// A second keypair, and it has to be a second one: the credential JSON is
// signed with Ed25519, which a ZK circuit cannot verify cheaply, while the
// circuit verifies a Schnorr signature over the JubJub curve — the curve its
// own arithmetic is built on. Same school, same credential, two signatures
// over two representations of it.
//
// The JSON signature is what a conventional integrator checks. The JubJub
// signature is what the circuit checks. Neither replaces the other.
//
// Schnorr is written out by hand here for the same reason it is in
// contracts/src/schnorr.compact: `jubjubSchnorrSign` does not exist in
// compact-runtime 0.16.0, which is the runtime ledger 8 — and therefore
// Preprod — requires. See docs/22-lessons.md.
//
// Signing and verification must agree exactly, so both sides build the
// challenge the same way and out of the same primitives.

/**
 * The JubJub signing scalar, derived from the configured Ed25519 key.
 *
 * Derived rather than configured separately so a school still manages exactly
 * one secret. Reducing the hash into the scalar field keeps it a valid key.
 */
export async function circuitSigningKey(schoolId: string): Promise<bigint> {
  const { createHash } = await import("node:crypto");
  const { JUBJUB_SCALAR_ORDER } = await import("../midnight/schnorr.ts");

  const seed = process.env[envVarFor(schoolId)] ?? issuerPublicKey(schoolId);
  const digest = createHash("sha512").update(`eduproof/jubjub/v1:${seed}`).digest("hex");
  return (BigInt(`0x${digest}`) % (JUBJUB_SCALAR_ORDER - 1n)) + 1n;
}

/** The public half, as the on-chain issuer registry holds it. */
export async function circuitPublicKey(schoolId: string): Promise<{ x: bigint; y: bigint }> {
  const { publicKeyOf } = await import("../midnight/schnorr.ts");
  return publicKeyOf(await circuitSigningKey(schoolId));
}

/**
 * Signs the canonical field vector — the message the circuit reads.
 *
 * The vector, not the JSON: a circuit has no parser, so what it verifies is
 * the sixteen integers themselves.
 */
export async function signFieldVector(
  schoolId: string,
  vector: bigint[]
): Promise<{ announcement: { x: bigint; y: bigint }; response: bigint }> {
  const { sign } = await import("../midnight/schnorr.ts");
  return sign(vector, await circuitSigningKey(schoolId));
}
