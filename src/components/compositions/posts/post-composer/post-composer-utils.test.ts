import { describe, expect, test } from "bun:test";

import {
  canAdvanceComposerWriteStep,
  normalizeHttpUrl,
} from "./post-composer-utils";

describe("post composer link URLs", () => {
  test("normalizes schemeless link posts to https URLs", () => {
    expect(normalizeHttpUrl("example.com/story")).toBe("https://example.com/story");
    expect(normalizeHttpUrl("localhost:5173/submit")).toBe("https://localhost:5173/submit");
    expect(normalizeHttpUrl(" https://example.com/story ")).toBe("https://example.com/story");
  });

  test("allows schemeless links to advance from the write step", () => {
    expect(canAdvanceComposerWriteStep({
      body: "",
      imageUploadPresent: false,
      linkUrl: "example.com/story",
      mode: "link",
      songAudioUploadPresent: false,
      title: "",
      videoUploadPresent: false,
    })).toBe(true);
  });

  test("rejects non-web link input", () => {
    expect(normalizeHttpUrl("mailto:test@example.com")).toBeNull();
    expect(normalizeHttpUrl("sdkljfn")).toBeNull();
    expect(canAdvanceComposerWriteStep({
      body: "",
      imageUploadPresent: false,
      linkUrl: "sdkljfn",
      mode: "link",
      songAudioUploadPresent: false,
      title: "",
      videoUploadPresent: false,
    })).toBe(false);
  });
});
