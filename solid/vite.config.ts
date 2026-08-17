import { cloudflare } from "@cloudflare/vite-plugin";
import { fileRoutes } from "filesystem-routing/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  // Keep Solid's emitted browser modules in its private namespace. React
  // continues to own the public /assets/* path at the outer Worker.
  base: "/_solid/",
  // Public share cards are part of the Web surface contract and live in the
  // repository-level public catalog shared by the React and Solid hosts.
  publicDir: path.resolve(appRoot, "../public"),
  plugins: [
    tailwindcss(),
    fileRoutes({ httpMethods: true }),
    {
      name: "web-solid-design-system-boundary",
      configResolved(config) {
        if (!config.resolve.dedupe?.includes("solid-js") || !config.resolve.dedupe?.includes("@solidjs/web")) {
          throw new Error("Solid runtime dedupe must remain configured");
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
    alias: {
      "solid-js/web": "@solidjs/web",
      "@": path.resolve(appRoot, "../packages/solid-ui/src"),
    },
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
