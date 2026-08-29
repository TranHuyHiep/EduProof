# Integrating your institution with EduProof

EduProof lets your students prove facts about their records — *"is enrolled"*,
*"GPA is at least 3.5"* — without disclosing the records themselves.

You do not send us your data. You expose a GraphQL endpoint; the student's
browser fetches a signed credential from it directly. **No attribute value ever
reaches an EduProof server**, because there is no path for one to travel.

Integrating means implementing one GraphQL schema and holding one signing key.

---

## 1. What you run

A GraphQL endpoint implementing the schema in
[`lib/school/schema.ts`](lib/school/schema.ts). The reference implementation in
this repository stands in for a university and is the executable specification —
run it, introspect it, compare against it.

```bash
npm run school          # http://localhost:4000/graphql
```

The schema has two zones, and the split is the security model:

| Zone | Fields | Who may call it |
|---|---|---|
| **Public** | `school` | Anyone. Publishes your issuer public key. |
| **Student** | `credential` | An authenticated student — **their own record only**. |
| **Registrar** | `registrar` | Authenticated staff. Returns full records. |

> The reference implementation does **not** enforce authentication — it is a
> demo. Yours must. The `registrar` field returns exactly the data EduProof
> exists to protect.

---

## 2. The signing key

Generate an Ed25519 keypair:

```bash
npm run school:genkey
```

- **Private key** → `SCHOOL_SIGNING_KEY` in your environment. Never commit it.
- **Public key** → published via the `school { issuerPublicKey }` field.

Two rules that matter more than they look:

1. **The key must be stable.** A verifier checks a signature against a public
   key it obtained independently. Regenerate the key and every credential you
   have issued becomes unverifiable. On serverless, a key generated at startup
   differs per request.

2. **The public key must not travel inside the credential it signs.** A
   verifier that trusts a key attached to the document proves nothing — an
   attacker just generates their own keypair and signs whatever they like.
   Verifiers read your key from the registry (Wave 2: from the on-chain issuer
   registry), never from the credential.

---

## 3. Canonical form — the part to get exactly right

The signature covers the **RFC 8785 (JCS)** canonical JSON of the credential,
excluding the `signature` field itself.

`JSON.stringify` is **not** sufficient: key order varies between languages and
libraries, and a different byte sequence is a different signature.

The rules, in full:

- Object keys sorted by UTF-16 code unit
- No insignificant whitespace
- `undefined` values omitted

The reference implementation is ~30 lines in
[`lib/school/canonical.ts`](lib/school/canonical.ts) — deliberately written out
rather than pulled from a dependency, because this is the one piece you must
reimplement byte-for-byte.

### Verifying your implementation

Issue a credential, then check that this passes:

```js
const { signature, ...body } = credential;
verify(null, Buffer.from(toCanonicalJson(body), "utf8"), publicKey,
       Buffer.from(signature, "base64"));   // must be true
```

---

## 4. Integers only

Every attribute is an integer or an enum. There are no floats and no free-form
strings in the comparable fields.

This is not fussiness: these values are inputs to a zero-knowledge circuit, and
**circuits have no floating point**.

| Attribute | Representation | Example |
|---|---|---|
| `gpaScaled` | GPA × `gpaScale` | `3.72` → `372` with `gpaScale: 100` |
| `status` | enum | `ACTIVE` / `GRADUATED` / `SUSPENDED` |
| `degree` | enum | `BACHELOR` / `MASTER` / `PHD` |
| `academicYear` | integer | `3` |
| dates | ISO 8601 string | `2027-06-30T00:00:00.000Z` |

---

## 5. The circuit signature

Everything above describes the conventional half of the integration: Ed25519
over canonical JSON, which any stack can produce and check.

There is a second signature, and it is the one the zero-knowledge circuit
verifies. A circuit has no JSON parser and cannot check Ed25519 cheaply, so the
same facts are signed again in a form it can read: **JubJub Schnorr over a
sixteen-slot field vector**.

### The slot table

| Slot | Holds | Encoding |
|---|---|---|
| 0 | school id | FNV-1a 32-bit hash of `issuer.schoolId` |
| 1 | subject commitment | supplied by the student (see below) |
| 2 | status | `ACTIVE` 1, `GRADUATED` 2, `SUSPENDED` 3 |
| 3 | GPA | `gpaScaled`, i.e. ×100 |
| 4 | academic year | integer |
| 5 | degree | `BACHELOR` 1, `MASTER` 2, `PHD` 3 |
| 6 | major | FNV-1a 32-bit hash |
| 7 | expiry | days since the Unix epoch |
| 8–15 | reserved | zero |

**Never renumber these.** They are part of the proving contract, and a change
invalidates every credential already signed.

### The subject commitment

`credential(studentId:, subjectCommitment:)` takes an optional commitment. It is
a public value the student derives from a secret **you never see**, and signing
it into slot 1 is what binds the credential to its holder — without it, a leaked
credential would prove just as well for whoever picked it up.

Supply it, and the response carries `circuitVector` and `circuitSignature`.
Omit it, and those come back null; the conventional credential is unaffected.

Validate the commitment is within the field before signing — at most
`52435875175126190479447740508185965837690552500527637822603658699938581184512`,
which the Compact runtime exposes as `maxField()`. Out of range it traps rather
than raising, and a bad request looks like a server fault.

### One secret, two keys

The JubJub signing scalar is **derived** from the same `SCHOOL_SIGNING_KEY`, so
you still manage one secret. Publish the public half as
`school { circuitPublicKey { x y } }`.

See [`lib/school/circuit-vector.ts`](lib/school/circuit-vector.ts) and
[`lib/school/keys.ts`](lib/school/keys.ts).

---

## 6. What you do NOT have to implement

- `demoRoster` — a convenience for this demo's student picker. A real school
  authenticates the student instead of offering a list of identities to choose
  from. **Omit it.**

---

## 7. Checklist

- [ ] GraphQL endpoint serving the v1 schema, introspection enabled
- [ ] `school` returns your profile and issuer public key
- [ ] `credential` authenticates the caller and returns **only their** record
- [ ] `registrar` requires staff authentication
- [ ] Signing key loaded from configuration, stable across restarts
- [ ] Signature covers the RFC 8785 canonical form
- [ ] `circuitPublicKey`, `circuitVector` and `circuitSignature` served (§5)
- [ ] `subjectCommitment` range-checked before signing
- [ ] GPA exposed as a scaled integer with its scale
- [ ] Enums in `SCREAMING_CASE`
- [ ] CORS permits the EduProof origin your students use

---

## 8. Reference files

| File | What it is |
|---|---|
| [`lib/school/schema.ts`](lib/school/schema.ts) | The schema. The contract. |
| [`lib/school/canonical.ts`](lib/school/canonical.ts) | Canonical JSON + the slot table |
| [`lib/school/circuit-vector.ts`](lib/school/circuit-vector.ts) | Credential → field vector |
| [`lib/school/credential.ts`](lib/school/credential.ts) | Assemble, canonicalise, sign |
| [`lib/school/keys.ts`](lib/school/keys.ts) | Key loading, and why it must be stable |
| [`mock-school-api/server.mjs`](mock-school-api/server.mjs) | A runnable school, ~70 lines |
