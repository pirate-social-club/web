import "@/test/setup-runtime";

import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import * as React from "react";

let renderedPlayerProps: Record<string, unknown> | undefined;

mock.module("@/components/compositions/posts/video-player", () => ({
  VideoPlayer: (props: Record<string, unknown>) => {
    renderedPlayerProps = props;
    const aspectRatio = typeof props.aspectRatio === "number" ? props.aspectRatio : undefined;
    return (
      <div
        className={aspectRatio ? "vp-player" : "vp-player aspect-video"}
        data-video-object-fit={aspectRatio && aspectRatio < 1 ? "contain" : "cover"}
        style={aspectRatio ? { aspectRatio } : undefined}
      />
    );
  },
}));

const { VideoPostContent } = await import("./post-card-video-content");

afterEach(() => {
  renderedPlayerProps = undefined;
  cleanup();
});

describe("VideoPostContent playback aspect ratio", () => {
  test("preserves a portrait aspect ratio while loading and after remote playback expands", async () => {
    const view = render(
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

    const playButton = view.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Play Portrait video"]',
    );
    expect(playButton).not.toBeNull();
    fireEvent.click(playButton!);

    const loadingFallback = view.container.querySelector<HTMLElement>('[aria-busy="true"]');
    expect(loadingFallback?.style.aspectRatio).toBe("0.5625");
    expect(loadingFallback?.className).not.toContain("aspect-video");

    await waitFor(() => {
      const player = view.container.querySelector<HTMLElement>(".vp-player");
      expect(player).not.toBeNull();
      expect(player?.style.aspectRatio).toBe("0.5625");
      expect(player?.className).not.toContain("aspect-video");
      expect(player?.dataset.videoObjectFit).toBe("contain");
      expect(renderedPlayerProps?.aspectRatio).toBe(9 / 16);
    });
  });

  test("keeps the 16:9 player fallback when media dimensions are unavailable", async () => {
    const view = render(
      <VideoPostContent
        content={{
          type: "video",
          accessMode: "public",
          src: "https://example.test/legacy-video.mp4",
          title: "Legacy video",
        }}
      />,
    );

    const playButton = view.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Play Legacy video"]',
    );
    expect(playButton).not.toBeNull();
    fireEvent.click(playButton!);

    await waitFor(() => {
      const player = view.container.querySelector<HTMLElement>(".vp-player");
      expect(player).not.toBeNull();
      expect(player?.className).toContain("aspect-video");
      expect(renderedPlayerProps?.aspectRatio).toBeUndefined();
    });
  });
});
