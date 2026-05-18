import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { LiveRoomBanner, shouldShowLiveRoomBanner } from "./live-room-banner";

describe("LiveRoomBanner", () => {
  test("keeps the route banner producer-only", () => {
    expect(shouldShowLiveRoomBanner({
      accessState: "waiting",
      role: "viewer",
      status: "scheduled",
    })).toBe(false);

    expect(shouldShowLiveRoomBanner({
      accessState: "purchase_required",
      role: "viewer",
      status: "scheduled",
    })).toBe(false);

    expect(shouldShowLiveRoomBanner({
      accessState: "allowed",
      role: "host",
      status: "live",
    })).toBe(true);
  });

  test("keeps host copy affordances out of viewer banners", () => {
    const markup = renderToStaticMarkup(
      <LiveRoomBanner
        role="viewer"
        shareUrl="https://pirate.local/live/lr_viewer_scheduled"
        status="scheduled"
      />,
    );

    expect(markup).not.toContain("Copy concert link");
    expect(markup).not.toContain("lr_viewer_scheduled");
  });

  test("shows a verification CTA for gated viewer access", () => {
    const markup = renderToStaticMarkup(
      <LiveRoomBanner
        accessState="gate_required"
        role="viewer"
        status="live"
      />,
    );

    expect(markup).toContain("Community access is required before viewers can watch.");
    expect(markup).toContain("Verify access");
    expect(markup).not.toContain("Watch live");
  });

  test("hides the Freedom broadcast CTA until a guest invite is accepted", () => {
    const pendingMarkup = renderToStaticMarkup(
      <LiveRoomBanner
        freedomHref={undefined}
        guestInviteStatus="pending"
        onAcceptGuestInvite={() => undefined}
        role="guest"
        shareUrl="https://pirate.local/p/pst_guest_pending"
        status="scheduled"
      />,
    );

    expect(pendingMarkup).toContain("Accept the producer invite before broadcasting from Freedom.");
    expect(pendingMarkup).toContain("Accept invite");
    expect(pendingMarkup).not.toContain("Broadcast in Freedom");

    const acceptedMarkup = renderToStaticMarkup(
      <LiveRoomBanner
        freedomDetected
        freedomHref="freedom://live-room?roomId=lr_guest_accepted"
        guestInviteStatus="accepted"
        role="guest"
        shareUrl="https://pirate.local/p/pst_guest_accepted"
        status="scheduled"
      />,
    );

    expect(acceptedMarkup).toContain("Open the producer room in Freedom when the host starts.");
    expect(acceptedMarkup).toContain("Broadcast in Freedom");
    expect(acceptedMarkup).toContain('target="_blank"');
    expect(acceptedMarkup).toContain('rel="noreferrer"');
  });

  test("shows Download Freedom instead of broadcast when Freedom detection is missing", () => {
    const markup = renderToStaticMarkup(
      <LiveRoomBanner
        freedomDetected={false}
        freedomHref="freedom://live-room?roomId=lr_host"
        role="host"
        shareUrl="https://pirate.local/p/pst_host"
        status="scheduled"
      />,
    );

    expect(markup).toContain("Download Freedom");
    expect(markup).not.toContain("Broadcast in Freedom");
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
  });
});
