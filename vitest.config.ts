import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globals: true,
    environment: "node"
  },
  resolve: {
    alias: {
      "@api": new URL("./apps/api/src", import.meta.url).pathname
    }
  }
});
