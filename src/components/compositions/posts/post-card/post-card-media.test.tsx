import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PostCardMedia } from "./post-card-media";

describe("PostCardMedia", () => {
  test("renders song content eagerly instead of a lazy fallback", () => {
    const markup = renderToStaticMarkup(
      <PostCardMedia
        content={{
          type: "song",
          title: "4D Monster Lobsters - Travel Guide",
          accessMode: "public",
          artworkSrc: "https://example.test/cover.jpg",
          contentSafetyState: "safe",
          ageGatePolicy: "none",
        }}
      />,
    );

    expect(markup).toContain("4D Monster Lobsters - Travel Guide");
    expect(markup).toContain("https://example.test/cover.jpg");
    expect(markup).toContain("aria-label=\"Play\"");
  });

  test("renders a locked placeholder without fetching adult image when age proof is required", () => {
    const markup = renderToStaticMarkup(
      <PostCardMedia
        content={{
          type: "image",
          alt: "adult image",
          src: "https://example.test/adult.jpg",
          ageGatePolicy: "18_plus",
          ageGateViewerState: "proof_required",
          contentSafetyState: "adult",
        }}
      />,
    );

    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("https://example.test/adult.jpg");
    expect(markup).toContain('role="img"');
    expect(markup).toContain("18+ to View");
    expect(markup).toContain("shadow-lg");
  });

  test("enables age verification when a launch callback is provided", () => {
    const markup = renderToStaticMarkup(
      <PostCardMedia
        content={{
          type: "image",
          alt: "adult image",
          src: "https://example.test/adult.jpg",
          ageGatePolicy: "18_plus",
          ageGateViewerState: "proof_required",
          contentSafetyState: "adult",
          onVerifyAge: () => undefined,
        }}
      />,
    );

    expect(markup).toContain("18+ to View");
    expect(markup).not.toContain("disabled=\"\"");
  });

  test("renders adult images unblurred for verified viewers", () => {
    const markup = renderToStaticMarkup(
      <PostCardMedia
        content={{
          type: "image",
          alt: "adult image",
          src: "https://example.test/adult.jpg",
          ageGatePolicy: "18_plus",
          ageGateViewerState: "verified_allowed",
          contentSafetyState: "adult",
        }}
      />,
    );

    expect(markup).toContain("<img");
    expect(markup).toContain("https://example.test/adult.jpg");
    expect(markup).not.toContain("18+ to View");
    expect(markup).not.toContain("blur-md saturate-0");
  });

  test("renders image captions with formatted text", () => {
    const markup = renderToStaticMarkup(
      <PostCardMedia
        content={{
          type: "image",
          alt: "image",
          src: "https://example.test/image.jpg",
          caption: "First line\n\n- one\n- two",
        }}
      />,
    );

    expect(markup).toContain("First line");
    expect(markup).toContain("<ul");
    expect(markup).toContain("<li>one</li>");
    expect(markup).toContain("<li>two</li>");
  });
});
