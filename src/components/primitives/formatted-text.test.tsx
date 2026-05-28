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
});
