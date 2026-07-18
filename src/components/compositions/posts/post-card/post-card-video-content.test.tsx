import "@/test/setup-runtime";

import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

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

  test("preserves a portrait aspect ratio when remote playback expands", async () => {
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
      expect(renderedPlayerProps?.className).toBe("rounded-none");
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

  test("renders separate song and artist links without requiring a video mode", () => {
    const markup = renderToStaticMarkup(
      <VideoPostContent
        content={{
          type: "video",
          accessMode: "public",
          src: "https://example.test/video.mp4",
          upstreamAttributions: [{
            assetId: "asset_song",
            relationshipType: "references_song",
            title: "Midnight Signal",
            artist: "artist.pirate",
            artistHref: "/u/artist.pirate",
            href: "/p/source-song",
          }],
        }}
      />,
    );

    expect(markup).toContain("Midnight Signal");
    expect(markup).toContain("artist.pirate");
    expect(markup).not.toContain("remix");
    expect(markup).toContain('href="/p/source-song"');
    expect(markup).toContain('href="/u/artist.pirate"');
  });
});
