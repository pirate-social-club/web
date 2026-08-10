import { resolve } from "node:path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "../src"),
      "@noble/curves/secp256k1": resolve(
        import.meta.dirname,
        "../node_modules/viem/node_modules/@noble/curves/esm/secp256k1.js",
      ),
      "@noble/curves/abstract/utils": resolve(
        import.meta.dirname,
        "../node_modules/viem/node_modules/@noble/curves/esm/abstract/utils.js",
      ),
      "@noble/curves/p256": resolve(
        import.meta.dirname,
        "../node_modules/viem/node_modules/@noble/curves/esm/p256.js",
      ),
      "@noble/hashes/hmac": resolve(
        import.meta.dirname,
        "../node_modules/viem/node_modules/@noble/hashes/esm/hmac.js",
      ),
      "@noble/hashes/ripemd160": resolve(
        import.meta.dirname,
        "../node_modules/viem/node_modules/@noble/hashes/esm/ripemd160.js",
      ),
      "@noble/hashes/sha256": resolve(
        import.meta.dirname,
        "../node_modules/viem/node_modules/@noble/hashes/esm/sha256.js",
      ),
      "@noble/hashes/sha3": resolve(
        import.meta.dirname,
        "../node_modules/viem/node_modules/@noble/hashes/esm/sha3.js",
      ),
      dotenv: resolve(import.meta.dirname, "../src/lib/dotenv-browser-shim.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["@xmtp/browser-sdk", "@xmtp/wasm-bindings"],
  },
});
