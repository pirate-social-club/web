import { describe, expect, test } from "bun:test";
import { parseHTML } from "linkedom";

import {
  resolveSafeYouTubeEmbed,
  sanitizeXEmbedHtml,
} from "./post-card-embed";

const originalDocument = globalThis.document;
const originalDOMParser = globalThis.DOMParser;
const originalElement = globalThis.Element;
const originalNode = globalThis.Node;

function installDom() {
  const { document, DOMParser, Element, Node } = parseHTML("<html><body></body></html>");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: document,
  });
  Object.defineProperty(globalThis, "DOMParser", {
    configurable: true,
    value: DOMParser,
  });
  Object.defineProperty(globalThis, "Element", {
    configurable: true,
    value: Element,
  });
  Object.defineProperty(globalThis, "Node", {
    configurable: true,
    value: Node,
  });
}

function restoreDom() {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: originalDocument,
  });
  Object.defineProperty(globalThis, "DOMParser", {
    configurable: true,
    value: originalDOMParser,
  });
  Object.defineProperty(globalThis, "Element", {
    configurable: true,
    value: originalElement,
  });
  Object.defineProperty(globalThis, "Node", {
    configurable: true,
    value: originalNode,
  });
}

describe("post card embed hardening", () => {
  test("accepts YouTube embed iframes from allowed hosts", () => {
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
    expect(resolveSafeYouTubeEmbed(`<iframe src="https://evil.example/embed/dQw4w9WgXcQ"></iframe>`, "YouTube video")).toBeNull();
    expect(resolveSafeYouTubeEmbed(`<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></iframe>`, "YouTube video")).toBeNull();
    expect(resolveSafeYouTubeEmbed(`<iframe src="javascript:alert(1)"></iframe>`, "YouTube video")).toBeNull();
  });

  test("sanitizes X blockquote HTML before widget hydration", () => {
    installDom();

    try {
      const sanitized = sanitizeXEmbedHtml(`
        <blockquote class="twitter-tweet" onclick="bad()">
          <script>alert(1)</script>
          <p dir="ltr" lang="en" style="color:red">
            Safe text
            <a href="javascript:alert(1)" onclick="bad()">bad</a>
            <a href="https://x.com/pirate/status/1" onclick="bad()">status</a>
          </p>
          <img src=x onerror="bad()" />
        </blockquote>
      `);

      expect(sanitized).toContain(`class="twitter-tweet"`);
      expect(sanitized).toContain(`Safe text`);
      expect(sanitized).toContain(`href="https://x.com/pirate/status/1"`);
      expect(sanitized?.includes("script")).toBe(false);
      expect(sanitized?.includes("onclick")).toBe(false);
      expect(sanitized?.includes("javascript:")).toBe(false);
      expect(sanitized?.includes("onerror")).toBe(false);
      expect(sanitized?.includes("style=")).toBe(false);
    } finally {
      restoreDom();
    }
  });

  test("rejects X embed HTML without the official blockquote shape", () => {
    installDom();

    try {
      expect(sanitizeXEmbedHtml(`<div><a href="https://x.com/pirate/status/1">status</a></div>`)).toBeNull();
    } finally {
      restoreDom();
    }
  });
});
