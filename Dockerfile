# EduProof — Next.js in three stages.
#
# Deliberately does NOT compile the Compact contract. The build artifacts are
# committed to the repository (contracts/build), because compiling needs the
# Compact toolchain and several minutes, and neither belongs in an image build
# or in a Vercel deployment. See PLAN-MUST-READ-FIRST/06-phase2-midnight.md §5.3.

# ── deps ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Copied on their own so this layer is reused whenever only source changed.
COPY package.json package-lock.json ./
RUN npm ci

# ── builder ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next inlines NEXT_PUBLIC_* at build time, so anything meant to differ per
# deployment has to be passed here rather than at run time.
ARG NEXT_PUBLIC_PROOF_PROVIDER=mock
ARG NEXT_PUBLIC_SCHOOL_API=/api/school/graphql
ARG NEXT_PUBLIC_MIDNIGHT_RPC
ARG NEXT_PUBLIC_MIDNIGHT_INDEXER
ARG NEXT_PUBLIC_PROOF_SERVER
ARG NEXT_PUBLIC_CONTRACT_ADDRESS
ENV NEXT_PUBLIC_PROOF_PROVIDER=$NEXT_PUBLIC_PROOF_PROVIDER \
    NEXT_PUBLIC_SCHOOL_API=$NEXT_PUBLIC_SCHOOL_API \
    NEXT_PUBLIC_MIDNIGHT_RPC=$NEXT_PUBLIC_MIDNIGHT_RPC \
    NEXT_PUBLIC_MIDNIGHT_INDEXER=$NEXT_PUBLIC_MIDNIGHT_INDEXER \
    NEXT_PUBLIC_PROOF_SERVER=$NEXT_PUBLIC_PROOF_SERVER \
    NEXT_PUBLIC_CONTRACT_ADDRESS=$NEXT_PUBLIC_CONTRACT_ADDRESS \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── runner ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Runs as a non-root user: a container that never needs to write to its own
# filesystem should not be able to.
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs

# `output: "standalone"` emits only the files actually reachable at runtime,
# which is a fraction of node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# No `public/` directory: the favicon is app/icon.svg, which Next emits into
# the build itself. Add a COPY here if static assets are ever introduced.

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
