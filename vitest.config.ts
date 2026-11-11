import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: {
    alias: {
      "virtual:pwa-register/react": fileURLToPath(
        new URL("./tests/pwa-mock.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
  },
});
