import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const localShellTemplatePath = resolve(__dirname, "local-index.html")
const staticAssetPattern = /\.(?:avif|bmp|css|gif|ico|jpe?g|js|json|map|mjs|png|svg|txt|webp|woff2?)$/i
const devOptimizeIncludes = ["@privy-io/react-auth", "eventemitter3"]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    appType: "custom",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      "process.env.PRIVY_APP_ID": JSON.stringify(env.VITE_PRIVY_APP_ID ?? ""),
    },
    optimizeDeps: {
      include: devOptimizeIncludes,
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "pirate-local-shell-fallback",
        configureServer(server) {
          const templatePromise = readFile(localShellTemplatePath, "utf8")

          server.middlewares.use(async (req, res, next) => {
            const method = req.method?.toUpperCase();
            const requestUrl = req.url ?? "/"
            const pathname = new URL(requestUrl, "http://127.0.0.1").pathname

            if ((method !== "GET" && method !== "HEAD") || pathname.startsWith("/@") || pathname.startsWith("/src/") || pathname.startsWith("/node_modules/") || staticAssetPattern.test(pathname)) {
              next();
              return;
            }

            const template = await templatePromise
            const html = await server.transformIndexHtml(requestUrl, template)
            res.statusCode = 200
            res.setHeader("content-type", "text/html; charset=utf-8")
            res.end(method === "HEAD" ? undefined : html)
          });
        },
      },
    ],
  };
});
