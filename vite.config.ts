import { resolve } from "node:path";
import { defineConfig } from "vite";
import { resolveInitialModulePreloadDependencies } from "./src/lib/performance/initial-module-preload";
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

const browserOnlySdkModuleIds = new Set([
  "@selfxyz/qrcode",
  "@story-protocol/core-sdk",
  "@veryai/widget",
  "@vidstack/react",
  "@vidstack/react/player/layouts/default",
  "@zkpassport/sdk",
  "agora-rtc-sdk-ng",
]);

const browserSdkServerAliasPlugin = {
  name: "pirate:browser-sdk-server-alias",
  enforce: "pre" as const,
  applyToEnvironment(environment: { name: string }) {
    return environment.name === "worker" || environment.name === "ssr";
  },
  resolveId(id: string) {
    if (browserOnlySdkModuleIds.has(id)) {
      return resolve(__dirname, "./src/lib/ssr/browser-sdk.ssr.tsx");
    }
  },
};

// The lightweight AGENTS.md verification command builds `src/worker.tsx` via
// the client pipeline first, which resolves `rwsdk/worker` through the default
// export condition instead of the worker condition. Enable the browser-side
// stubs automatically for that exact diagnostic path so the recommended local
// verification command works without extra env setup.
const isWorkerDiagnosticBuild =
  process.argv.includes("--ssr") && process.argv.includes("src/worker.tsx");
const enableClientWorkerShim =
  process.env.PIRATE_ENABLE_RWSDK_CLIENT_SHIMS === "1" || isWorkerDiagnosticBuild;

export default defineConfig(() => ({
  root: __dirname,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  optimizeDeps: {
    exclude: ["@xmtp/wasm-bindings", "@xmtp/browser-sdk"],
    include: ["@xmtp/proto"],
  },
  environments: {
    ssr: {},
  },
  build: {
    manifest: true,
    modulePreload: {
      resolveDependencies: (_url, dependencies) => resolveInitialModulePreloadDependencies(dependencies),
    },
    rolldownOptions: {
      checks: {
        // Privy's published bundles contain misplaced PURE comments. Rolldown
        // already ignores those annotations, but rendering each diagnostic
        // dumps enormous single-line dependency sources and can make the
        // production build process exit before deployment.
        invalidAnnotation: false,
      },
    },
  },
  plugins: [
    ...(enableClientWorkerShim ? [clientWorkerShimPlugin] : []),
    privyServerAliasPlugin,
    browserSdkServerAliasPlugin,
    cloudflare({
      viteEnvironment: { name: "worker" },
    }),
    redwood(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      dotenv: resolve(__dirname, "./src/lib/dotenv-browser-shim.ts"),
    },
    dedupe: ["viem"],
  },
}));
