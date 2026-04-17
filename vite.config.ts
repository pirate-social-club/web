import { resolve } from "node:path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { redwood } from "rwsdk/vite";

export default defineConfig(({ isSsrBuild }) => ({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  environments: {
    ssr: {},
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "worker" },
    }),
    redwood(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      ...(isSsrBuild
        ? {
            "@privy-io/react-auth": resolve(__dirname, "./src/lib/auth/privy-react-auth.ssr.tsx"),
          }
        : {}),
    },
  },
}));
