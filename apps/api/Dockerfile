# syntax=docker/dockerfile:1
#
# Build from the repo root so the workspace packages (packages/db,
# packages/shared) are in context:
#   docker build -f apps/api/Dockerfile -t geld-flow-api .

FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @geld-flow/db generate
RUN pnpm --filter @geld-flow/api build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api ./apps/api
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/package.json ./package.json
EXPOSE 4000
# packages/db and packages/shared are consumed as TypeScript source (see
# their package.json "main") rather than pre-compiled, and are also ESM
# ("type": "module") while apps/api compiles to CommonJS. This works
# with a *plain* `node dist/main.js` — no ts-node needed — because
# Node 22+ natively strips TypeScript types on require/import and
# supports synchronous require() of ESM (this is exactly how `nest
# start`'s dev mode runs too: plain `node dist/main`, no loader flags).
# Explicitly registering ts-node here would actually break this, since
# ts-node's own CJS require hook enforces an ESM-boundary check that
# Node's native loader doesn't.
CMD ["node", "apps/api/dist/main.js"]
