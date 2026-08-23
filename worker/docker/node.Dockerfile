FROM node:20-alpine

RUN corepack enable \
  && npm install -g vitest lodash zod axios date-fns

# node:20-alpine already ships a "node" user at uid 1000 (gid 1000), which is
# also what worker/src/test-runner.ts hardcodes as the container run-as user
# — reuse it instead of creating a second user at the same uid (that collides
# and fails the build: "adduser: uid '1000' in use").
ENV NODE_PATH=/usr/local/lib/node_modules
USER node
WORKDIR /workspace
