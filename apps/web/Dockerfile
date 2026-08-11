# syntax=docker/dockerfile:1
#
# Build from the repo root so the workspace packages are in context:
#   docker build -f apps/web/Dockerfile -t geld-flow-web .

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# Baked into the client bundle at build time — set to wherever the API
# is actually reachable from users' browsers for this build.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @geld-flow/web build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /repo
# next.config.ts sets output:"standalone" with outputFileTracingRoot
# pointed at the monorepo root, so the traced bundle already mirrors
# this apps/web/... path and needs no further dependency resolution.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
