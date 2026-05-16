import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { UiLocaleProvider } from "@/lib/ui-locale";

import { PostCard } from "./post-card";

describe("PostCard", () => {
  test("renders live-room feed cards with watch and ticket states", () => {
    const liveMarkup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{
            author: { kind: "user", label: "u/artist" },
            timestampLabel: "1h",
          }}
          content={{
            type: "live_room",
            accessMode: "free",
            accessState: "allowed",
            liveRoomId: "lr_live",
            onWatch: () => undefined,
            status: "live",
            title: "Live concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
        />
      </UiLocaleProvider>,
    );

    expect(liveMarkup).toContain("Live now");
    expect(liveMarkup).toContain("Watch live");

    const ticketMarkup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{
            author: { kind: "user", label: "u/artist" },
            timestampLabel: "1h",
          }}
          content={{
            type: "live_room",
            accessMode: "paid",
            accessState: "purchase_required",
            liveRoomId: "lr_ticketed",
            priceLabel: "$12.00",
            status: "scheduled",
            title: "Ticketed concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
        />
      </UiLocaleProvider>,
    );

    expect(ticketMarkup).toContain("Get ticket $12.00");

    const gatedMarkup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{
            author: { kind: "user", label: "u/artist" },
            timestampLabel: "1h",
          }}
          content={{
            type: "live_room",
            accessMode: "gated",
            accessState: "gate_required",
            liveRoomId: "lr_gated",
            status: "live",
            title: "Members concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
        />
      </UiLocaleProvider>,
    );

    expect(gatedMarkup).toContain("Verify access");
    expect(gatedMarkup).not.toContain("Watch live");
  });

  test("renders scheduled live-room post pages without circular CTAs or status noise", () => {
    const markup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{
            author: { kind: "user", label: "u/artist" },
            timestampLabel: "1h",
          }}
          content={{
            type: "live_room",
            accessMode: "free",
            accessState: "waiting",
            concertHref: "/p/pst_event",
            description: "A live run through the new material.",
            liveRoomId: "lr_scheduled_page",
            startsAtLabel: "in 2h",
            status: "scheduled",
            title: "Scheduled concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Scheduled concert");
    expect(markup).toContain("Starts in 2h");
    expect(markup).toContain("A live run through the new material.");
    expect(markup).not.toContain("View event");
    expect(markup).not.toContain("Scheduled event");
  });

  test("renders scheduled live-room post pages without circular CTAs or status noise", () => {
    const markup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{
            author: { kind: "user", label: "u/artist" },
            timestampLabel: "1h",
          }}
          content={{
            type: "live_room",
            accessMode: "free",
            accessState: "waiting",
            concertHref: "/p/pst_event",
            description: "A live run through the new material.",
            liveRoomId: "lr_scheduled_page",
            startsAtLabel: "in 2h",
            status: "scheduled",
            title: "Scheduled concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Scheduled concert");
    expect(markup).toContain("Starts in 2h");
    expect(markup).toContain("A live run through the new material.");
    expect(markup).not.toContain("View event");
    expect(markup).not.toContain("Scheduled event");
  });

  test("renders song captions above the song preview", () => {
    const markup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{
            author: { kind: "user", label: "u/artist" },
            timestampLabel: "1h",
          }}
          content={{
            type: "song",
            accessMode: "public",
            caption: "First line\n\n- one\n- two",
            title: "Public track",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          title="Song post"
        />
      </UiLocaleProvider>,
    );

    const captionIndex = markup.indexOf("First line");
    const songPreviewIndex = markup.indexOf("rounded-lg border border-border-soft bg-muted/30 p-3");

    expect(captionIndex).toBeGreaterThan(-1);
    expect(markup).toContain("<ul");
    expect(markup).toContain("<li>one</li>");
    expect(markup).toContain("<li>two</li>");
    expect(songPreviewIndex).toBeGreaterThan(-1);
    expect(captionIndex).toBeLessThan(songPreviewIndex);
  });
});
