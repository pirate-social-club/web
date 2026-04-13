import { resolve } from "node:path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: resolve(__dirname),
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@pirate-web": resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: resolve(__dirname, "dist/desktop"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        desktop: resolve(__dirname, "desktop.html"),
      },
    },
  },
});
