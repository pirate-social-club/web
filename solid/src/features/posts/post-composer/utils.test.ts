import { describe, expect, test } from "bun:test";

import {
  canAdvanceComposerWriteStep,
  canSubmitLiveRoomDraft,
  getNextComposerStep,
  getPreviousComposerStep,
  normalizeHttpUrl,
  normalizePriceInput,
  normalizeRoyaltyInput,
  normalizeSecondsInput,
} from "./utils";

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

  test("requires a file upload before a downloadable file can advance", () => {
    const shared = {
      body: "",
      imageUploadPresent: false,
      linkUrl: "",
      songAudioUploadPresent: false,
      title: "Export",
      videoUploadPresent: false,
    };
    expect(canAdvanceComposerWriteStep({ ...shared, fileUploadPresent: false, mode: "file" })).toBe(false);
    expect(canAdvanceComposerWriteStep({ ...shared, fileUploadPresent: true, mode: "file" })).toBe(true);
  });

  test("blocks paid live drafts until the author explicitly selects public visibility", () => {
    const draft = {
      accessMode: "paid" as const,
      performerAllocations: [{ role: "host" as const, sharePct: 100, userId: "host-1" }],
      roomKind: "solo" as const,
      setlistItems: [{ performanceKind: "unknown" as const, titleText: "A song" }],
      setlistStatus: "ready" as const,
      visibility: "unlisted" as const,
    };

    expect(canSubmitLiveRoomDraft(draft, "Live set")).toBe(false);
    expect(canSubmitLiveRoomDraft({ ...draft, visibility: "public" }, "Live set")).toBe(true);
  });
});

describe("composer step navigation", () => {
  test("song and video insert the details step between write and settings", () => {
    expect(getNextComposerStep("write", "song")).toBe("details");
    expect(getNextComposerStep("write", "video")).toBe("details");
    expect(getNextComposerStep("write", "text")).toBe("settings");
    expect(getNextComposerStep("details", "song")).toBe("settings");
    expect(getNextComposerStep("settings", "song")).toBe("publish");
    expect(getNextComposerStep("publish", "song")).toBe("publish");
  });

  test("back navigation mirrors the forward path", () => {
    expect(getPreviousComposerStep("details", "video")).toBe("write");
    expect(getPreviousComposerStep("settings", "video")).toBe("details");
    expect(getPreviousComposerStep("settings", "text")).toBe("write");
    expect(getPreviousComposerStep("publish", "song")).toBe("settings");
    expect(getPreviousComposerStep("write", "text")).toBeUndefined();
  });
});

describe("input normalizers", () => {
  test("normalizePriceInput keeps two decimals and strips non-numerics", () => {
    expect(normalizePriceInput("abc")).toBe("");
    expect(normalizePriceInput("12")).toBe("12");
    expect(normalizePriceInput("12.3")).toBe("12.3");
    expect(normalizePriceInput("12.345")).toBe("12.34");
    expect(normalizePriceInput("$4.99")).toBe("4.99");
  });

  test("normalizeRoyaltyInput clamps to 0–100 whole percents", () => {
    expect(normalizeRoyaltyInput("")).toBe("");
    expect(normalizeRoyaltyInput("15")).toBe("15");
    expect(normalizeRoyaltyInput("150")).toBe("100");
    expect(normalizeRoyaltyInput("4.5")).toBe("45");
  });

  test("normalizeSecondsInput clamps to one day and strips non-digits", () => {
    expect(normalizeSecondsInput("abc")).toBe("");
    expect(normalizeSecondsInput("42")).toBe("42");
    expect(normalizeSecondsInput("90000")).toBe("86400");
  });
});
