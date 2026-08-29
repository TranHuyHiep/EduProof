# Deploying EduProof

Two supported ways to run it, and one thing to understand before either.

> Deploying the app is the project owner's decision. The contract deployment is
> covered under [The contract](#the-contract); everything else here is
> instructions rather than a record.

## What holds the data

There is **no database**. That is a design decision, not an omission:

| Data | Lives in | Survives |
|---|---|---|
| School profile, issuer keys | `data/schools.json`, in the repo | forever |
| Student records | `data/students.json`, read by the school service only | forever |
| Signed credentials | Nowhere. Issued on request, held in the browser | the session |
| Proofs | `localStorage`, on the device that made them | until cleared |
| Student proving secret | `localStorage`, key `eduproof.student.sk.v1` | until cleared |

Two consequences worth stating out loud:

- **A proof link only opens on the device that created it.** Wave 2 moves proofs
  on chain, which is what makes a link portable. The `ProofStore` interface is
  already async for exactly that swap.
- **Clearing browser data destroys the student's identity**, because the proving
  secret goes with it. Credentials can be re-issued; the subject commitment
  cannot be recovered.

---

## Before anything: the signing key

Required in every deployment.

```bash
npm run school:genkey
```

It prints both halves, ready to paste:

```
# Add to .env.local (keep secret):
SCHOOL_SIGNING_KEY=MC4CAQAwBQYDK2VwBCIEI...

# Add to data/schools.json as issuerPublicKey (public):
MCowBQYDK2VwAyEAL3X3wgVckBCbCs9WMiD4...
```

1. Put the first line in `.env.local` (or in the deployment's environment).
2. Put the public key in `data/schools.json` as `issuerPublicKey`.

**They must match.** A verifier checks signatures against the public key
published in the school profile, so a mismatch fails every credential — and if
the variable is missing entirely, the school generates a throwaway key at boot
and warns loudly. Credentials issued under it stop verifying on restart, and on
serverless they differ per request.

---

## Option A — Vercel

One project, both the app and the stand-in school route.

1. Import the repository.
2. Set environment variables (Settings → Environment Variables):

   | Variable | Value | Required |
   |---|---|---|
   | `SCHOOL_SIGNING_KEY` | from `npm run school:genkey` | **yes** |
   | `NEXT_PUBLIC_SCHOOL_API` | `/api/school/graphql` | no, this is the default |
   | `NEXT_PUBLIC_PROOF_PROVIDER` | `mock` or `midnight` | no, defaults to `mock` |
   | `NEXT_PUBLIC_CONTRACT_ADDRESS` | the deployed contract's address | no — empty disables the on-chain features |

3. Deploy. No other configuration is needed.

`NEXT_PUBLIC_*` variables are **inlined at build time**, so changing one needs a
redeploy, not a restart.

### Free tier, and how this stays inside it

| Limit | How the project avoids it |
|---|---|
| Function execution time | Only the school route is a function, and it does one signature. Capped at 10s in `vercel.json` |
| Build minutes | The Compact contract is **not** compiled during the build — artifacts are committed |
| Bundle size | The Midnight WASM runtime is behind a dynamic import, so it loads only when a proof is generated. First Load JS stays ~103 kB |
| No background processes | There are none to run |

### What does not work on Vercel

- **A proof server.** It is a long-running service; serverless has nowhere to
  put it. The app uses the hosted one instead
  (`proof-server.preprod.midnight.network`), which the browser can reach
  directly because it answers with permissive CORS.
- **A genuinely separate school.** The `/api/school/graphql` route stands in for
  an external institution inside the same deployment. Honest, but a
  single-process arrangement — Option B is the architecture as designed.

---

## Option B — Docker

Two containers, and the school is genuinely a separate service.

Compose reads `SCHOOL_SIGNING_KEY` from a `.env` file beside
`docker-compose.yml`, and refuses to start without it:

```bash
npm run --silent school:genkey | grep '^SCHOOL_SIGNING_KEY=' > .env
docker compose up
```

Then copy the printed public key into `data/schools.json`.

- app: http://localhost:3000
- school: http://localhost:4000/graphql

Deliberately no `-d` and no `restart: always`: nothing outlives the terminal
that started it.

To stop and clean up:

```bash
docker compose down
docker image rm eduproof-app eduproof-school
```

### Running a proof server locally

A proof server **sees the witness** — the credential values the whole design is
built to keep private. Using a hosted one is a real trust trade-off, worth
making knowingly for a demo and worth avoiding in production.

To run your own:

```bash
docker run --rm -p 6300:6300 -e PORT=6300 midnightntwrk/proof-server:8.1.0
```

Then rebuild the app with `NEXT_PUBLIC_PROOF_SERVER=http://localhost:6300`
(build-time, so a rebuild is required).

---

## The contract

The compiled artifacts in `contracts/build/` are committed. To rebuild them you
need the Compact toolchain:

```bash
compact update 0.31.1
npm run contract:build
```

Versions must line up, and the pin is load-bearing. Preprod runs **ledger 8**,
so toolchain `0.31.1` → language `0.23.0` → runtime `0.16.0`, matching
`@midnight-ntwrk/compact-runtime@0.16.0` in `package.json`.

Building with `0.34.0` instead produces artifacts asserting
`checkRuntimeVersion('0.19.0')`, whose runtime pulls `onchain-runtime-v4`
(ledger 9 — deployed on no public network). Those artifacts import cleanly and
return a valid-looking verifier key; they fail only when a transaction is
assembled, after fees are spent. `npm run contract:build` pins the version so
this cannot happen by accident.

---

## Verified

The Docker path was built and run, not just written:

```
docker build -t eduproof .        # 338 MB image
docker run -p 3000:3000 -e SCHOOL_SIGNING_KEY=... eduproof
```

All routes answer 200, the GraphQL endpoint responds, the `HEALTHCHECK` reports
`healthy`, and the container runs as `uid=1001(nextjs)` rather than root.
Verified on 2026-08-29.

---

## Troubleshooting

**"SCHOOL_SIGNING_KEY is not set — generating an ephemeral key"**
Exactly what it says. Set the variable; see above.

**Every credential fails to verify**
`issuerPublicKey` in `data/schools.json` does not match `SCHOOL_SIGNING_KEY`.
Regenerate both from one `npm run school:genkey` run.

**`Cannot find module './xxx.js'` in development**
`.next` holds a production build while a dev server runs against it. Delete it:

```bash
rm -rf .next && npm run dev
```

**A proof link shows "No proof matches this identifier"**
Expected: proofs live in `localStorage` on the device that created them. Open
the link on that device, or wait for the Wave 2 on-chain store.

**Port already in use**

```bash
lsof -ti tcp:3000   # then kill the pid, if it is yours
```

**The build fails on a `.wasm` file**
`next.config.ts` enables `asyncWebAssembly`. If it was edited, that is why.
