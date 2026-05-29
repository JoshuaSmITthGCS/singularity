FROM node:20-alpine

RUN corepack enable \
  && npm install -g vitest lodash zod axios date-fns \
  && adduser -D -u 1000 runner

ENV NODE_PATH=/usr/local/lib/node_modules
USER runner
WORKDIR /workspace
