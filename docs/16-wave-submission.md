# Text nộp bài — "Updates in this Wave"

Bản tiếng Anh để dán thẳng vào form. Số liệu đo lúc 2026-09-10, đọc từ
indexer chứ không phải từ UI của app.

**Trước khi nộp:** merge `feature/contract-rewrite` vào `main`. Giám khảo mở
repo sẽ thấy `main`, và toàn bộ việc mô tả dưới đây đang nằm trên nhánh.

---

## 2nd Wave

```
EduProof lets a student prove a PROPOSITION about their academic record —
"GPA >= 3.5", "currently enrolled" — without revealing the value behind it.

WHAT CHANGED IN THIS WAVE

The headline: proofs now reach the chain. In Wave 1 the circuit ran in a
local Simulator, so the verdict was real but never left the browser. It now
runs through callTx as a signed transaction, and the contract's counter moves.

Verify it independently, without trusting anything we say:

  Contract   5d96aa1c4f2b77afc3603cb028f142da83ea4b027f1802c0b4560ca11b7ef42b
  Explorer   https://preprod.midnightexplorer.com/contracts/5d96aa1c4f2b77afc3603cb028f142da83ea4b027f1802c0b4560ca11b7ef42b
  Deploy tx  a9f455ba02b9fa575de1daf2a8e169df0d1a884a7551830fe11ac74e72ff078c  (block 2475056)
  Latest tx  a1abe8092f7dbc2fdf180a1604c469328034ba33a3a98fc582debc6cf62fba76  (block 2489013)

  proofsVerified = 7

That number is the circuit's own on-chain counter. Every increment is one
predicate the circuit accepted, paid for with real tDUST and signed in a Lace
wallet by a person clicking a button. Read it yourself:
`ledger(ContractState.deserialize(...)).proofsVerified` against the indexer.

WHAT WE GAVE UP, AND WHY WE ARE SAYING SO

We rewrote the contract from scratch following Midnight's official calculator
example. The rewrite dropped the hand-rolled JubJub Schnorr verification that
checked the school's signature, so as of this Wave:

  ANYONE CAN SELF-ASSERT A CREDENTIAL.

A student can invent a vector with 400 in the GPA slot and the circuit will
prove "GPA >= 3.5" over it. The proof remains sound about the arithmetic and
still hides the value — the privacy property is intact — but it no longer
proves provenance.

We are reporting this rather than letting it be discovered. It is recorded as
a PASSING TEST in contracts/tests/circuit.test.ts, under the heading "what
this circuit does NOT prove", so the missing property lives in the suite and
not only in a comment. When issuer authenticity is restored, that test must
go red — which makes it the acceptance criterion for the next Wave.

Two consequences we handled rather than hid:
  - The on-chain issuer registry went with it. A Map of keys no circuit reads
    would make the ledger LOOK like it authenticates schools. Absent is more
    honest than decorative.
  - issuerBadge() no longer has any path returning "proven". The verify page
    shows "Listed by this app" — which is the actual level of assurance.

The school still signs credentials and still publishes its circuit key over
GraphQL; lib/school/** is an independent vendor whose schema is a public
specification. EduProof simply stopped looking at the signature.

ENGINEERING WORK BEHIND THE ON-CHAIN CALL

Publishing from a browser has no official precedent — Midnight's
example-counter is CLI-only with a headless seed wallet. Seven distinct
failures had to be cleared, each only visible after the previous one:

  1. findDeployedContract calls watchForDeployTxData and
     queryDeployContractState before callTx; both were stubbed.
  2. A publish reported success against a transaction that settled in August:
     the indexer answers for ANY of a transaction's identifiers. Fixed with a
     chain-tip floor read before the wait begins.
  3. ledger-v8 and compact-runtime both export a class named ContractState
     from separate WASM builds; the SDK decides by instanceof. TypeScript
     cannot see the difference, so the tests assert the class.
  4. onchain-runtime-v3 was installed twice under different parents. Two WASM
     instances, two StateValue classes, one instanceof failure deep in the
     SDK. Node's resolver collapses the duplicates; webpack does not — which
     is why it only broke in the browser. Fixed with npm dedupe.
  5. The registered issuer key had drifted from the key the school signs
     with, after SCHOOL_SIGNING_KEY changed post-registration.
  6. The private-state provider was seeded with a placeholder secret while
     the subject commitment came from the real one, so the circuit's holder
     check could never pass.
  7. Midnight's hosted proof server returns 403 to real proof-sized requests
     (measured: empty body 400, 300 KB body 403, server: awselb/2.0). The 403
     carries no CORS header, so the browser misreports it as a CORS failure.
     We now run our own proof server behind Caddy with TLS.

All seven are written up with reproduction steps in docs/22-lessons.md
(sections 9-12), because the diagnosis was worth more than the fixes.

VERIFICATION

  299 tests across 23 files
  4/4 architecture boundary rules (a script, not a promise:
      lib/school/** must not import lib/proof/**)
  tsc --noEmit clean
  production build clean

The test that matters most is tests/privacy.test.ts: the Proof type must have
no field capable of holding a real GPA, name, or student id. It is a
STRUCTURAL guarantee, not a convention, and it survived the rewrite untouched.

LINKS

  Repository   https://github.com/TranHuyHiep/EduProof
  Live demo    https://eduproof-midnight.vercel.app
  Contract     https://preprod.midnightexplorer.com/contracts/5d96aa1c4f2b77afc3603cb028f142da83ea4b027f1802c0b4560ca11b7ef42b
  Docs index   docs/README.md  (Vietnamese)
  This Wave    docs/15-wave-1-smartcontract-call.md
```

