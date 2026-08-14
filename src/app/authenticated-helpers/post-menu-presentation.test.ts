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
      storyPortalHref: "https://aeneid.explorer.story.foundation/ipa/0xbB0a33bd07e7c813963b569f1202047a92b38d48",
    });

    expect(menu.postMenuItems).toContainEqual(expect.objectContaining({
      key: "view-story",
      label: "View on Story",
    }));
    expect(menu.postMenuItems.find((item) => item.key === "view-story")?.icon).toBeTruthy();
  });

  test("shows Bounties and owner reward settings only for eligible song actions", () => {
    const menu = buildPostMenu({
      canBoost: true,
      canManageRewardSettings: true,
      onBoost: () => undefined,
      onRewardSettings: () => undefined,
      post: { post_type: "song", status: "published" },
    });

    expect(menu.postMenuItems.map((item) => item.key)).toEqual(["boost", "reward-settings"]);
  });

  test("does not put Bounties on non-song posts", () => {
    const menu = buildPostMenu({
      canBoost: true,
      onBoost: () => undefined,
      post: { post_type: "text", status: "published" },
    });

    expect(menu.postMenuItems.some((item) => item.key === "boost")).toBe(false);
  });

  test("builds Aeneid Story IP Explorer links for registered assets", () => {
    expect(resolvePostStoryPortalHref({
      asset: {
        story_ip: "0xbB0a33bd07e7c813963b569f1202047a92b38d48",
        story_royalty_registration_status: "registered",
      },
      storyNetwork: "story-aeneid",
    })).toBe("https://aeneid.explorer.story.foundation/ipa/0xbB0a33bd07e7c813963b569f1202047a92b38d48");
  });

  test("builds Aeneid Story IP Explorer links from upstream Story refs", () => {
    expect(resolvePostStoryPortalHref({
      storyNetwork: "story-aeneid",
      upstreamAssetRefs: ["story:ip:0x01C0D038e1BA42959b83A56e5A1c459594719297#licenseTermsId=1894"],
    })).toBe("https://aeneid.explorer.story.foundation/ipa/0x01C0D038e1BA42959b83A56e5A1c459594719297");
  });
});
