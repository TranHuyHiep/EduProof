import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Mirrors the "@/*" path alias in tsconfig.json.
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",

    // Two suites: the app's own logic, and the circuit driven through the
    // Compact simulator. Same runner so `npm test` covers both.
    include: ["tests/**/*.test.ts", "contracts/tests/**/*.test.ts"],
  },
});
