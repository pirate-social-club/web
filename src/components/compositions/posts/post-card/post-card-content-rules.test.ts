import { describe, expect, test } from "bun:test";

import { buildPostCardTitleProps, postCardContentOwnsTitle } from "./post-card-content-rules";

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
});
