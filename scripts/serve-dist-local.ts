import { fileURLToPath } from "node:url";
import { join, normalize, resolve } from "node:path";

const rootDir = resolve(fileURLToPath(new URL("../dist/client/", import.meta.url)));
const indexPath = join(rootDir, "index.html");
const port = Number(process.env.PORT || "5173");

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`PORT must be a positive integer, received: ${process.env.PORT ?? ""}`);
}

function resolveRequestPath(pathname: string): string {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/u, "");
  const absolute = normalize(join(rootDir, relative));
  if (!absolute.startsWith(rootDir)) {
    return indexPath;
  }
  return absolute;
}

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const candidatePath = resolveRequestPath(url.pathname);
    const candidateFile = Bun.file(candidatePath);

    if (await candidateFile.exists()) {
      return new Response(candidateFile);
    }

    return new Response(Bun.file(indexPath), {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  },
});

console.log(`pirate-web dist server listening on http://127.0.0.1:${server.port}`);
