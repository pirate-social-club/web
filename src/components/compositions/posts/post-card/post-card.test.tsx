import "@/test/setup-runtime";

import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { ApiLiveRoomViewerAttachResponse } from "@/lib/api/client-api-types";
import { UiLocaleProvider } from "@/lib/ui-locale";

import { deriveSongHeaderMenuActions, mergePostCardMenuItems, openExternalUrl, PostCard } from "./post-card";
import type { PostCardMenuItem, SongContentSpec, VideoContentSpec } from "./post-card.types";

function withWindow(value: unknown, callback: () => void) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value,
  });

  try {
    callback();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "window", descriptor);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
}

describe("PostCard", () => {
  test("opens external URLs with noopener noreferrer and clears opener", () => {
    const opened = { opener: {} };
    const open = mock(() => opened);

    withWindow({ open }, () => {
      openExternalUrl("https://genius.com/34172986");
    });

    expect(open).toHaveBeenCalledWith("https://genius.com/34172986", "_blank", "noopener,noreferrer");
    expect(opened.opener).toBeNull();
  });

  test("openExternalUrl tolerates missing window and blocked popups", () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    Reflect.deleteProperty(globalThis, "window");

    try {
      expect(() => openExternalUrl("https://genius.com/34172986")).not.toThrow();
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, "window", descriptor);
      }
    }

    const open = mock(() => null);
    withWindow({ open }, () => {
      expect(() => openExternalUrl("https://genius.com/34172986")).not.toThrow();
    });

    expect(open).toHaveBeenCalledWith("https://genius.com/34172986", "_blank", "noopener,noreferrer");
  });

  test("does not render locked video commerce in the engagement bar", () => {
    const video: VideoContentSpec = {
      type: "video",
      accessMode: "locked",
      listingMode: "listed",
      listingStatus: "active",
      onBuy: () => undefined,
      posterSrc: "https://example.test/poster.jpg",
      priceLabel: "$4.99",
      src: "https://example.test/video.mp4",
      title: "Behind the scenes",
    };

    const markup = renderToStaticMarkup(
      <PostCard
        byline={{ author: { kind: "user", label: "u/artist" }, timestampLabel: "now" }}
        content={video}
        engagement={{ commentCount: 2, score: 5 }}
        title="Behind the scenes"
      />,
    );

    expect(markup).not.toContain("$4.99");
    expect(markup).not.toContain(">Buy<");
  });

  test("renders publish status notice with retry action", () => {
    const markup = renderToStaticMarkup(
      <PostCard
        byline={{ author: { kind: "user", label: "u/artist" }, timestampLabel: "now" }}
        content={{ type: "text", body: "Processing copy" }}
        engagement={{ commentCount: 0, score: 0 }}
        statusNotice={{
          tone: "destructive",
          label: "Publish failed",
          message: "Story royalty registration is temporarily unavailable.",
          action: {
            label: "Try again",
            onClick: () => undefined,
          },
        }}
        title="Queued song"
      />,
    );

    expect(markup).toContain("Publish failed");
    expect(markup).toContain('data-testid="post-status-notice"');
    expect(markup).toContain('data-status-notice-tone="destructive"');
    expect(markup).toContain("Story royalty registration is temporarily unavailable.");
    expect(markup).toContain("Try again");
  });

  test("keeps song annotations in post options without duplicating visible download rows", () => {
    const baseItems: PostCardMenuItem[] = [
      { key: "copy-link", label: "Copy link" },
      { key: "report", label: "Report", separatorBefore: true },
    ];
    const song: SongContentSpec = {
      type: "song",
      accessMode: "public",
      annotationsUrl: "https://genius.com/34172986",
      downloadPolicy: "free_download",
      entitledStems: ["instrumental", "vocals"],
      hasEntitlement: true,
      onDownload: () => undefined,
      stems: [
        { accessPolicy: "free", kind: "instrumental", onDownload: () => undefined },
        { accessPolicy: "free", kind: "vocals", onDownload: () => undefined },
      ],
      storageProofs: {
        original: {
          cid: "bafyoriginal",
          gatewayUrl: "https://dweb.link/ipfs/bafyoriginal",
        },
      },
      title: "Midnight Waves",
    };

    const mergedItems = mergePostCardMenuItems(baseItems, deriveSongHeaderMenuActions(song));

    expect(mergedItems.map((item) => item.label)).toEqual([
      "Copy link",
      "Report",
      "View on Genius",
      "View on IPFS",
      "Download original",
      "Download instrumental",
      "Download vocals",
    ]);
    expect(mergedItems.map((item) => Boolean(item.separatorBefore))).toEqual([
      false,
      true,
      false,
      false,
      true,
      false,
      false,
    ]);
    expect(mergedItems.filter((item) => item.key.startsWith("song-download:")).map((item) => item.key)).toEqual([
      "song-download:original",
      "song-download:stem:instrumental:0",
      "song-download:stem:vocals:1",
    ]);
  });

  test("shows IPFS action for locked songs without entitlement", () => {
    const baseItems: PostCardMenuItem[] = [
      { key: "copy-link", label: "Copy link" },
    ];
    const song: SongContentSpec = {
      type: "song",
      accessMode: "locked",
      hasEntitlement: false,
      storageProofs: {
        preview: {
          cid: "bafypreview",
          gatewayUrl: "https://dweb.link/ipfs/bafypreview",
        },
      },
      title: "Locked preview",
    };

    const mergedItems = mergePostCardMenuItems(baseItems, deriveSongHeaderMenuActions(song));

    expect(mergedItems.map((item) => item.label)).toEqual([
      "Copy link",
      "View on IPFS",
    ]);
    expect(mergedItems[1]?.key).toBe("song-ipfs:view:preview");
    expect(mergedItems[1]?.icon).toBeTruthy();
  });

  test("keeps Delete post at the bottom of song menus", () => {
    const baseItems: PostCardMenuItem[] = [
      { key: "view-story", label: "View on Story" },
      { key: "delete", label: "Delete post", destructive: true },
    ];
    const song: SongContentSpec = {
      type: "song",
      accessMode: "public",
      annotationsUrl: "https://genius.com/34172986",
      downloadPolicy: "free_download",
      onDownload: () => undefined,
      title: "Author's song",
    };

    const mergedItems = mergePostCardMenuItems(baseItems, deriveSongHeaderMenuActions(song));

    expect(mergedItems.map((item) => item.label)).toEqual([
      "View on Story",
      "View on Genius",
      "Download original",
      "Delete post",
    ]);
    expect(mergedItems.at(-1)).toMatchObject({
      key: "delete",
      destructive: true,
    });
  });

  test("moves song downloads into the header menu instead of visible offer rows", () => {
    const content: SongContentSpec = {
      type: "song",
      accessMode: "public",
      downloadPolicy: "free_download",
      onDownload: () => undefined,
      title: "Downloadable single",
    };
    const markup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{
            author: { kind: "user", label: "u/artist" },
            timestampLabel: "1h",
          }}
          content={content}
          engagement={{ commentCount: 0, score: 0 }}
          menuItems={[{ key: "copy-link", label: "Copy link" }]}
        />
      </UiLocaleProvider>,
    );

    expect(deriveSongHeaderMenuActions(content).map((action) => action.item.label)).toContain("Download original");
    expect(markup).not.toContain("Original");
    expect(markup).not.toContain("Download Original");
  });

  test("renders date-only event metadata compactly without fake midnight times", () => {
    const markup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{
            author: { kind: "user", label: "u/artist" },
            timestampLabel: "1h",
          }}
          content={{
            type: "text",
            body: "No time, just the dates.",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          event={{
            endsAt: "2026-07-05T19:59:00.000Z",
            locationName: "Dedaena Park",
            place: {
              address: "Tbilisi",
              label: "Dedaena Park",
              lat: 41.704,
              lon: 44.802,
              source: "geoapify",
            },
            startsAt: "2026-07-03T20:00:00.000Z",
            status: "scheduled",
            timezone: "Asia/Tbilisi",
          }}
          title="Tbilisi Open Air 2026"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Jul 4-5");
    expect(markup).not.toContain("12:00");
    expect(markup).not.toContain("11:59");
    expect(markup).not.toContain("GMT");
    expect(markup).not.toContain("openstreetmap");
    expect(markup).toContain("Copy location");
  });

  test("constrains event details to the mobile card width", () => {
    const markup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{
            author: { kind: "user", label: "u/artist" },
            timestampLabel: "1h",
          }}
          content={{
            type: "text",
            body: "Lineup links incoming.",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          event={{
            startsAt: "2026-07-04T20:00:00.000Z",
            timezone: "Asia/Tbilisi",
            locationName: "Lisi Wonderland",
            address: "Leo Kvachadze Street, 0017 Tbilisi, Georgia",
            eventUrl: "https://tbilisiopenair.ge/events/tbilisi-open-air-2026-with-an-extra-long-event-slug",
            place: {
              label: "Lisi Wonderland",
              address: "Leo Kvachadze Street, 0017 Tbilisi, Georgia",
              lat: 41.75,
              lon: 44.74,
              source: "manual",
            },
          }}
          title="Tbilisi Open Air 2026"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("w-full max-w-full sm:max-w-[72ch]");
    expect(markup).not.toContain("w-full max-w-[72ch]");
    expect(markup).not.toContain("min-w-0 truncate text-inherit");
    expect(markup).toContain("[word-break:break-word]");
    expect(markup).toContain("[word-break:break-all]");
  });

  test("collapses long text feed cards behind a full-post link", () => {
    const longBody = Array.from(
      { length: 24 },
      (_, index) => `Section ${index + 1}: This is enough post body text to make a feed preview clamp useful.`,
    ).join("\n\n");

    const markup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{
            author: { kind: "user", label: "u/guide" },
            timestampLabel: "1h",
          }}
          content={{
            type: "text",
            body: longBody,
          }}
          engagement={{ commentCount: 0, score: 0 }}
          postHref="/p/post_long"
          viewContext="community"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("max-h-96");
    expect(markup).toContain("Read full post");
    expect(markup).toContain('href="/p/post_long"');
  });

  test("does not collapse long text on the post page", () => {
    const longBody = Array.from(
      { length: 24 },
      (_, index) => `Section ${index + 1}: Thread pages should keep the whole post visible.`,
    ).join("\n\n");

    const markup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{
            author: { kind: "user", label: "u/guide" },
            timestampLabel: "1h",
          }}
          content={{
            type: "text",
            body: longBody,
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(markup).not.toContain("max-h-96");
    expect(markup).not.toContain("Read full post");
  });

  test("keeps composer previews bounded and removes inert post chrome", () => {
    const longBody = Array.from(
      { length: 24 },
      (_, index) => `Preview section ${index + 1}: Keep the composer review surface compact.`,
    ).join("\n\n");

    const markup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{
            author: { kind: "user", label: "u/guide" },
            timestampLabel: "now",
          }}
          content={{ type: "text", body: longBody }}
          engagement={{ commentCount: 0, score: 0 }}
          menuItems={[{ key: "copy", label: "Copy link" }]}
          previewMode
          shareActions={[{ key: "share", label: "Share" }]}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("max-h-96");
    expect(markup).toContain("Show full post");
    expect(markup).not.toContain("Copy link");
    expect(markup).not.toContain('aria-label="Comments (0)"');
    expect(markup).not.toContain(">Share</button>");
  });

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

  test("renders Mandarin live-room copy under the zh locale", () => {
    const liveMarkup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="zh">
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
            liveRoomId: "lr_live_zh",
            onWatch: () => undefined,
            status: "live",
            title: "Live concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
        />
      </UiLocaleProvider>,
    );

    expect(liveMarkup).toContain("观看直播");
  });

  test("renders buyer-gated live-room song purchase and unavailable ownership states", () => {
    const buyMarkup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{ author: { kind: "user", label: "u/artist" }, timestampLabel: "1h" }}
          content={{
            type: "live_room",
            accessMode: "gated",
            accessState: "gate_required",
            gateOwnershipRequired: true,
            gatePurchaseLabel: "$7.50",
            liveRoomId: "lr_buyer_gated",
            onGatePurchase: () => undefined,
            status: "live",
            title: "Catalog buyers concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
        />
      </UiLocaleProvider>,
    );

    expect(buyMarkup).toContain("Buy song to watch");
    expect(buyMarkup).toContain("$7.50");
    expect(buyMarkup).not.toContain("Verify access");

    const unavailableMarkup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{ author: { kind: "user", label: "u/artist" }, timestampLabel: "1h" }}
          content={{
            type: "live_room",
            accessMode: "gated",
            accessState: "gate_required",
            gateOwnershipRequired: true,
            liveRoomId: "lr_buyer_gated_unlisted",
            status: "live",
            title: "Owners concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
        />
      </UiLocaleProvider>,
    );

    expect(unavailableMarkup).toContain("For song owners");
    expect(unavailableMarkup).toContain("Not currently for sale");
    expect(unavailableMarkup).not.toContain("Buy song to watch");
    expect(unavailableMarkup).not.toContain("Verify access");
  });

  test("renders ended live-room replay states", () => {
    const publishedMarkup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{ author: { kind: "user", label: "u/artist" }, timestampLabel: "1h" }}
          content={{
            type: "live_room",
            accessMode: "free",
            accessState: "ended",
            endedAtLabel: "1h",
            hasEntitlement: true,
            liveRoomId: "lr_replay_published",
            onWatch: () => undefined,
            replayDurationLabel: "48 min",
            replayStatus: "published",
            status: "ended",
            title: "Replay concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(publishedMarkup).toContain("Watch replay");
    expect(publishedMarkup).toContain("Ended 1h ago");
    expect(publishedMarkup).not.toContain("ago ago");
    expect(publishedMarkup).toContain("48 min");
    expect(publishedMarkup).not.toContain("48 min replay");

    const paidLockedMarkup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{ author: { kind: "user", label: "u/artist" }, timestampLabel: "1h" }}
          content={{
            type: "live_room",
            accessMode: "paid",
            accessState: "ended",
            endedAtLabel: "1h",
            hasEntitlement: false,
            liveRoomId: "lr_replay_paid",
            priceLabel: "$12.00",
            replayDurationLabel: "48 min",
            replayStatus: "published",
            status: "ended",
            title: "Paid replay concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(paidLockedMarkup).toContain("Buy $12.00");
    expect(paidLockedMarkup).not.toContain("Watch replay");

    const reviewMarkup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{ author: { kind: "user", label: "u/artist" }, timestampLabel: "1h" }}
          content={{
            type: "live_room",
            accessMode: "free",
            accessState: "ended",
            liveRoomId: "lr_replay_review",
            replayStatus: "review_pending",
            status: "ended",
            title: "Review replay concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(reviewMarkup).toContain("Replay under review");

    const failedMarkup = renderToStaticMarkup(
      <UiLocaleProvider dir="ltr" locale="en">
        <PostCard
          byline={{ author: { kind: "user", label: "u/artist" }, timestampLabel: "1h" }}
          content={{
            type: "live_room",
            accessMode: "free",
            accessState: "ended",
            liveRoomId: "lr_replay_failed",
            replayStatus: "failed",
            status: "ended",
            title: "Failed replay concert",
          }}
          engagement={{ commentCount: 0, score: 0 }}
          viewContext="post"
        />
      </UiLocaleProvider>,
    );

    expect(failedMarkup).toContain("Replay unavailable");
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
    const songPreviewIndex = markup.indexOf("Public track");

    expect(captionIndex).toBeGreaterThan(-1);
    expect(markup).toContain("<ul");
    expect(markup).toContain(">one</li>");
    expect(markup).toContain(">two</li>");
    expect(markup).toContain("break-words");
    expect(songPreviewIndex).toBeGreaterThan(-1);
    expect(captionIndex).toBeLessThan(songPreviewIndex);
  });
});
