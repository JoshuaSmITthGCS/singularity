import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

// Unit tests run in a node environment. The `@` alias mirrors tsconfig paths so
// tests import the same way the app does.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
})
