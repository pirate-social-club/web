import http from "node:http";
import { startSolidBoundaryHarness } from "./local-boundary-harness.mjs";

const externalBase = process.env.SOLID_BOUNDARY_BASE_URL;
const harness = externalBase ? null : await startSolidBoundaryHarness();
const url = new URL(externalBase ?? harness.baseUrl);
const started = performance.now();
const chunks = [];
try {
await new Promise((resolve, reject) => {
  const request = http.request({ hostname: url.hostname, port: url.port, path: url.pathname, headers: { host: "app.example.hns" } }, response => {
    response.on("data", chunk => chunks.push({ at: performance.now() - started, bytes: chunk.length }));
    response.on("end", resolve);
  });
  request.on("error", reject);
  request.end();
});
const first = chunks[0]?.at ?? 0;
const last = chunks.at(-1)?.at ?? first;
const result = { chunks: chunks.length, firstMs: Math.round(first), spanMs: Math.round(last - first), chunkTimesMs: chunks.map(chunk => Math.round(chunk.at)), bytes: chunks.reduce((sum, chunk) => sum + chunk.bytes, 0) };
console.log(JSON.stringify(result));
if (chunks.length < 2 || result.spanMs < 1) process.exitCode = 1;
} finally {
  await harness?.close();
}
