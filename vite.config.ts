import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { redwood } from "rwsdk/vite";

const devOptimizeIncludes = ["@privy-io/react-auth", "eventemitter3"];
const ssrExternals = [
  "@privy-io/react-auth",
  "@selfxyz/qrcode",
  "@veryai/widget",
];
const workerEntryPath = resolve(
  __dirname,
  "./node_modules/rwsdk/dist/runtime/entries/worker.js",
);
const workerRouterEntryPath = resolve(
  __dirname,
  "./node_modules/rwsdk/dist/runtime/entries/router.js",
);
const workerSsrBridgePath = resolve(
  __dirname,
  "./node_modules/rwsdk/dist/__intermediate_builds/ssr/ssr_bridge.js",
);
const asyncHooksStubPath = resolve(__dirname, "./src/lib/build-stubs/async-hooks.ts");
const cloudflareWorkersStubPath = resolve(__dirname, "./src/lib/build-stubs/cloudflare-workers.ts");
const xmlHttpRequestSslStubPath = resolve(__dirname, "./src/lib/build-stubs/xmlhttprequest-ssl.ts");
const qrcodeBrowserPath = resolve(__dirname, "./node_modules/qrcode/lib/browser.js");
const pinoBrowserPath = resolve(__dirname, "./node_modules/pino/browser.js");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      "process.env.PRIVY_APP_ID": JSON.stringify(env.VITE_PRIVY_APP_ID ?? ""),
    },
    optimizeDeps: {
      include: devOptimizeIncludes,
    },
    ssr: {
      external: ssrExternals,
      optimizeDeps: {
        include: devOptimizeIncludes,
      },
    },
    environments: {
      ssr: {
        optimizeDeps: {
          include: devOptimizeIncludes,
        },
      },
    },
    plugins: [
      {
        name: "resolve-rwsdk-worker-entry",
        enforce: "pre",
        resolveId(source, importer, options) {
          if (
            source === "rwsdk/worker"
            && importer?.endsWith("/src/worker.tsx")
          ) {
            return workerEntryPath;
          }

          if (
            source === "rwsdk/router"
            && importer?.endsWith("/src/worker.tsx")
          ) {
            return workerRouterEntryPath;
          }

          if (source === workerSsrBridgePath) {
            return workerSsrBridgePath;
          }

          if (!options?.ssr && source === "async_hooks") {
            return asyncHooksStubPath;
          }

          if (!options?.ssr && source === "cloudflare:workers") {
            return cloudflareWorkersStubPath;
          }

          if (source === "qrcode" || source === "qrcode/lib/index.js") {
            return qrcodeBrowserPath;
          }

          return null;
        },
      },
      cloudflare({
        viteEnvironment: { name: "worker" },
      }),
      redwood(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "@phosphor-icons/react": resolve(
          __dirname,
          "./node_modules/@phosphor-icons/react/dist/ssr/index.es.js",
        ),
        "socket.io-client": resolve(
          __dirname,
          "./node_modules/socket.io-client/build/esm/index.js",
        ),
        "engine.io-client": resolve(
          __dirname,
          "./node_modules/engine.io-client/build/esm/index.js",
        ),
        pino: pinoBrowserPath,
        "pino/browser": pinoBrowserPath,
        "xmlhttprequest-ssl": xmlHttpRequestSslStubPath,
        qrcode: qrcodeBrowserPath,
        "qrcode/lib/index.js": qrcodeBrowserPath,
      },
    },
  };
});