---

## 3rd Wave

```
PLANNED FOR THE 3rd WAVE

Theme: security and correctness. The 2nd Wave got proofs onto the chain and,
in doing so, traded away issuer authenticity. The 3rd Wave pays that back
first, then builds on it.

W3.0 RESTORE ISSUER AUTHENTICITY  (highest priority)

Not a new feature — the debt the 2nd Wave took on deliberately. Right now the
circuit checks two things: that the caller holds the secret behind the
subject commitment, and that the credential names the school it is presented
under. It does NOT check that the school issued it.

Acceptance criterion is already written and currently passing: the test named
"accepts a credential nobody issued" in contracts/tests/circuit.test.ts must
FAIL and be rewritten. We put it there in the 2nd Wave precisely so this
would not be forgotten.

Two routes:
  A. jubjubSchnorrVerify as a language builtin — needs ledger 9 (language
     0.26 / toolchain 0.34.0). Preprod runs ledger 8, so this waits on
     Midnight.
  B. Restore the hand-rolled Schnorr over JubJub. Works on ledger 8 today,
     and the code is in git history. The TypeScript half was deliberately
     kept: lib/midnight/schnorr.ts still signs, the school still publishes
     its circuit key. Only the circuit's verification was removed.

We will take route B rather than wait, and switch to A when ledger 9 lands.

Restoring it brings back the on-chain issuer registry, the preflight that
compares the registered key against the key the school currently signs with
(a mismatch cost us a full day — docs/22-lessons.md section 10), and the
"proven" state on the issuer badge.

W3.1 WALLET OWNERSHIP CHALLENGE

The 2nd Wave connects a wallet and uses it to pay fees and sign the
transaction. It does not prove the connecting party controls that wallet's
key. The 3rd Wave adds a signed challenge, binding a credential to a WALLET
rather than to a device, and closing the "stolen credential replayed
elsewhere" path at the wallet layer — the circuit already closes it at the
credential layer through witness studentSecretKey().

These two are independent: ownership of the credential is proven by the
circuit, ownership of the wallet by the signature. Different layers,
different attacks.

WHAT WE ARE DELIBERATELY NOT DOING

Revocation, proof requests, replay binding and multi-issuer support are
specified in docs/40-wave-2-features.md and held back on purpose. Scoring
rewards progress BETWEEN waves, so shipping two things properly beats
shipping six half-built. Restoring a security property we removed is worth
more than adding a seventh feature on top of a circuit anyone can currently
fool.

Full plan: docs/40-wave-2-features.md (W2.0, W2.1) and docs/50-wave-2-plan.md
```
