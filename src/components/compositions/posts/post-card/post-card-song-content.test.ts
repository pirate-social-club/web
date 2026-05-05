import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { deriveSongUI, SongPostContent } from "./post-card-song-content";
import type { SongContentSpec } from "./post-card.types";

const baseSong: SongContentSpec = {
  type: "song",
  accessMode: "public",
  title: "Public track",
};

describe("deriveSongUI", () => {
  test("does not show unlocked badge for public songs", () => {
    const ui = deriveSongUI({
      ...baseSong,
      accessMode: "public",
      hasEntitlement: true,
    });

    expect(ui.showOwned).toBe(false);
    expect(ui.primaryAction).toBe("play");
  });

  test("shows unlocked badge for locked songs with entitlement", () => {
    const ui = deriveSongUI({
      ...baseSong,
      accessMode: "locked",
      hasEntitlement: true,
    });

    expect(ui.showOwned).toBe(true);
    expect(ui.showUnlock).toBe(false);
  });

  test("renders song captions with formatted text", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          caption: "First line\n\n- one\n- two",
        },
      }),
    );

    expect(markup).toContain("First line");
    expect(markup).toContain("<ul");
    expect(markup).toContain("<li>one</li>");
    expect(markup).toContain("<li>two</li>");
  });
});
