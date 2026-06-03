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
    expect(markup).toContain("one</li>");
    expect(markup).toContain("two</li>");
  });

  test("does not render age-gated video sources before proof", () => {
    const markup = renderToStaticMarkup(
      <VideoPostContent
        content={{
          type: "video",
          accessMode: "public",
          ageGatePolicy: "18_plus",
          ageGateViewerState: "proof_required",
          contentSafetyState: "adult",
          posterSrc: "https://example.test/adult-poster.jpg",
          src: "https://example.test/adult-video.mp4",
          title: "Video",
        }}
      />,
    );

    expect(markup).not.toContain("https://example.test/adult-poster.jpg");
    expect(markup).not.toContain("https://example.test/adult-video.mp4");
    expect(markup).toContain('role="img"');
    expect(markup).toContain("18+ to View");
  });

  test("renders portrait video thumbnails with constrained width", () => {
    const markup = renderToStaticMarkup(
      <VideoPostContent
        content={{
          type: "video",
          accessMode: "public",
          aspectRatio: 9 / 16,
          posterSrc: "https://example.test/portrait-poster.jpg",
          src: "https://example.test/portrait-video.mp4",
          title: "Portrait video",
        }}
      />,
    );

    expect(markup).toContain("max-w-[22rem]");
    expect(markup).toContain("aspect-ratio:0.5625");
    expect(markup).toContain("object-contain");
  });
});
