import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { ApiLiveRoomViewerAttachResponse } from "@/lib/api/client-api-types";
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

    expect(liveMarkup).toContain("Watch live");
    expect(liveMarkup).toContain("aspect-video");
    expect(liveMarkup).not.toContain("size-20");
    expect(liveMarkup).not.toContain("Live now");
    expect(liveMarkup).not.toContain("Live for");

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

  test("does not render age-gated live-room cover source before proof", () => {
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
            ageGatePolicy: "18_plus",
            ageGateViewerState: "proof_required",
            contentSafetyState: "adult",
            coverSrc: "https://media.test/adult-live-cover.jpg",
            liveRoomId: "lr_live_adult",
            status: "live",
            title: "Live concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
        />
      </UiLocaleProvider>,
    );

    expect(markup).not.toContain("https://media.test/adult-live-cover.jpg");
    expect(markup).toContain('role="img"');
  });

  test("renders free live-room post pages with an inline viewer once attached", () => {
    const viewerAttachResponse = {
      room: {
        id: "lr_live_inline",
        object: "live_room",
        community: "cmt_test",
        anchor_post: "pst_live_inline",
        host_user: "usr_host",
        guest_user: null,
        room_kind: "solo",
        status: "live",
        access_mode: "free",
        visibility: "public",
        title: "Live concert",
        description: null,
        cover_ref: null,
        event_start_at: null,
        live_started_at: 1779047801,
        ended_at: null,
        canceled_at: null,
        broadcast_ref: "cmt_test:lr_live_inline",
        replay_status: "none",
        performer_allocations: [],
        setlist: {
          id: "lrs_test",
          object: "live_room_setlist",
          status: "ready",
          items: [],
        },
        created: 1779041451,
      },
      access: {
        allowed: true,
        decision_reason: "allowed",
        access_mode: "free",
        visibility: "public",
        listing: null,
        purchase_entitlement: null,
        guest_invite_status: null,
      },
      runtime: {
        status: "attached",
        seat: "viewer",
        room_runtime_id: "cmt_test:lr_live_inline",
      },
      agora: {
        app_id: "agora_app",
        channel: "pirate-live-lr_live_inline",
        uid: 42,
        token: "token",
        token_expires_at: 1779050000,
        configured: true,
      },
    } satisfies ApiLiveRoomViewerAttachResponse;

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
            coverSrc: "https://media.test/live-cover.jpg",
            hasEntitlement: true,
            liveRoomId: "lr_live_inline",
            onWatch: () => undefined,
            status: "live",
            title: "Live concert",
            viewerAttachResponse,
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Ready to join.");
    expect(markup).toContain('src="https://media.test/live-cover.jpg"');
    expect(markup).not.toContain("Watch live");
    expect(markup).not.toContain("Live now");
  });

  test("does not show watch live from bare live-room anchor state before access hydrates", () => {
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
            liveRoomId: "lr_loading",
            onWatch: () => undefined,
            status: "live",
            title: "Loading live room",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Loading live room");
    expect(markup).not.toContain("Watch live");
  });

  test("renders producer launch in the post-page primary action slot without viewer controls", () => {
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
            hasEntitlement: true,
            liveRoomId: "lr_producer",
            onWatch: () => undefined,
            producerRole: "host",
            status: "live",
            title: "Producer concert",
            viewerAttachResponse: {
              access: {
                access_mode: "free",
                allowed: true,
                decision_reason: "allowed",
                guest_invite_status: null,
                listing: null,
                purchase_entitlement: null,
                visibility: "public",
              },
              agora: {
                app_id: "agora_app",
                channel: "pirate-live-lr_producer",
                configured: true,
                token: "token",
                token_expires_at: 1779050000,
                uid: 42,
              },
              room: {
                access_mode: "free",
                anchor_post: "pst_producer",
                broadcast_ref: "cmt_test:lr_producer",
                canceled_at: null,
                community: "cmt_test",
                cover_ref: null,
                created: 1779041451,
                description: null,
                ended_at: null,
                event_start_at: null,
                guest_user: null,
                host_user: "usr_host",
                id: "lr_producer",
                live_started_at: 1779047801,
                object: "live_room",
                performer_allocations: [],
                replay_status: "none",
                room_kind: "solo",
                setlist: {
                  id: "lrs_test",
                  items: [],
                  object: "live_room_setlist",
                  status: "ready",
                },
                status: "live",
                title: "Producer concert",
                visibility: "public",
              },
              runtime: {
                room_runtime_id: "cmt_test:lr_producer",
                seat: "viewer",
                status: "attached",
              },
            },
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Start broadcast");
    expect(markup).not.toContain("Watch live");
    expect(markup).not.toContain("Ready to join.");
    expect(markup).not.toContain("Live for");
  });

  test("renders producer launch in the feed primary action slot", () => {
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
            onWatch: () => undefined,
            producerRole: "host",
            status: "live",
            title: "Producer concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Start broadcast");
    expect(markup).toContain('href="freedom://live-room?roomId=lr_producer&amp;communityId=cmt_test"');
    expect(markup).not.toContain("Watch live");
  });

  test("renders pending guest invites as producer controls", () => {
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
            guestInviteStatus: "pending",
            liveRoomId: "lr_pending_guest",
            onAcceptGuestInvite: () => undefined,
            onWatch: () => undefined,
            producerRole: "guest",
            status: "scheduled",
            title: "Guest invite",
          }}
          engagement={{ commentCount: 0, score: 0 }}
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Accept invite");
    expect(markup).toContain("Accept the producer invite before broadcasting.");
    expect(markup).not.toContain("Watch live");
  });

  test("links pending guest feed cards back to the post when accept is not wired locally", () => {
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
            anchorPostHref: "/p/post_pending_guest",
            guestInviteStatus: "pending",
            liveRoomId: "lr_pending_guest",
            onWatch: () => undefined,
            producerRole: "guest",
            status: "scheduled",
            title: "Guest invite",
          }}
          engagement={{ commentCount: 0, score: 0 }}
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Open invite");
    expect(markup).toContain('href="/p/post_pending_guest"');
    expect(markup).not.toContain("Watch live");
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
