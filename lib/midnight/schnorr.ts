// JubJub Schnorr, in TypeScript, matching contracts/src/schnorr.compact.
//
// Both sides are hand-rolled for the same reason: `jubjubSchnorrSign` and
// `jubjubSchnorrVerify` do not exist in compact-runtime 0.16.0, which is the
// runtime ledger 8 requires — and Preprod runs ledger 8. The built-ins are
// language 0.26 / runtime 0.19.0, which target ledger 9, deployed nowhere
// public. See docs/22-lessons.md.
//
// This file is the single implementation. The school signs with it, the tests
// sign with it, and the circuit checks the result — so there is one place
// where the challenge construction is defined, and no chance of the signer and
// the verifier drifting apart.

/** The order of the JubJub subgroup. Every scalar is reduced into this. */
export const JUBJUB_SCALAR_ORDER =
  6554484396890773809930967563523245729705921265872317281365359162392183254199n;

/**
 * Where the challenge is truncated.
 *
 * `transientHash` returns a BLS12-381 scalar, which is 255 bits, but a JubJub
 * scalar has to sit below the curve order, which is 252 bits. 248 bits is
 * comfortably under. The circuit does not take the truncation on trust: it
 * asks for the quotient as a witness and checks the reconstruction.
 */
export const TWO_248 = 1n << 248n;

export interface CurvePoint {
  x: bigint;
  y: bigint;
}

export interface SchnorrSignature {
  announcement: CurvePoint;
  response: bigint;
}

/**
 * A uniformly random scalar in [1, order).
 *
 * `crypto.getRandomValues` rather than node's `randomBytes`: this module is
 * reached from the browser through the local runner, and a `node:crypto`
 * import breaks that bundle outright. The Web Crypto name is available in both
 * places, and is a CSPRNG in both.
 *
 * 64 bytes reduced into the order leaves negligible modulo bias — the excess
 * over the 252-bit order is about 2^-260 of the range.
 */
function randomScalar(): bigint {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);

  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);

  return (value % (JUBJUB_SCALAR_ORDER - 1n)) + 1n;
}

/** The public key for a signing scalar: pk = sk·G. */
export async function publicKeyOf(sk: bigint): Promise<CurvePoint> {
  const { ecMulGenerator, jubjubPointX, jubjubPointY } = await import(
    "@midnight-ntwrk/compact-runtime"
  );
  const pk = ecMulGenerator(sk);
  return { x: jubjubPointX(pk), y: jubjubPointY(pk) };
}

/**
 * The challenge, built exactly as `schnorr.compact` builds it.
 *
 * The hash covers the announcement and the public key as well as the message.
 * Binding all three is what stops a signature being replayed against another
 * key or another announcement.
 *
 * The field order matches `SchnorrHashInput` in the circuit. A struct is laid
 * out as its fields in order, which is the same encoding a vector of that
 * length produces — so hashing the flattened list agrees with the circuit.
 * Changing the order on one side without the other silently invalidates every
 * signature, which is why both orders are written out in full.
 */
export async function challenge(
  announcement: CurvePoint,
  publicKey: CurvePoint,
  message: bigint[]
): Promise<bigint> {
  const { CompactTypeField, CompactTypeVector, transientHash } = await import(
    "@midnight-ntwrk/compact-runtime"
  );

  const fields = [
    announcement.x,
    announcement.y,
    publicKey.x,
    publicKey.y,
    ...message,
  ];

  const full = transientHash(
    new CompactTypeVector(fields.length, CompactTypeField),
    fields
  );

  // The circuit multiplies by the truncated value, so the signer must use the
  // truncated value too.
  return full % TWO_248;
}

/**
 * Signs `message` with `sk`.
 *
 * The nonce must be unpredictable and never reused: two signatures sharing a
 * nonce reveal the private key outright. Sampling 64 bytes and reducing into
 * the scalar order leaves negligible modulo bias.
 */
export async function sign(message: bigint[], sk: bigint): Promise<SchnorrSignature> {
  const publicKey = await publicKeyOf(sk);
  const nonce = randomScalar();

  const announcement = await publicKeyOf(nonce);
  const c = await challenge(announcement, publicKey, message);

  // s = k + c·sk, so that s·G == R + c·pk.
  const response = (nonce + c * sk) % JUBJUB_SCALAR_ORDER;

  return { announcement, response };
}

/**
 * Verifies a signature off circuit: `s·G == R + c·pk`.
 *
 * The circuit is the authority; this exists so tests can assert the signing
 * side is correct without generating a proof, and so a caller can fail early
 * on a bad signature rather than deep inside the prover.
 */
export async function verify(
  message: bigint[],
  signature: SchnorrSignature,
  publicKey: CurvePoint
): Promise<boolean> {
  const { constructJubjubPoint, ecAdd, ecMul, ecMulGenerator, jubjubPointX, jubjubPointY } =
    await import("@midnight-ntwrk/compact-runtime");

  const c = await challenge(signature.announcement, publicKey, message);

  const lhs = ecMulGenerator(signature.response);
  const rhs = ecAdd(
    constructJubjubPoint(signature.announcement.x, signature.announcement.y),
    ecMul(constructJubjubPoint(publicKey.x, publicKey.y), c)
  );

  return jubjubPointX(lhs) === jubjubPointX(rhs) && jubjubPointY(lhs) === jubjubPointY(rhs);
}

/**
 * The split the circuit asks for as a witness.
 *
 * Division is expensive in a circuit and checking a division is cheap, so the
 * prover supplies `[quotient, remainder]` and the circuit verifies
 * `q·2^248 + remainder == challengeHash` with `q < 116`.
 *
 * Note this takes the FULL hash, before truncation — `challenge()` above
 * returns the already-truncated value.
 */
export function reduction(challengeHash: bigint): [bigint, bigint] {
  return [challengeHash / TWO_248, challengeHash % TWO_248];
}

/**
 * The full, untruncated challenge — what the witness above is given.
 *
 * The circuit hashes internally and then asks the prover to split that hash,
 * so the prover needs the same pre-truncation value.
 */
export async function fullChallenge(
  announcement: CurvePoint,
  publicKey: CurvePoint,
  message: bigint[]
): Promise<bigint> {
  const { CompactTypeField, CompactTypeVector, transientHash } = await import(
    "@midnight-ntwrk/compact-runtime"
  );

  const fields = [announcement.x, announcement.y, publicKey.x, publicKey.y, ...message];

  return transientHash(new CompactTypeVector(fields.length, CompactTypeField), fields);
}
