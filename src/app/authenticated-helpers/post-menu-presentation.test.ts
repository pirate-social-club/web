import { describe, expect, test } from "bun:test";

import { buildPostMenu } from "./post-menu-presentation";

describe("buildPostMenu", () => {
  test("shows report post when reporting is available", () => {
    const menu = buildPostMenu({
      onReport: () => undefined,
      post: { status: "published" },
      viewerIsAuthor: false,
    });

    expect(menu.postMenuItems).toContainEqual({
      key: "report",
      label: "Report post",
      destructive: true,
    });
  });

  test("does not show report post for unavailable posts", () => {
    const menu = buildPostMenu({
      onReport: () => undefined,
      post: { status: "removed" },
      viewerIsAuthor: false,
    });

    expect(menu.postMenuItems.some((item) => item.key === "report")).toBe(false);
  });

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
});
