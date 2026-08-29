# EduProof

**Verify academic facts, not academic records.**

A scholarship board needs to know whether a GPA clears 3.5 — not what it is.
EduProof lets a student prove that one statement and withhold everything else,
using a zero-knowledge circuit on [Midnight](https://midnight.network/).

> Built for the Midnight Buildathon, Wave 1.
> Licensed Apache 2.0.

---

## The problem

Proving a fact about yourself usually means handing over the document that
contains it. To show a scholarship board you are enrolled, you send a
transcript — and with it your GPA, your student number, every course you failed.
The board needed one bit. You disclosed a dossier.

That asymmetry is everywhere: rental applications, visa paperwork, student
discounts, internship screening. Each one collects far more than it needs, then
becomes responsible for storing it.

EduProof inverts it. The student holds the credential; the verifier receives
the answer to one question and no way to ask another.

---

## Quick start — 60 seconds, no toolchain

```bash
npm install
npm run dev          # http://localhost:3000
```

That is the whole setup. No database, no wallet, no Docker, no Compact
compiler. The app runs in **mock mode** by default so it can be evaluated
immediately; see [Proving for real](#proving-for-real) to switch on the circuit.

### For a judge with two minutes

| # | Do this | Look for |
|---|---|---|
| 1 | Open `/student/login`, sign in as **`SV001`** | Alice, enrolled, third year |
| 2 | Continue to **Create proof** | Claims are sentences, not fields |
| 3 | Assert *GPA is at least 3.50* and *status is active*, generate | Both pass |
| 4 | Open the share link | **The verifier page never shows a GPA** |
| 5 | Go back and sign in as **`SV002`** (Bob), assert *GPA ≥ 3.50* | It **fails** — and still does not disclose that his GPA is 2.91 |

Step 5 is the one that matters. A failing proof is the hard case: it must not
narrow down the hidden value either. There is a test that enforces exactly this
(`tests/privacy.test.ts`).

Other things worth trying: `/verify` with a pasted link or bare proof id,
`/verify/nonsense` for the error state, and `SV003` (Charlie), who has
graduated, against *status is active*.

---

## Midnight integration

### The circuit

One circuit, not one per claim. An earlier version had six —
`proveGpaThreshold`, `proveActiveStatus`, and so on — which meant every new
attribute needed a new circuit, a recompile and a redeploy. The claim builder
is dynamic, so the circuit is too: **the predicate is an argument**.

```
proveCredentialPredicate(
    schoolIdHash, subject, slot, op, operand,   // public: the statement
    credential, signature                        // private: the evidence
) -> Boolean
```

It refuses to answer unless three things hold:

1. **Issuer authenticity** — the school's Schnorr signature over the whole
   credential vector verifies against the key held on the public ledger.
2. **Ownership** — the caller knows the secret behind the subject commitment.
   Without this, a leaked credential would prove just as well for a stranger.
3. **Binding** — the credential's own slots name the subject and the issuer
   being checked, so neither can be swapped after signing.

Only then is the predicate evaluated, and only the Boolean comes out.

Source: [`contracts/src/eduproof.compact`](contracts/src/eduproof.compact).

### Dual-ledger

| Data | Where it lives | Who can see it |
|---|---|---|
| Issuer registry (school → public key) | Public ledger | Everyone |
| Count of predicates verified | Public ledger | Everyone |
| Signed credential (GPA, name, id) | Private state, in the browser | The student |
| Student's proving secret | Private state, in the browser | The student |
| Predicate outcome | Public output | The verifier |

The public ledger holds **two** things: issuer keys and a counter. There is
nowhere on it for a student value to be written, which is a structural
guarantee rather than a promise about our code.

### Private-state management

The student's secret is not a circuit argument. It is a **witness**:

```compact
witness studentSecretKey(): Field;
```

The runtime calls back into the student's own private-state provider at proving
time, so no code that assembles a transaction ever holds the key. The compiled
contract's type surface shows it — `Witnesses<PS>` with a `WitnessContext`.

### A credential is signed twice, on purpose

A circuit has no JSON parser, and verifying Ed25519 inside one is impractical.
So the school signs the same facts in two forms:

- **Ed25519 over RFC 8785 canonical JSON** — for anyone integrating
  conventionally, without any of this.
- **JubJub Schnorr over a 16-slot field vector** — for the circuit.

Both derive from one configured secret, so a school still manages one key.
The slot table is part of the public integration contract:
[`lib/school/canonical.ts`](lib/school/canonical.ts).

GPA is stored ×100 — `3.72` is `372` — because a circuit has no floating point.

### What is real, and what is not

Stated plainly, because overclaiming is easy to check.

**Real:**
- The contract compiles; prover and verifier keys are committed to this repo.
- With `NEXT_PUBLIC_PROOF_PROVIDER=midnight`, each claim outcome is the
  **circuit's verdict**, and the circuit refuses to run on a bad signature or a
  caller who is not the holder.
- The school signs with JubJub Schnorr for real.
- No private value can enter a `Proof`. Enforced by tests and by the type.

**Not yet:**
- The contract is **not deployed** to the preview network, so
  `NEXT_PUBLIC_CONTRACT_ADDRESS` is empty and verification says so rather than
  showing a tick that means nothing.
- No transaction is submitted; no ZK proof is generated through a proof server.
  The hosted endpoint was verified reachable with permissive CORS, no more.
- The issuer registry is built in memory per session, not read from chain.
- No Lace wallet connection.

### The trust boundary we did not paper over

A proof server **sees the witness**. That is true of any Midnight deployment,
including this one. Using a hosted proof server is therefore a real trust
trade-off, and a production deployment should run one on the user's side —
`DEPLOYMENT.md` explains how.

We considered proxying it through our own API route to work around CORS. We did
not, and would not have: our proxy would have seen the witness too, which is the
one thing the design refuses. The hosted endpoint turned out to allow direct
browser calls, so the question was moot — but the answer would have been the
same.

---

## Architecture

```
contracts/
  src/eduproof.compact      The circuit
  build/                    Compiled artifacts — COMMITTED, see below
  tests/                    Circuit tests through the Compact simulator

lib/school/                 THE SCHOOL — a separate vendor
  schema.ts                 GraphQL SDL, a public integration spec
  canonical.ts              RFC 8785 JSON + the 16-slot table
  circuit-vector.ts         Credential → field vector
  keys.ts                   Ed25519 + JubJub signing

lib/proof/                  EDUPROOF
  types.ts                  ProofProvider — the seam
  mock-provider.ts          No cryptography
  midnight-provider.ts      The circuit
  index.ts                  Resolves one of them
  store/                    ProofStore — async, ready for a chain store

lib/midnight/               The bridge
  encoding.ts               Operator codes, operand encoding
  local-runner.ts           Runs the circuit in the browser
  prover.ts                 Credential → witness → verdict

app/                        Routes (Next.js App Router)
mock-school-api/            The school as a standalone service, port 4000
```

### The boundary that matters

The school is modelled as an **independent vendor**, not a module. Its GraphQL
schema is a public integration spec: any institution implementing it can issue
credentials EduProof will verify.

That separation is enforced mechanically, not by convention:

```bash
npm run check:boundaries
```

`lib/school/**` and `app/api/school/**` may not import from `lib/proof/`. If
the school could reach into the proof system, the separation would be fiction —
and in Docker they are genuinely two processes on two ports.

### The one place the provider is chosen

```ts
// lib/proof/index.ts
export const proofProvider: ProofProvider =
  providerName() === "midnight" ? new MidnightProofProvider() : new MockProofProvider();
```

Nothing else in the app knows which is in use. Same interface, same `Proof`
shape — there is a test asserting the two produce identical field sets.

---

## Proving for real

```bash
NEXT_PUBLIC_PROOF_PROVIDER=midnight npm run dev
```

Everything else is unchanged: same UI, same flow. What changes is where a claim
outcome comes from. Generate a proof and the browser will load the Compact
runtime, collect a credential signed over the field vector, and run the circuit.

To see it refuse: the tests in `contracts/tests/circuit.test.ts` tamper with a
GPA, forge a signature, and present someone else's credential.

---

## Tests

```bash
npm test                  # 225 tests
npm run check:boundaries  # architecture rules
npm run build             # production build
```

| Suite | What it holds down |
|---|---|
| `tests/privacy.test.ts` | No private value reaches a `Proof`. Keep this one if all others are deleted |
| `contracts/tests/circuit.test.ts` | The circuit constrains what it claims to — bad signatures, wrong holder, tampered credentials |
| `tests/circuit-encoding.test.ts` | The registry, the slot table and the operator codes stay in lockstep |
| `tests/issuer-signing.test.ts` | The issuer key is stable, and a rewritten attribute breaks the signature |
| `tests/school-circuit.test.ts` | The school's wire format matches what the client rebuilds |
| `tests/midnight-provider.test.ts` | A claim outcome under `midnight` is the circuit's, end to end |

The circuit tests were checked by **mutation testing**: removing the signature
check turns 6 red, removing the ownership check 2, changing `>=` to `>` 2, and
pinning `selectSlot` to slot 0 turns 13 red. A test that cannot fail is not a
test.

---

## The contract

```bash
compact update 0.34.0     # toolchain 0.34.0 → language 0.26.0, runtime 0.19.0
npm run contract:build
```

Artifacts in `contracts/build/` are **committed on purpose**: compiling needs
the Compact toolchain and would run against Vercel's build limits. A deployment
is just a Next.js build.

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) — Vercel, Docker, the signing key, and what
holds the data (there is no database, and that is deliberate).

Nothing has been deployed. Those are instructions, not a record.

---

## Roadmap

**Wave 2** — deploy to the preview network and read the issuer registry from
chain; `ChainProofStore` behind the existing `ProofStore` interface, which makes
a proof link work on any device; Lace wallet with signature-based ownership;
**Proof Request**, where a verifier asks and the student approves.

**Wave 3** — an integration gateway for institutions, built on the v1 schema;
credential revocation; selective disclosure across multiple issuers.

---

## Known limitations

- A proof link opens only on the device that created it. Wave 2 fixes this.
- Clearing browser data destroys the student's proving secret.
- The `@auth` directive is **described in the SDL but not enforced**. The
  registrar endpoint returns the very data EduProof exists to protect; a real
  school must authenticate staff there. Documented rather than quietly omitted.
- One school ships in `data/`. The model supports more.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

Built on the [Midnight](https://midnight.network/) network. Thanks to the
Midnight team for the Compact toolchain and the preview infrastructure.
