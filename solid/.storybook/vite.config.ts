import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL("..", import.meta.url));

// Dedicated Storybook Vite config. The production vite.config.ts pulls in the
// SolidStart/Cloudflare plugin stack and filesystem routing, none of which may
// run inside the story builder. Keep only what stories need: Tailwind and the
// same module resolution as the app (including the design-system source alias,
// which remains until the alias-coupling cleanup lands).
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "solid-js/web": "@solidjs/web",
      "@": path.resolve(appRoot, "../packages/solid-ui/src"),
    },
  },
});
