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

  test("truncates long multi-paragraph text before rendering feed markup", () => {
    const markup = renderToStaticMarkup(
      <PostCardMedia
        content={{
          type: "text",
          body: [
            "First paragraph stays visible.",
            "Second paragraph also stays visible before the feed limit is reached.",
            "x".repeat(700),
          ].join("\n\n"),
        }}
        viewContext="home"
      />,
    );

    expect(markup).toContain("First paragraph stays visible.");
    expect(markup).toContain("Second paragraph also stays visible");
    expect(markup).toContain("...");
    expect(markup).not.toContain("x".repeat(700));
  });

  test("keeps long text untruncated on post detail surfaces", () => {
    const fullBody = [
      "First paragraph stays visible.",
      "Second paragraph stays visible.",
      "x".repeat(700),
    ].join("\n\n");
    const markup = renderToStaticMarkup(
      <PostCardMedia
        content={{
          type: "text",
          body: fullBody,
        }}
        viewContext="post"
      />,
    );

    expect(markup).toContain("x".repeat(700));
    expect(markup).not.toContain("...");
  });

  test("hard-caps single-wall feed text without a paragraph boundary", () => {
    const trailingText = "tail should be removed";
    const markup = renderToStaticMarkup(
      <PostCardMedia
        content={{
          type: "text",
          body: `${"x".repeat(700)} ${trailingText}`,
        }}
        viewContext="home"
      />,
    );

    expect(markup).toContain("...");
    expect(markup).not.toContain(trailingText);
  });

  test("truncates long link bodies and image captions in feed contexts", () => {
    const longLinkTail = "link tail should be removed";
    const longCaptionTail = "caption tail should be removed";
    const linkMarkup = renderToStaticMarkup(
      <PostCardMedia
        content={{
          type: "link",
          body: `Link intro.\n\n${"x".repeat(500)} ${longLinkTail}`,
          href: "https://example.test/story",
          previewTitle: "Story preview",
        }}
        viewContext="home"
      />,
    );
    const imageMarkup = renderToStaticMarkup(
      <PostCardMedia
        content={{
          type: "image",
          alt: "image",
          caption: `Caption intro.\n\n${"x".repeat(400)} ${longCaptionTail}`,
          src: "https://example.test/image.jpg",
        }}
        viewContext="home"
      />,
    );

    expect(linkMarkup).toContain("Link intro.");
    expect(linkMarkup).toContain("...");
    expect(linkMarkup).not.toContain(longLinkTail);
    expect(imageMarkup).toContain("Caption intro.");
    expect(imageMarkup).toContain("...");
    expect(imageMarkup).not.toContain(longCaptionTail);
  });
});
