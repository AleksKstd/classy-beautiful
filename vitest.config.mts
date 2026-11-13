import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" throws outside a React Server environment; tests run in Node.
      "server-only": fileURLToPath(new URL("./tests/unit/helpers/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // Run in a non-Sofia zone to prove the code does not depend on the machine's time zone.
    env: { TZ: "UTC" },
  },
});
