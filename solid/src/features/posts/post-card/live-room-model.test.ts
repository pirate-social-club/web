import { describe, expect, test } from "bun:test";

import {
  deriveLiveRoomUi,
  hasReplaySurface,
  liveRoomParticipantsLabel,
  liveRoomTimeLabel,
} from "./live-room-model";
import type { LiveRoomContentSpec } from "./types";

const noop = () => undefined;

function room(overrides: Partial<LiveRoomContentSpec> = {}): LiveRoomContentSpec {
  return {
    type: "live_room",
    accessMode: "free",
    liveRoomId: "lr_1",
    status: "scheduled",
    title: "Friday Night Studio Set",
    ...overrides,
  };
}

describe("deriveLiveRoomUi", () => {
  test("canceled rooms render a canceled state with no CTA", () => {
    expect(deriveLiveRoomUi(room({ status: "canceled" })).kind).toBe("canceled");
  });

  test("scheduled free rooms with an RSVP handler can RSVP", () => {
    const ui = deriveLiveRoomUi(room({ accessState: "waiting", onRsvp: noop }));
    expect(ui).toMatchObject({ kind: "can_rsvp", cta: "RSVP" });
    expect(deriveLiveRoomUi(room({ accessState: "waiting", rsvpState: "going", onRsvp: noop })).kind).toBe("rsvped");
  });

  test("paid rooms without entitlement need a ticket", () => {
    const ui = deriveLiveRoomUi(room({
      accessMode: "paid",
      accessState: "purchase_required",
      priceLabel: "$12.00",
      onBuy: noop,
    }));
    expect(ui).toMatchObject({ kind: "needs_ticket", cta: "Get ticket · $12.00" });
  });

  test("paid entitled live rooms can watch", () => {
    const ui = deriveLiveRoomUi(room({
      accessMode: "paid",
      accessState: "allowed",
      hasEntitlement: true,
      status: "live",
      onWatch: noop,
    }));
    expect(ui).toMatchObject({ kind: "can_watch", cta: "Watch live" });
  });

  test("gated rooms derive access paths", () => {
    expect(deriveLiveRoomUi(room({ accessMode: "gated", accessState: "gate_required", status: "live", onWatch: noop })))
      .toMatchObject({ kind: "needs_access", cta: "Verify access" });
    expect(deriveLiveRoomUi(room({
      accessMode: "gated",
      accessState: "gate_required",
      gatePurchaseLabel: "$4.00",
      onGatePurchase: noop,
    }))).toMatchObject({ kind: "needs_owned_song", cta: "Buy the song to watch · $4.00" });
    expect(deriveLiveRoomUi(room({
      accessMode: "gated",
      accessState: "gate_required",
      gateOwnershipRequired: true,
    })).kind).toBe("owned_song_unavailable");
    expect(deriveLiveRoomUi(room({ accessMode: "paid", accessState: "missing_listing" })).kind)
      .toBe("tickets_unavailable");
  });

  test("age-gated rooms require verification before anything else", () => {
    const ui = deriveLiveRoomUi(room({
      ageGatePolicy: "18_plus",
      contentSafetyState: "adult",
      status: "live",
      onVerifyAge: noop,
      onWatch: noop,
    }));
    expect(ui).toMatchObject({ kind: "needs_verification", cta: "Verify to attend" });
  });

  test("ended rooms branch on replay status", () => {
    expect(deriveLiveRoomUi(room({ status: "ended", accessState: "ended" })).kind).toBe("ended");
    expect(deriveLiveRoomUi(room({ status: "ended", replayStatus: "processing" })).kind).toBe("replay_processing");
    expect(deriveLiveRoomUi(room({ status: "ended", replayStatus: "review_pending" })).kind).toBe("replay_review_pending");
    expect(deriveLiveRoomUi(room({ status: "ended", replayStatus: "failed" })).kind).toBe("replay_failed");
    expect(deriveLiveRoomUi(room({ status: "ended", replayStatus: "published", onWatch: noop })))
      .toMatchObject({ kind: "can_watch_replay", cta: "Watch replay" });
    expect(deriveLiveRoomUi(room({
      status: "ended",
      replayStatus: "published",
      accessMode: "paid",
      priceLabel: "$12.00",
      onBuy: noop,
    }))).toMatchObject({ kind: "needs_ticket", cta: "Buy · $12.00" });
  });
});

describe("live-room labels", () => {
  test("time labels cover scheduled, live, canceled, and ended", () => {
    expect(liveRoomTimeLabel(room({ startsAtLabel: "Fri 8:00 PM" }))).toBe("Starts Fri 8:00 PM");
    expect(liveRoomTimeLabel(room({ status: "live" }))).toBeNull();
    expect(liveRoomTimeLabel(room({ status: "canceled" }))).toBe("Canceled");
    expect(liveRoomTimeLabel(room({ status: "ended" }))).toBe("Ended");
    expect(liveRoomTimeLabel(room({ status: "ended", endedAtLabel: "1h ago" }))).toBe("Ended 1h ago");
  });

  test("participants labels summarize hosts and guests", () => {
    expect(liveRoomParticipantsLabel(undefined)).toBeNull();
    expect(liveRoomParticipantsLabel([{ role: "host", label: "kevin" }])).toBeNull();
    expect(liveRoomParticipantsLabel([
      { role: "host", label: "kevin" },
      { role: "guest", label: "jay" },
    ])).toBe("kevin with jay");
    expect(liveRoomParticipantsLabel([
      { role: "host", label: "kevin" },
      { role: "guest", label: "jay" },
      { role: "guest", label: "dom" },
      { role: "guest", label: "am" },
    ])).toBe("kevin with jay + 2");
  });

  test("replay surfaces only exist for ended rooms with a replay", () => {
    expect(hasReplaySurface(room({ status: "live" }))).toBe(false);
    expect(hasReplaySurface(room({ status: "ended", replayStatus: "none" }))).toBe(false);
    expect(hasReplaySurface(room({ status: "ended", replayStatus: "published" }))).toBe(true);
  });
});

