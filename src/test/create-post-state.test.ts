import { describe, expect, test } from "bun:test";
import type { Community } from "@pirate/api-contracts";

import {
  buildLiveRoomFreedomLaunchHref,
  buildLiveRoomRequest,
  isPublicAudienceAllowed,
  shouldAutoLaunchLiveRoom,
  songArtifactBundleToComposerReference,
} from "../app/authenticated-state/create-post-state";

function createCommunity(overrides: Partial<Community> = {}): Community {
  return {
    id: "cmt_test",
    object: "community",
    created_by_user: "usr_test",
    display_name: "Test community",
    route_slug: "test-community",
    description: null,
    avatar_ref: null,
    banner_ref: null,
    status: "active",
    provisioning_state: "active",
    governance_mode: "centralized",
    handle_policy: { policy_template: "standard" },
    membership_mode: "open",
    default_age_gate_policy: "none",
    allow_anonymous_identity: false,
    anonymous_identity_scope: "community_stable",
    allowed_disclosed_qualifiers: [],
    created: Date.parse("2026-01-01T00:00:00.000Z"),
    donation_policy_mode: "none",
    donation_partner_status: "unconfigured",
    donation_partner: null,
    default_monetization: null,
    openai_moderation_settings: null,
    adult_content_policy: {} as Community["adult_content_policy"],
    graphic_content_policy: {} as Community["graphic_content_policy"],
    civility_policy: {} as Community["civility_policy"],
    reference_links: [],
    gate_rules: [],
    viewer_membership_status: "not_member",
    ...overrides,
  } as unknown as Community;
}

describe("isPublicAudienceAllowed", () => {
  test("allows public posts when the community only has membership gates", () => {
    const community = createCommunity({
      membership_mode: "gated",
      gate_rules: [
        {
          id: "gate_nat_us",
          object: "gate_rule",
          community: "cmt_test",
          scope: "membership",
          gate_family: "identity_proof",
          gate_type: "nationality",
          status: "active",
          created: Date.parse("2026-01-01T00:00:00.000Z"),
          proof_requirements: [
            {
              proof_type: "nationality",
              accepted_providers: ["self"],
              config: { required_value: "US" },
            },
          ],
        },
      ],
    });

    expect(isPublicAudienceAllowed(community)).toBe(true);
  });

  test("disables public posts when the community has an active viewer gate", () => {
    const community = createCommunity({
      gate_rules: [
        {
          id: "gate_viewer_human",
          object: "gate_rule",
          community: "cmt_test",
          scope: "viewer",
          gate_family: "identity_proof",
          gate_type: "unique_human",
          status: "active",
          created: Date.parse("2026-01-01T00:00:00.000Z"),
          proof_requirements: [
            {
              proof_type: "unique_human",
              accepted_providers: ["self"],
            },
          ],
        },
      ],
    });

    expect(isPublicAudienceAllowed(community)).toBe(false);
  });
});

describe("live room request mapping", () => {
  test("builds Freedom launch URLs for immediate live rooms", () => {
    expect(shouldAutoLaunchLiveRoom({ scheduleForLater: false, scheduleAt: "" })).toBe(true);
    expect(shouldAutoLaunchLiveRoom({ scheduleForLater: false, scheduleAt: "2026-06-01T12:00:00Z" })).toBe(true);
    expect(shouldAutoLaunchLiveRoom({ scheduleForLater: true, scheduleAt: "" })).toBe(false);
    expect(shouldAutoLaunchLiveRoom({ scheduleForLater: true, scheduleAt: "2026-06-01T12:00:00Z" })).toBe(false);
    expect(buildLiveRoomFreedomLaunchHref({
      communityId: "cmt_test",
      hostname: "pirate.sc",
      liveRoomId: "lr_test",
    })).toBe(
      "freedom://live-room?roomId=lr_test&communityId=cmt_test&apiBase=https%3A%2F%2Fapi.pirate.sc",
    );
  });

  test("preserves real song artifact bundle selections and drops fallback track ids", () => {
    const request = buildLiveRoomRequest({
      description: "Testing a local live room",
      hostUserId: "usr_test_host",
      liveState: {
        roomKind: "solo",
        accessMode: "free",
        visibility: "public",
        setlistStatus: "ready",
        performerAllocations: [{ role: "host", userId: "", sharePct: 100 }],
        setlistItems: [
          {
            declaredTrackId: "sab_song_bundle",
            titleText: "Catalog Song",
            artistText: "Catalog Artist",
            performanceKind: "original",
          },
          {
            declaredTrackId: "trk_fallback",
            titleText: "Fallback Song",
            artistText: "Fallback Artist",
            performanceKind: "cover",
          },
        ],
      },
      title: "Live with songs",
    });

    expect(request.performer_allocations).toBeUndefined();
    expect(request.setlist?.items?.[0]?.song_artifact_bundle).toBe("sab_song_bundle");
    expect(request.setlist?.items?.[1]?.song_artifact_bundle).toBeUndefined();
    expect(request.setlist?.items?.[1]?.rights_basis).toBe("cover");
  });

  test("keeps performer allocations for paid live rooms", () => {
    const request = buildLiveRoomRequest({
      description: "Testing a paid live room",
      hostUserId: "usr_test_host",
      liveState: {
        roomKind: "solo",
        accessMode: "paid",
        visibility: "public",
        setlistStatus: "ready",
        performerAllocations: [{ role: "host", userId: "", sharePct: 100 }],
        setlistItems: [
          {
            titleText: "Paid Song",
            artistText: "Paid Artist",
            performanceKind: "original",
          },
        ],
      },
      title: "Paid live",
    });

    expect(request.performer_allocations?.[0]?.user).toBe("usr_test_host");
    expect(request.performer_allocations?.[0]?.share_bps).toBe(10_000);
  });

  test("maps song artifact bundles into setlist picker references", () => {
    const reference = songArtifactBundleToComposerReference({
      id: "sab_song_bundle",
      object: "song_artifact_bundle",
      community: "com_cmt_test",
      creator_user: "usr_creator",
      status: "ready",
      title: "Catalog Song",
      primary_audio: { storage_ref: "ref", mime_type: "audio/wav" },
      media_refs: [],
      lyrics: "line",
      lyrics_sha256: "0xhash",
      preview_status: "completed",
      translation_status: "pending",
      alignment_status: "completed",
      moderation_status: "completed",
      created: 1,
    });

    expect(reference).toEqual({
      id: "sab_song_bundle",
      title: "Catalog Song",
      subtitle: "usr_creator",
    });
  });
});
