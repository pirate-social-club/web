import net from "node:net";
import { spawn } from "node:child_process";

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not determine an ephemeral preview port"));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

const port = await freePort();
const preview = spawn(
  "bun",
  ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(port)],
  { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] },
);
const output = [];
preview.stdout.on("data", chunk => output.push(chunk.toString()));
preview.stderr.on("data", chunk => output.push(chunk.toString()));

async function fetchRoot() {
  const response = await fetch(`http://127.0.0.1:${port}/`);
  return { response, body: await response.text() };
}

let result;
try {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) {
      throw new Error(`Preview exited before serving /:\n${output.join("")}`);
    }
    try {
      result = await fetchRoot();
      break;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  if (!result) throw new Error(`Preview did not serve / within 30s:\n${output.join("")}`);

  const shellMarker = 'data-layout="app-shell"';
  const fallbackText = "App shell unavailable";
  const hasShell = result.body.includes(shellMarker);
  const hasFallback = result.body.includes(fallbackText);
  if (!result.response.ok || !hasShell || hasFallback) {
    throw new Error([
      `SSR root assertion failed (status ${result.response.status})`,
      `hasShell=${hasShell}`,
      `hasFallback=${hasFallback}`,
    ].join("; "));
  }
  console.log(`Solid SSR assertion passed (status ${result.response.status}, app shell present, fallback absent)`);
} finally {
  if (preview.exitCode === null) preview.kill("SIGTERM");
}
