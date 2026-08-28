# EduProof

**Verify academic facts, not academic records.**

A scholarship board needs to know whether a GPA clears 3.5 — not what it is.
EduProof lets a student prove that claim and withhold everything else.

---

## ⚠️ Phase status: UI-first MVP

This phase is **interface and architecture only**. There is no cryptography yet.

| Concept | Today | Later |
|---|---|---|
| Proof generation | `MockProofProvider` — evaluates claims in TypeScript | Compact circuit on Midnight |
| Proof verification | Looks the proof up by ID | Verifier-key check |
| `payload` | Random hex, meaningless | Real proof material |
| Storage | Browser `localStorage` | Shared store |
| Login | Student ID only, no secret | Out of scope |

**What is already real:** the claim model, the pass/fail outcomes, and the
guarantee that no private value ever enters a `Proof` object. A mock proof is
not unforgeable — but it already discloses nothing it shouldn't.

---

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

No backend, database, or external services.

---

## Demo walkthrough

**1 · School directory** — open `/school`.
Ten students loaded from `data/students.json`. Search by name, ID, or major.

**2 · Student flow** — open `/student/login`.

| Step | Route |
|---|---|
| Sign in with a student ID | `/student/login` |
| Select institution | `/student/select-school` |
| View credential | `/student/credentials` |
| Choose claims | `/student/create-proof` |
| Proof + share link | `/student/proof/[proofId]` |

**3 · Verifier** — open the copied link, or `/verify/demo`.
No login. Shows validity, issuer, and claim outcomes only.

### Scenarios worth demonstrating

| Student | ID | Try | Result |
|---|---|---|---|
| Alice Nguyen | `SV001` | active, GPA ≥ 3.5, year ≥ 3 | all pass |
| Bob Tran | `SV002` | GPA ≥ 3.5 | **fails** — GPA is 2.91, still not disclosed |
| Charlie Pham | `SV003` | active student | **fails** — graduated |

Bob is the one to show: the verifier learns `GPA ≥ 3.5` is false, and never
learns it is 2.91.

**Invalid proof** — visit `/verify/anything-else` for the error state.

---

## Architecture

```
types/index.ts          Domain model — Student, ClaimRequest, Proof
data/*.json             Student and school records
lib/data.ts             The only module that reads the JSON
lib/proof/
  types.ts              ProofProvider interface  ← the swap point
  claims.ts             Claim catalog + evaluation
  mock-provider.ts      MockProofProvider
  store.ts              localStorage persistence
  index.ts              Resolves the active provider
lib/session.ts          Demo session
app/…                   Routes
```

Two rules hold throughout:

1. **No student data is hardcoded in a component.** Every record comes from
   JSON through `lib/data.ts`.
2. **No proof logic lives in a component.** Components call
   `proofProvider.generateProof()` / `.verifyProof()` and render the result.

### Swapping in Midnight

```ts
// lib/proof/index.ts
export const proofProvider: ProofProvider = new MidnightProofProvider();
```

Implement `generateProof` / `verifyProof` against the same interface; no page
changes. The student record becomes a private witness, and only claim
outcomes become public — the shape `Proof` already has.

---

## The claim model

A claim is a **predicate**, never a field:

```ts
{ type: "gpa_threshold", attribute: "gpa", operator: ">=", operand: 3.5 }
```

Evaluating it yields `satisfied: true | false`. The `attribute` records which
private field was read so the UI can say what stayed hidden — its value is
never attached.

Supported: `student_status == active` · `gpa >= n` · `academic_year >= n` ·
`degree == X` · `major == X`

### Why the verifier cannot leak

The `Proof` interface has **no field capable of holding** a GPA, name, or
student ID. The verifier page renders `proof.claims[].label` and
`.satisfied` — so a leak would require a type change, not just a UI slip.

---

## Verified

- `npm run build` — succeeds, 9 routes
- 10/10 claim pass/fail cases correct
- Proof serialisation contains no GPA, student ID, name, or year value
- Invalid proof IDs handled on both proof and verify pages

## Not built yet

Midnight integration · real signing · GraphQL API · server-side proof storage ·
authentication · multi-school data (model supports it; one school shipped)
