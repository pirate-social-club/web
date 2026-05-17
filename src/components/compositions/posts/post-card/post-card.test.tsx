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
            coverSrc: "https://media.test/live-cover.jpg",
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
    expect(liveMarkup).toContain("aspect-video");
    expect(liveMarkup).not.toContain("size-20");

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

  test("renders scheduled free live-room post pages with RSVP when available", () => {
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
            onRsvp: () => undefined,
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
    expect(markup).toContain("RSVP");
    expect(markup).toContain("A live run through the new material.");
    expect(markup).not.toContain("View event");
    expect(markup).not.toContain("Scheduled event");
  });

  test("does not invent a scheduled label when a live-room start time is absent", () => {
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
            liveRoomId: "lr_immediate_preview",
            status: "scheduled",
            title: "Immediate concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Immediate concert");
    expect(markup).not.toContain("Scheduled");
    expect(markup).not.toContain("Starts");
  });

  test("renders live-room setlists with numbered song and artist labels", () => {
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
            liveRoomId: "lr_setlist",
            setlistPreview: [{ artist: "Artist", rightsStatus: "pending", title: "Song" }],
            status: "scheduled",
            title: "Setlist concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("1.");
    expect(markup).toContain("Song");
    expect(markup).toContain("- Artist");
  });

  test("opens the Freedom download link in a new tab for producers", () => {
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
            accessState: "allowed",
            freedomDetected: false,
            liveRoomId: "lr_producer",
            producerRole: "host",
            status: "scheduled",
            title: "Producer concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Download Freedom");
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
  });

  test("does not show producer broadcast launch when Freedom detection is missing", () => {
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
            accessState: "allowed",
            freedomDetected: false,
            freedomHref: "freedom://live-room?roomId=lr_producer&communityId=cmt_test",
            liveRoomId: "lr_producer",
            producerRole: "host",
            status: "scheduled",
            title: "Producer concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Download Freedom");
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
    expect(markup).not.toContain("Start broadcast");
  });

  test("shows producer broadcast launch when Freedom is detected", () => {
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
            accessState: "allowed",
            freedomDetected: true,
            freedomHref: "freedom://live-room?roomId=lr_producer&communityId=cmt_test",
            liveRoomId: "lr_producer",
            producerRole: "host",
            status: "scheduled",
            title: "Producer concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Start broadcast");
    expect(markup).toContain('href="freedom://live-room?roomId=lr_producer&amp;communityId=cmt_test"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
    expect(markup).not.toContain("Download Freedom");
  });

  test("renders RSVP state for scheduled free live-room post pages", () => {
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
            attendeeCountLabel: "342 going",
            liveRoomId: "lr_scheduled_page",
            rsvpState: "going",
            startsAtLabel: "in 2h",
            status: "scheduled",
            title: "Scheduled concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("342 going");
    expect(markup).toContain("You&#x27;re going");
    expect(markup).not.toContain("RSVP");
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
