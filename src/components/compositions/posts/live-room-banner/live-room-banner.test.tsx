import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { LiveRoomBanner } from "./live-room-banner";

describe("LiveRoomBanner", () => {
  test("hides the Freedom broadcast CTA until a guest invite is accepted", () => {
    const pendingMarkup = renderToStaticMarkup(
      <LiveRoomBanner
        freedomHref={undefined}
        guestInviteStatus="pending"
        liveRoomId="lr_guest_pending"
        role="guest"
        shareUrl="https://pirate.local/p/pst_guest_pending"
        status="scheduled"
      />,
    );

    expect(pendingMarkup).toContain("Accept the producer invite before broadcasting from Freedom.");
    expect(pendingMarkup).not.toContain("Broadcast in Freedom");

    const acceptedMarkup = renderToStaticMarkup(
      <LiveRoomBanner
        freedomHref="freedom://live-room?roomId=lr_guest_accepted"
        guestInviteStatus="accepted"
        liveRoomId="lr_guest_accepted"
        role="guest"
        shareUrl="https://pirate.local/p/pst_guest_accepted"
        status="scheduled"
      />,
    );

    expect(acceptedMarkup).toContain("Open the producer room in Freedom when the host starts.");
    expect(acceptedMarkup).toContain("Broadcast in Freedom");
  });
});
