import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { VideoPostContent } from "./post-card-video-content";

describe("VideoPostContent", () => {
  test("renders video captions with formatted text", () => {
    const markup = renderToStaticMarkup(
      <VideoPostContent
        content={{
          type: "video",
          accessMode: "public",
          caption: "First line\n\n- one\n- two",
          src: "https://example.test/video.mp4",
          title: "Video",
        }}
      />,
    );

    expect(markup).toContain("First line");
    expect(markup).toContain("<ul");
    expect(markup).toContain("<li>one</li>");
    expect(markup).toContain("<li>two</li>");
  });
});
