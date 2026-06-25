import { execFileSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium, expect, test, type Browser } from "@playwright/test";

/**
 * Real-browser smoke test for the Phase 5.2 capture worklet (audit gate): bundles
 * the ACTUAL `karaoke-capture-processor` (DSP inlined), runs it in headless
 * Chromium against a fake microphone, and asserts the engine protocol produces
 * PCM16 mono 16 kHz chunks with trailing-edge timestamps + a drained flush tail.
 *
 * Self-contained: launches its own browser (with fake-media flags) and HTTP
 * server, so it doesn't depend on the app dev server. Requires `bun` on PATH to
 * bundle the worklet. Run: `bunx playwright test e2e/karaoke-capture-worklet.spec.ts`.
 */

const PROCESSOR = "src/components/compositions/karaoke/capture/karaoke-capture-processor.ts";

function bundleWorklet(): string {
  const out = join(mkdtempSync(join(tmpdir(), "kworklet-")), "worklet.js");
  execFileSync("bun", ["build", PROCESSOR, "--target=browser", `--outfile=${out}`], { stdio: "pipe" });
  return readFileSync(out, "utf8");
}

function pageHtml(): string {
  return `<!doctype html><html><body><script type="module">
window.__chunks = []; window.__flushed = false; window.__rate = 0;
window.run = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } });
  const ctx = new AudioContext({ sampleRate: 16000 });
  window.__rate = ctx.sampleRate;
  await ctx.audioWorklet.addModule('/worklet.js');
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'karaoke-capture-processor');
  node.port.onmessage = (e) => {
    const d = e.data;
    if (d.type === 'chunk') window.__chunks.push({ bytes: d.pcm16.byteLength, capturedAtMs: d.capturedAtMs, epoch: d.epoch });
    if (d.type === 'flushed') window.__flushed = true;
  };
  src.connect(node); node.connect(ctx.destination);
  node.port.postMessage({ type: 'configure', inputRate: ctx.sampleRate, chunkSamples: 1600 });
  node.port.postMessage({ type: 'activate', epoch: 1, startTimeMs: 0 });
  await ctx.resume();
  window.__deactivate = () => node.port.postMessage({ type: 'deactivate', epoch: 1 });
};
</script></body></html>`;
}

let browser: Browser;
let server: Server;
let baseUrl = "";

test.beforeAll(async () => {
  const worklet = bundleWorklet();
  const html = pageHtml();
  server = createServer((req, res) => {
    if ((req.url ?? "").startsWith("/worklet.js")) {
      res.setHeader("content-type", "text/javascript");
      res.end(worklet);
    } else {
      res.setHeader("content-type", "text/html");
      res.end(html);
    }
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://localhost:${port}/`;
  browser = await chromium.launch({
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
  });
});

test.afterAll(async () => {
  await browser?.close();
  server?.close();
});

test("the capture worklet produces PCM16 16kHz chunks with trailing-edge timestamps + flush tail", async () => {
  const page = await browser.newPage();
  await page.goto(baseUrl);
  await page.evaluate(() => (window as unknown as { run: () => Promise<void> }).run());
  await page.waitForTimeout(1_500); // ~1.5 s of fake-mic audio
  await page.evaluate(() => (window as unknown as { __deactivate: () => void }).__deactivate());
  await page.waitForTimeout(200);

  const result = await page.evaluate(() => {
    const w = window as unknown as { __rate: number; __flushed: boolean; __chunks: { bytes: number; capturedAtMs: number; epoch: number }[] };
    return { chunks: w.__chunks, flushed: w.__flushed, rate: w.__rate };
  });

  expect(result.rate).toBe(16_000); // native-16k context honored
  const full = result.chunks.filter((c) => c.bytes === 3_200); // 1600 samples × 2 bytes
  expect(full.length).toBeGreaterThanOrEqual(10); // ~1.5 s / 100 ms
  expect(full.every((c) => c.epoch === 1)).toBe(true);

  // Trailing-edge timestamps: first full chunk ends at 100 ms, then +100 ms steps.
  expect(full[0]!.capturedAtMs).toBe(100);
  for (let i = 1; i < full.length; i += 1) {
    expect(full[i]!.capturedAtMs - full[i - 1]!.capturedAtMs).toBe(100);
  }

  // Deactivate drained the resampler/chunker tail (a short final chunk) + acked.
  expect(result.flushed).toBe(true);
  const tail = result.chunks[result.chunks.length - 1]!;
  expect(tail.bytes).toBeLessThan(3_200);
  expect(tail.bytes).toBeGreaterThan(0);

  await page.close();
});
