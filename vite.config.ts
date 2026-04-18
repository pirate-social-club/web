import { resolve } from "node:path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { redwood } from "rwsdk/vite";

// Optional compatibility shim for the narrow `vite build --ssr src/worker.tsx`
// diagnostic path. The normal production build (`vite build`) does not need it
// and should run against rwsdk's native export conditions unmodified.
const clientWorkerShimPlugin = {
  name: "pirate:rwsdk-worker-client-shim",
  enforce: "pre" as const,
  applyToEnvironment(environment: { name: string }) {
    return environment.name === "client";
  },
  resolveId(id: string) {
    if (id === "rwsdk/worker") {
      return resolve(__dirname, "./src/lib/rwsdk-worker.client.ts");
    }

    if (id === "rwsdk/router") {
      return resolve(__dirname, "./src/lib/rwsdk-router.client.ts");
    }
  },
};

const privyServerAliasPlugin = {
  name: "pirate:privy-server-alias",
  enforce: "pre" as const,
  applyToEnvironment(environment: { name: string }) {
    return environment.name === "worker" || environment.name === "ssr";
  },
  resolveId(id: string) {
    if (id === "@privy-io/react-auth") {
      return resolve(__dirname, "./src/lib/auth/privy-react-auth.ssr.tsx");
    }
  },
};

const enableClientWorkerShim = process.env.PIRATE_ENABLE_RWSDK_CLIENT_SHIMS === "1";

export default defineConfig(() => ({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  environments: {
    ssr: {},
  },
  plugins: [
    ...(enableClientWorkerShim ? [clientWorkerShimPlugin] : []),
    privyServerAliasPlugin,
    cloudflare({
      viteEnvironment: { name: "worker" },
    }),
    redwood(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
}));
