import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { FormattedText } from "./formatted-text";

describe("FormattedText", () => {
  test("renders body section headings without document-level h1 elements", () => {
    const markup = renderToStaticMarkup(
      <FormattedText value={"# eZo Festival 2026\nIntro\n\n## Basic info\nBody\n\n### Los Refrescos -- live\nDetails"} />,
    );

    expect(markup).toContain("<h2");
    expect(markup).toContain("eZo Festival 2026</h2>");
    expect(markup).toContain("<h3");
    expect(markup).toContain("Basic info</h3>");
    expect(markup).toContain("<h4");
    expect(markup).toContain("Los Refrescos -- live</h4>");
    expect(markup).not.toContain("<h1");
  });

  test("renders inline formatting inside headings", () => {
    const markup = renderToStaticMarkup(
      <FormattedText value={"### **Session Victim** -- [RA](https://ra.co)"} />,
    );

    expect(markup).toContain("<h4");
    expect(markup).toContain("<strong>Session Victim</strong>");
    expect(markup).toContain('href="https://ra.co"');
  });

  test("allows long unbroken links to wrap inside narrow containers", () => {
    const markup = renderToStaticMarkup(
      <FormattedText value={"https://example.test/really/long/unbroken/path/that/should/not-expand-mobile-layout"} />,
    );

    expect(markup).toContain("break-words");
    expect(markup).toContain("[overflow-wrap:anywhere]");
  });

  test("applies wrapping directly to formatted blocks and markdown links", () => {
    const markup = renderToStaticMarkup(
      <FormattedText
        value={[
          "# A very long heading that should never widen the post card",
          "",
          "- [A long linked label that should wrap](https://example.test/really/long/unbroken/path)",
          "",
          "> https://example.test/really/long/unbroken/quote/path",
        ].join("\n")}
      />,
    );

    expect(markup.match(/break-words/g)?.length).toBeGreaterThanOrEqual(5);
    expect(markup.match(/\[overflow-wrap:anywhere\]/g)?.length).toBeGreaterThanOrEqual(5);
    expect(markup).toContain("<a");
    expect(markup).toContain("<blockquote");
  });
});
