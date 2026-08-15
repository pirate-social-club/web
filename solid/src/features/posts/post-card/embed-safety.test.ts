import { afterEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";

import {
  buildEmbedSparkline,
  buildSandboxedXEmbedSrcDoc,
  formatProbability,
  isClosedMarketStatus,
  isValidXEmbedHtml,
  resolveSafeYouTubeEmbed,
  resolveXTweetId,
} from "./embed-safety";

const originalDOMParser = globalThis.DOMParser;
const originalDocument = (globalThis as { document?: unknown }).document;

function installDom() {
  const dom = new JSDOM("<html><body></body></html>");
  Object.defineProperty(globalThis, "DOMParser", { configurable: true, value: dom.window.DOMParser });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "Element", { configurable: true, value: dom.window.Element });
  Object.defineProperty(globalThis, "Node", { configurable: true, value: dom.window.Node });
}

afterEach(() => {
  Object.defineProperty(globalThis, "DOMParser", { configurable: true, value: originalDOMParser });
  Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
});

describe("post card embed hardening", () => {
  test("accepts YouTube embed iframes from allowed hosts", () => {
    installDom();
    const embed = resolveSafeYouTubeEmbed(
      `<iframe title="Video" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0" onload="bad()"></iframe>`,
      "YouTube video",
    );

    expect(embed).toEqual({
      src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0",
      title: "Video",
    });
  });

  test("rejects YouTube iframe HTML from unexpected hosts and paths", () => {
    installDom();
    expect(resolveSafeYouTubeEmbed(`<iframe src="https://evil.example/embed/dQw4w9WgXcQ"></iframe>`, "YouTube video")).toBeNull();
    expect(resolveSafeYouTubeEmbed(`<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></iframe>`, "YouTube video")).toBeNull();
    expect(resolveSafeYouTubeEmbed(`<iframe src="javascript:alert(1)"></iframe>`, "YouTube video")).toBeNull();
  });

  test("accepts X blockquote HTML only inside a sandbox srcdoc", () => {
    installDom();

    const source = `
      <blockquote class="twitter-tweet" onclick="bad()">
        <script>alert(1)</script>
        <p dir="ltr" lang="en" style="color:red">
          Safe text
          <a href="javascript:alert(1)" onclick="bad()">bad</a>
          <a href="https://x.com/pirate/status/1" onclick="bad()">status</a>
        </p>
        <img src=x onerror="bad()" />
      </blockquote>
    `;
    const srcDoc = buildSandboxedXEmbedSrcDoc(source);

    expect(isValidXEmbedHtml(source)).toBe(true);
    expect(srcDoc).toContain(`class="twitter-tweet"`);
    expect(srcDoc?.includes(`onclick="bad()"`)).toBe(false);
    expect(srcDoc?.includes(`<script>alert(1)</script>`)).toBe(false);
    expect(srcDoc?.includes(`javascript:alert(1)`)).toBe(false);
    expect(srcDoc?.includes(`<img`)).toBe(false);
    expect(srcDoc).toContain(`https://x.com/pirate/status/1`);
    expect(srcDoc).toContain(`https://platform.x.com/widgets.js`);
    expect(srcDoc).toContain(`Content-Security-Policy`);
  });

  test("rejects X embed HTML without the official blockquote shape", () => {
    installDom();

    expect(isValidXEmbedHtml(`<div><a href="https://x.com/pirate/status/1">status</a></div>`)).toBe(false);
    expect(buildSandboxedXEmbedSrcDoc(`<div><a href="https://x.com/pirate/status/1">status</a></div>`)).toBeNull();
  });
});

describe("embed presentation helpers", () => {
  test("resolves tweet ids from canonical status URLs", () => {
    expect(resolveXTweetId("https://x.com/pirate/status/1234567890123456789")).toBe("1234567890123456789");
    expect(resolveXTweetId("https://twitter.com/Interior/status/463440424141459456")).toBe("463440424141459456");
    expect(resolveXTweetId("https://x.com/pirate")).toBeNull();
    expect(resolveXTweetId("not a url")).toBeNull();
  });

  test("formats probabilities as clamped percentages", () => {
    expect(formatProbability(0.42)).toBe("42%");
    expect(formatProbability(1.4)).toBe("100%");
    expect(formatProbability(-0.2)).toBe("0%");
    expect(formatProbability(null)).toBe("n/a");
  });

  test("builds sparkline paths from priced chart points", () => {
    const sparkline = buildEmbedSparkline([
      { ts: 1714000000, price: 0.2 },
      { ts: 1714086400, price: 0.6 },
      { ts: 1714172800, price: 0.4 },
    ], "en");
    expect(sparkline).not.toBeNull();
    expect(sparkline!.linePath.startsWith("M")).toBe(true);
    expect(sparkline!.areaPath.endsWith("Z")).toBe(true);
    expect(buildEmbedSparkline([{ ts: 1, price: 0.5 }], "en")).toBeNull();
  });

  test("recognizes closed market statuses", () => {
    expect(isClosedMarketStatus("closed")).toBe(true);
    expect(isClosedMarketStatus("Settled")).toBe(true);
    expect(isClosedMarketStatus("open")).toBe(false);
    expect(isClosedMarketStatus(null)).toBe(false);
  });
});
