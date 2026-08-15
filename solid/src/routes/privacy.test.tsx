import { describe, expect, test } from "bun:test";
import { parsePrivacyPolicy } from "../features/privacy-policy";

describe("privacy route", () => {
  test("preserves the legal document's heading and list structure", () => {
    const blocks = parsePrivacyPolicy(`# Privacy Policy\n\nIntro text.\n\n## 1. Scope\n\n- First item\n- Second item`);

    expect(blocks).toEqual([
      { type: "heading", level: 1, text: "Privacy Policy" },
      { type: "paragraph", text: "Intro text." },
      { type: "heading", level: 2, text: "1. Scope" },
      { type: "list", items: ["First item", "Second item"] },
    ]);
  });
});
