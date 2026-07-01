import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";

import type { ApiLiveRoomReplayDraft } from "@/lib/api/client-api-types";

import {
  accessPolicyFromDraft,
  approvalStatusFromDraft,
  formatDurationLabel,
  replayDraftStatus,
  replayDraftUpdateRequest,
  royaltySplitFromDraft,
} from "./replay-draft-route";

function draft(
  overrides: Partial<ApiLiveRoomReplayDraft> = {},
): ApiLiveRoomReplayDraft {
  return {
    object: "live_room_replay_draft",
    live_room: "lr_test",
    recording_enabled: true,
    replay_asset: null,
    replay_status: "none",
    status: "processing",
    recording: null,
    ...overrides,
  };
}

describe("replay draft route helpers", () => {
  test("preserves every backend replay draft status", () => {
    expect(replayDraftStatus("not_recorded")).toBe("not_recorded");
    expect(replayDraftStatus("processing")).toBe("processing");
    expect(replayDraftStatus("ready")).toBe("ready");
    expect(replayDraftStatus("review_pending")).toBe("review_pending");
    expect(replayDraftStatus("published")).toBe("published");
    expect(replayDraftStatus("failed")).toBe("failed");
  });

  test("derives access policy and approval state from replay asset allocations", () => {
    const pendingDraft = draft({
      replay_asset: {
        id: "lra_test",
        object: "live_room_replay_asset",
        publication_status: "draft",
        title: "Replay",
        caption: null,
        duration_ms: 2_880_000,
        preview_ref: null,
        access_mode: "included_with_ticket",
        locked_delivery_status: "none",
        published_at: null,
        allocations: [
          {
            id: "host",
            participant_user: "usr_host",
            external_party_ref: null,
            role: "host",
            share_bps: 7000,
            rights_basis: "original",
            approval_status: "approved",
          },
          {
            id: "guest",
            participant_user: "usr_guest",
            external_party_ref: null,
            role: "guest",
            share_bps: 3000,
            rights_basis: "licensed",
            approval_status: "pending",
          },
        ],
      },
    });

    expect(accessPolicyFromDraft(pendingDraft)).toBe("included_with_ticket");
    expect(approvalStatusFromDraft(pendingDraft)).toBe("pending");
    expect(royaltySplitFromDraft(pendingDraft)).toEqual({
      allocations: [
        { id: "host", recipientKind: "creator", walletAddress: "usr_host", sharePct: 70 },
        { id: "guest", recipientKind: "collaborator", walletAddress: "usr_guest", sharePct: 30 },
      ],
    });
  });

  test("prioritizes rejected approval and falls back to free when no replay asset exists", () => {
    expect(accessPolicyFromDraft(draft())).toBe("free");
    expect(approvalStatusFromDraft(draft())).toBe("not_required");
    expect(approvalStatusFromDraft(draft({
      replay_asset: {
        id: "lra_rejected",
        object: "live_room_replay_asset",
        publication_status: "draft",
        title: "Replay",
        caption: null,
        duration_ms: null,
        preview_ref: null,
        access_mode: "paid",
        locked_delivery_status: "none",
        published_at: null,
        allocations: [
          {
            id: "host",
            participant_user: "usr_host",
            external_party_ref: null,
            role: "host",
            share_bps: 5000,
            rights_basis: "original",
            approval_status: "pending",
          },
          {
            id: "label",
            participant_user: null,
            external_party_ref: "0x4d5e7f1a2b3c4567890123def456789012345fa",
            role: "rightsholder",
            share_bps: 5000,
            rights_basis: "licensed",
            approval_status: "rejected",
          },
        ],
      },
    }))).toBe("rejected");
  });

  test("formats replay duration labels in whole minutes", () => {
    expect(formatDurationLabel(null, "en-US")).toBeUndefined();
    expect(formatDurationLabel(0, "en-US")).toBeUndefined();
    expect(formatDurationLabel(31_000, "en-US")).toBe("1 min");
    expect(formatDurationLabel(2_880_000, "en-US")).toBe("48 min");
  });

  test("builds draft update allocations with rounded bps and explicit recipient kind", () => {
    expect(replayDraftUpdateRequest({
      accessPolicy: "paid",
      caption: "Replay caption",
      title: "Replay title",
      royaltySplit: {
        allocations: [
          { id: "host", recipientKind: "creator", walletAddress: "usr_host", sharePct: 33.33 },
          {
            id: "label",
            recipientKind: "collaborator",
            walletAddress: "0x4d5e7f1a2b3c4567890123def456789012345fa",
            sharePct: 66.67,
          },
        ],
      },
    })).toEqual({
      access_mode: "paid",
      allocations: [
        { participant_user: "usr_host", role: "host", share_bps: 3333 },
        {
          external_party_ref: "0x4d5e7f1a2b3c4567890123def456789012345fa",
          role: "rightsholder",
          share_bps: 6667,
        },
      ],
      caption: "Replay caption",
      title: "Replay title",
    });
  });
});
