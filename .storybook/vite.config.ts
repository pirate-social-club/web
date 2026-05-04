import { resolve } from "node:path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "../src"),
      dotenv: resolve(__dirname, "../src/lib/dotenv-browser-shim.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["@xmtp/browser-sdk", "@xmtp/wasm-bindings"],
  },
});
