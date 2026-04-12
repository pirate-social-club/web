import { spawn } from "node:child_process";
import { resolve } from "node:path";
import net from "node:net";

const cleanedEnv = { ...process.env };
const DEV_PORT = 5173;
const DEV_ORIGIN = `http://127.0.0.1:${DEV_PORT}`;

for (const key of [
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "NO_PROXY",
  "http_proxy",
  "https_proxy",
  "all_proxy",
  "no_proxy",
]) {
  delete cleanedEnv[key];
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: cleanedEnv,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited with signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code ?? 1}`));
        return;
      }

      resolve();
    });
  });
}

function isPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "127.0.0.1");
  });
}

async function canReuseExistingDevServer() {
  try {
    const response = await fetch(`${DEV_ORIGIN}/src/client.tsx`, {
      method: "HEAD",
    });

    return response.ok;
  } catch {
    return false;
  }
}

await run("bun", ["run", "locales:generate"]);

if (!await isPortAvailable(DEV_PORT)) {
  if (await canReuseExistingDevServer()) {
    console.log(`Reusing existing pirate-web dev server on ${DEV_ORIGIN}`);
    process.exit(0);
  }

  throw new Error(`Port ${DEV_PORT} is already in use. Stop the other process or reuse the running server at ${DEV_ORIGIN}.`);
}

const viteBin = resolve(import.meta.dirname, "../node_modules/.bin/vite");
const userArgs = process.argv.slice(2);
const modeArgs = userArgs.includes("--mode") ? [] : ["--mode", "local-sqlite"];
await run(viteBin, ["--port", String(DEV_PORT), "--strictPort", ...modeArgs, ...userArgs]);
