# syntax=docker/dockerfile:1
#
# Builds the translation worker only — NOT the 5 sandbox test images
# (worker/docker/*.Dockerfile). Those are built once on the host as part of
# deployment (see DEPLOY.md); the worker doesn't build them at runtime, it
# only launches them via the Docker socket.
#
# Deliberately plain `npm install` against worker/package.json alone, not
# `pnpm install` against the repo's workspace lockfile: the worker has no
# `workspace:*` dependencies (see package.json — everything is a published
# npm package), so a workspace-aware install buys nothing here, and pnpm's
# symlinked, content-store-backed node_modules do not survive a plain `COPY`
# into a slim runtime stage without extra steps (`pnpm deploy`) whose exact
# copy semantics couldn't be verified in this environment (no Docker daemon
# available here to trial-build against). Plain npm produces real files.
#
# Build context is this `worker/` directory.

# Stage 1: production dependencies only (cached independently of source changes).
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# Stage 2: full install (incl. typescript/tsx) purely to compile.
FROM node:20-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 3: runtime — prod deps + compiled output only, no dev tooling.
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
CMD ["node", "dist/index.js"]
