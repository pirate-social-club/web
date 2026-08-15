import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";

const packageRoot = path.resolve(import.meta.dirname, "../packages/solid-ui");

// The catalog lives under packages/solid-ui, whose physical upward module
// walk never reaches this project's node_modules. `solid-ui:link` (see
// solid/package.json) bridges it with a gitignored node_modules symlink, so
// catalog tests resolve the exact packages this single install provides.
const catalogAlias = [
  { find: "@", replacement: path.resolve(packageRoot, "src") },
];

export default defineConfig({
  root: packageRoot,
  plugins: [tailwindcss(), solid()],
  test: {
    projects: [
      {
        extends: true,
        resolve: {
          alias: catalogAlias,
        },
        test: {
          name: "components",
          environment: "jsdom",
          setupFiles: ["src/test/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
        },
      },
      {
        extends: true,
        test: {
          name: "ssr",
          environment: "node",
          include: ["scripts/**/*.test.{ts,tsx}"],
        },
        resolve: {
          conditions: ["node", "import", "default"],
          alias: catalogAlias,
        },
      },
    ],
  },
});
