import { describe, expect, test } from "bun:test";

import {
  buildPostCardTitleProps,
  formatByteSize,
  formatGenericAssetMeta,
  postCardContentOwnsTitle,
} from "./content-rules";

describe("post-card content rules", () => {
  test("lets live-room content own the title", () => {
    const content = {
      type: "live_room",
      accessMode: "free",
      liveRoomId: "lr_preview",
      status: "scheduled",
      title: "Friday night set",
    } as const;

    expect(postCardContentOwnsTitle(content)).toBe(true);
    expect(buildPostCardTitleProps({
      content,
      title: "Friday night set",
      titleDir: "ltr",
      titleHref: "/p/post",
      titleLang: "en",
    })).toEqual({
      title: undefined,
      titleDir: undefined,
      titleHref: undefined,
      titleLang: undefined,
    });
  });

  test("keeps outer titles for normal post content", () => {
    expect(buildPostCardTitleProps({
      content: { type: "text", body: "Body" },
      title: "Post title",
      titleDir: "ltr",
      titleHref: "/p/post",
      titleLang: "en",
    })).toEqual({
      title: "Post title",
      titleDir: "ltr",
      titleHref: "/p/post",
      titleLang: "en",
    });
  });

  test("formats byte sizes at human-readable scales", () => {
    expect(formatByteSize(0)).toBe("0 bytes");
    expect(formatByteSize(18)).toBe("18 bytes");
    expect(formatByteSize(1023)).toBe("1023 bytes");
    expect(formatByteSize(1024)).toBe("1 KB");
    expect(formatByteSize(1536)).toBe("1.5 KB");
    expect(formatByteSize(47_185_920)).toBe("45 MB");
    expect(formatByteSize(3_221_225_472)).toBe("3 GB");
  });

  test("joins known generic asset metadata and omits the line when absent", () => {
    expect(formatGenericAssetMeta("text/csv", 18)).toBe("text/csv · 18 bytes");
    expect(formatGenericAssetMeta("application/json", 2048)).toBe("application/json · 2 KB");
    expect(formatGenericAssetMeta("text/plain", null)).toBe("text/plain");
    expect(formatGenericAssetMeta(null, 512)).toBe("512 bytes");
    expect(formatGenericAssetMeta("  ", 512)).toBe("512 bytes");
    expect(formatGenericAssetMeta(null, null)).toBeUndefined();
    expect(formatGenericAssetMeta(undefined, -1)).toBeUndefined();
  });
});
