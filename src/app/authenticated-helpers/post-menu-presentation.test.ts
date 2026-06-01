import { describe, expect, test } from "bun:test";

import { buildPostMenu, resolvePostStoryPortalHref } from "./post-menu-presentation";

describe("buildPostMenu", () => {
  test("shows cancel event for an event author", () => {
    const menu = buildPostMenu({
      eventStatus: "scheduled",
      onCancelEvent: () => undefined,
      post: { status: "published" },
      viewerIsAuthor: true,
    });

    expect(menu.postMenuItems).toContainEqual({
      key: "cancel-event",
      label: "Cancel event",
      destructive: true,
    });
  });

  test("does not show cancel event for already canceled events", () => {
    const menu = buildPostMenu({
      eventStatus: "canceled",
      onCancelEvent: () => undefined,
      post: { status: "published" },
      viewerIsAuthor: true,
    });

    expect(menu.postMenuItems.some((item) => item.key === "cancel-event")).toBe(false);
  });

  test("does not show cancel event to regular non-author viewers", () => {
    const menu = buildPostMenu({
      eventStatus: "scheduled",
      onCancelEvent: () => undefined,
      post: { status: "published" },
      viewerIsAuthor: false,
    });

    expect(menu.postMenuItems.some((item) => item.key === "cancel-event")).toBe(false);
  });

  test("shows cancel event to moderators", () => {
    const menu = buildPostMenu({
      canModeratePost: true,
      eventStatus: "scheduled",
      onCancelEvent: () => undefined,
      post: { status: "published" },
      viewerIsAuthor: false,
    });

    expect(menu.postMenuItems).toContainEqual({
      key: "cancel-event",
      label: "Cancel event",
      destructive: true,
    });
  });

  test("does not show cancel event without event metadata", () => {
    const menu = buildPostMenu({
      onCancelEvent: () => undefined,
      post: { status: "published" },
      viewerIsAuthor: true,
    });

    expect(menu.postMenuItems.some((item) => item.key === "cancel-event")).toBe(false);
  });

  test("shows Story asset link when a portal href is available", () => {
    const menu = buildPostMenu({
      post: { status: "published" },
      storyPortalHref: "https://aeneid.portal.story.foundation/asset/0xbB0a33bd07e7c813963b569f1202047a92b38d48",
    });

    expect(menu.postMenuItems).toContainEqual({
      key: "view-story",
      label: "View on Story",
    });
  });

  test("builds Aeneid Story portal links for registered assets", () => {
    expect(resolvePostStoryPortalHref({
      asset: {
        story_ip: "0xbB0a33bd07e7c813963b569f1202047a92b38d48",
        story_royalty_registration_status: "registered",
      },
      storyNetwork: "story-aeneid",
    })).toBe("https://aeneid.portal.story.foundation/asset/0xbB0a33bd07e7c813963b569f1202047a92b38d48");
  });

  test("builds Aeneid Story portal links from upstream Story refs", () => {
    expect(resolvePostStoryPortalHref({
      storyNetwork: "story-aeneid",
      upstreamAssetRefs: ["story:ip:0x01C0D038e1BA42959b83A56e5A1c459594719297#licenseTermsId=1894"],
    })).toBe("https://aeneid.portal.story.foundation/asset/0x01C0D038e1BA42959b83A56e5A1c459594719297");
  });
});
