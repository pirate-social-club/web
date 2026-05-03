import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PostCardMedia } from "./post-card-media";

describe("PostCardMedia", () => {
  test("hides adult images when age proof is required", () => {
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

    expect(markup).toContain("18+ content");
    expect(markup).toContain("Verify Age");
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("https://example.test/adult.jpg");
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

    expect(markup).toContain("Verify Age");
    expect(markup).not.toContain("disabled=\"\"");
  });

  test("renders adult images for verified viewers", () => {
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
    expect(markup).not.toContain("18+ content");
  });
});
