import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PostCardMedia } from "./post-card-media";

describe("PostCardMedia", () => {
  test("does not fetch an adult crosspost thumbnail before age verification", () => {
    const markup = renderToStaticMarkup(
      <PostCardMedia
        content={{
          type: "crosspost",
          source: {
            status: "available",
            communityLabel: "c/source",
            title: "Adult source",
            thumbnailSrc: "https://example.test/adult-crosspost.jpg",
            contentSafetyState: "adult",
            ageGatePolicy: "18_plus",
            ageGateViewerState: "proof_required",
          },
        }}
      />,
    );

    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("https://example.test/adult-crosspost.jpg");
    expect(markup).toContain("Adult source");
  });

  test("renders an adult crosspost thumbnail for a verified viewer", () => {
    const markup = renderToStaticMarkup(
      <PostCardMedia
        content={{
          type: "crosspost",
          source: {
            status: "available",
            communityLabel: "c/source",
            title: "Adult source",
            thumbnailSrc: "https://example.test/adult-crosspost.jpg",
            contentSafetyState: "adult",
            ageGatePolicy: "18_plus",
            ageGateViewerState: "verified_allowed",
          },
        }}
      />,
    );

    expect(markup).toContain("<img");
    expect(markup).toContain("https://example.test/adult-crosspost.jpg");
  });

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
    expect(markup).toContain(">one</li>");
    expect(markup).toContain(">two</li>");
    expect(markup).toContain("break-words");
  });

  test("wraps long link preview text without widening mobile cards", () => {
    const longUrl = "https://example.test/really/long/unbroken/path/that/should/not-expand-mobile-layout";
    const markup = renderToStaticMarkup(
      <PostCardMedia
        content={{
          type: "link",
          href: longUrl,
          body: longUrl,
          previewTitle: longUrl,
          summary: {
            keyPoints: [longUrl],
          },
        }}
      />,
    );

    expect(markup).toContain(longUrl);
    expect(markup.match(/\[overflow-wrap:anywhere\]/g)?.length).toBeGreaterThanOrEqual(3);
  });

  test("constrains long text posts to the mobile card width before applying the readable cap", () => {
    const longUrl = "https://open.spotify.com/track/0oxYB9GoOIDrdzniNdKC44";
    const markup = renderToStaticMarkup(
      <PostCardMedia
        content={{
          type: "text",
          body: [
            "Tbilisi Open Air 2026 is shaping up so beautifully, with a very long paragraph that should not size the flex item wider than the card.",
            "",
            longUrl,
          ].join("\n")}
        }
      />,
    );

    expect(markup).toContain("w-full");
    expect(markup).toContain("max-w-full");
    expect(markup).toContain("sm:max-w-[72ch]");
    expect(markup).toContain("[word-break:break-all]");
  });
});
