import { cloudflare } from "@cloudflare/vite-plugin";
import { fileRoutes } from "filesystem-routing/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const solidRuntimeRoot = path.resolve(appRoot, "node_modules/solid-js");
const solidWebRuntimeRoot = path.resolve(appRoot, "node_modules/@solidjs/web");

export default defineConfig({
  plugins: [
    tailwindcss(),
    fileRoutes({ httpMethods: true }),
    {
      name: "web-solid-design-system-boundary",
      configResolved(config) {
        if (!config.resolve.dedupe?.includes("solid-js") || !config.resolve.dedupe?.includes("@solidjs/web")) {
          throw new Error("Solid runtime dedupe must remain configured");
        }
        const aliases = Array.isArray(config.resolve.alias) ? config.resolve.alias : [];
        const runtimeAlias = (find: string | RegExp, replacement: string) =>
          aliases.some(alias => String(alias.find) === String(find) && alias.replacement === replacement);
        if (!runtimeAlias(/^solid-js$/, solidRuntimeRoot)
          || !runtimeAlias(/^solid-js\/web$/, solidWebRuntimeRoot)
          || !runtimeAlias(/^@solidjs\/web$/, solidWebRuntimeRoot)) {
          throw new Error("Solid runtime aliases must pin app and catalog imports to one physical runtime");
        }
      },
    },
    cloudflare({
      viteEnvironment: { name: "ssr" },
      auxiliaryWorkers: [{ configPath: "./workers/public/wrangler.jsonc" }],
    }),
    solid({
      ssr: true,
      serverFunctions: true,
      start: {
        middleware: "./src/middleware.ts",
        external: true,
      },
    }),
  ],
  resolve: {
    dedupe: ["solid-js", "@solidjs/web"],
    alias: [
      { find: /^solid-js$/, replacement: solidRuntimeRoot },
      { find: /^solid-js\/web$/, replacement: solidWebRuntimeRoot },
      { find: /^@solidjs\/web$/, replacement: solidWebRuntimeRoot },
      { find: "@", replacement: path.resolve(appRoot, "../packages/solid-ui/src") },
    ],
  },
  server: {
    fs: {
      allow: [path.resolve(appRoot, "..")],
    },
  },
  preview: {
    allowedHosts: [".hns", ".localhost", "localhost"],
  },
});
