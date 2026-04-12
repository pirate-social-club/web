import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: [
      "src/**/*.vitest.ts",
      "src/**/*.vitest.tsx",
    ],
    setupFiles: ["./src/test/setup.ts"],
  },
});
