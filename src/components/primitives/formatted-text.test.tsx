import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { FormattedText } from "./formatted-text";

describe("FormattedText", () => {
  test("renders body section headings without promoting single hash lines", () => {
    const markup = renderToStaticMarkup(
      <FormattedText value={"## Lineup\nBody\n\n### Los Refrescos -- live\nDetails\n\n# Literal"} />,
    );

    expect(markup).toContain("<h2");
    expect(markup).toContain("Lineup</h2>");
    expect(markup).toContain("<h3");
    expect(markup).toContain("Los Refrescos -- live</h3>");
    expect(markup).toContain("# Literal");
    expect(markup).not.toContain("<h1");
  });

  test("renders inline formatting inside headings", () => {
    const markup = renderToStaticMarkup(
      <FormattedText value={"### **Session Victim** -- [RA](https://ra.co)"} />,
    );

    expect(markup).toContain("<h3");
    expect(markup).toContain("<strong>Session Victim</strong>");
    expect(markup).toContain('href="https://ra.co"');
  });
});
