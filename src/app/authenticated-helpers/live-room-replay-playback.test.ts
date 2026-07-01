import { describe, expect, mock, test } from "bun:test";

import type { ApiLiveRoomReplayAccessResponse } from "@/lib/api/client-api-types";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";

import { loadLiveRoomReplayPlayback } from "./live-room-replay-playback";

const storyCdrAccess = {
  access_aux_data_hex: "0x1234",
  access_proof: { mode: "signed" },
  access_ref: "liv_test",
  access_scope: "asset.share",
  cdr_contract_address: "0x0000000000000000000000000000000000000001",
  chain_id: 1315,
  cipher_algorithm: "AES-256-GCM",
  cipher_iv_b64: "aXY=",
  ciphertext_ref: "/communities/cmt_test/live-rooms/liv_test/replay/content",
  mime_type: "video/mp4",
  namespace: "pirate.test",
  read_condition_address: "0x0000000000000000000000000000000000000002",
  rpc_url: "https://story.test",
  vault_uuid: 7,
} satisfies NonNullable<ApiLiveRoomReplayAccessResponse["story_cdr_access"]>;

function replayAccess(overrides: Partial<ApiLiveRoomReplayAccessResponse> = {}): ApiLiveRoomReplayAccessResponse {
  return {
    access_granted: true,
    access_mode: "free",
    decision_reason: "free",
    delivery_kind: "primary_content_ref",
    delivery_ref: "/communities/cmt_test/live-rooms/liv_test/replay/content",
    live_room: "liv_test",
    locked_delivery_status: "none",
    replay_asset: "lrp_test",
    replay_listing: null,
    replay_status: "published",
    story_cdr_access: null,
    ...overrides,
  };
}

function createReplayApi(access: ApiLiveRoomReplayAccessResponse, content = new Blob(["replay"], { type: "video/mp4" })) {
  return {
    getLiveRoomReplayAccess: mock(async () => access),
    getLiveRoomReplayContent: mock(async () => new Response(content)),
  };
}

describe("loadLiveRoomReplayPlayback", () => {
  test("loads free published replay content from the replay content endpoint", async () => {
    const api = createReplayApi(replayAccess());

    const result = await loadLiveRoomReplayPlayback({
      accessToken: "token",
      api,
      communityId: "cmt_test",
      liveRoomId: "liv_test",
    });

    expect(result.kind).toBe("ready");
    expect(result.kind === "ready" ? result.blob.type : null).toBe("video/mp4");
    expect(api.getLiveRoomReplayAccess).toHaveBeenCalledWith("cmt_test", "liv_test");
    expect(api.getLiveRoomReplayContent).toHaveBeenCalledWith("cmt_test", "liv_test");
  });

  test("returns purchase_required without fetching replay bytes", async () => {
    const api = createReplayApi(replayAccess({
      access_granted: false,
      decision_reason: "purchase_required",
      delivery_kind: null,
      delivery_ref: null,
    }));

    const result = await loadLiveRoomReplayPlayback({
      accessToken: "token",
      api,
      communityId: "cmt_test",
      liveRoomId: "liv_test",
    });

    expect(result).toEqual({
      kind: "purchase_required",
      replayAsset: "lrp_test",
      replayListing: null,
    });
    expect(api.getLiveRoomReplayContent).not.toHaveBeenCalled();
  });

  test("returns status-specific denial states", async () => {
    const pendingApi = createReplayApi(replayAccess({
      access_granted: false,
      decision_reason: "delivery_pending",
      delivery_kind: null,
      delivery_ref: null,
    }));
    const unpublishedApi = createReplayApi(replayAccess({
      access_granted: false,
      decision_reason: "not_published",
      delivery_kind: null,
      delivery_ref: null,
    }));

    await expect(loadLiveRoomReplayPlayback({
      accessToken: "token",
      api: pendingApi,
      communityId: "cmt_test",
      liveRoomId: "liv_test",
    })).resolves.toEqual({ kind: "delivery_pending" });
    await expect(loadLiveRoomReplayPlayback({
      accessToken: "token",
      api: unpublishedApi,
      communityId: "cmt_test",
      liveRoomId: "liv_test",
    })).resolves.toEqual({ kind: "not_published" });
  });

  test("requires a wallet before attempting Story CDR replay unlock", async () => {
    const readStoryCdrAsset = mock(async () => new Blob(["locked"], { type: "video/mp4" }));
    const api = createReplayApi(replayAccess({
      access_mode: "included_with_ticket",
      decision_reason: "purchase_entitlement",
      delivery_kind: "story_cdr_ref",
      delivery_ref: "story-cdr:replay",
      locked_delivery_status: "ready",
      story_cdr_access: storyCdrAccess,
    }));

    const result = await loadLiveRoomReplayPlayback({
      accessToken: "token",
      api,
      communityId: "cmt_test",
      liveRoomId: "liv_test",
      readStoryCdrAsset,
      wallet: null,
    });

    expect(result).toEqual({ kind: "wallet_required" });
    expect(readStoryCdrAsset).not.toHaveBeenCalled();
  });

  test("unlocks Story CDR replay content with the connected wallet", async () => {
    const lockedBlob = new Blob(["locked"], { type: "video/mp4" });
    const readStoryCdrAsset = mock(async () => lockedBlob);
    const wallet = { address: "0x0000000000000000000000000000000000000003" } as PirateConnectedEvmWallet;
    const api = createReplayApi(replayAccess({
      access_mode: "included_with_ticket",
      decision_reason: "purchase_entitlement",
      delivery_kind: "story_cdr_ref",
      delivery_ref: "story-cdr:replay",
      locked_delivery_status: "ready",
      story_cdr_access: storyCdrAccess,
    }));

    const result = await loadLiveRoomReplayPlayback({
      accessToken: "token",
      api,
      communityId: "cmt_test",
      liveRoomId: "liv_test",
      readStoryCdrAsset,
      wallet,
    });

    expect(result).toEqual({ kind: "ready", blob: lockedBlob });
    const call = readStoryCdrAsset.mock.calls[0]?.[0];
    expect(call?.access.access_ref).toBe("liv_test");
    expect(call?.access.access_scope).toBe("asset.share");
    expect(call?.accessToken).toBe("token");
    expect(call?.wallet).toBe(wallet);
    expect(api.getLiveRoomReplayContent).not.toHaveBeenCalled();
  });

  test("fails closed when primary replay delivery includes a Story CDR package", async () => {
    const api = createReplayApi(replayAccess({
      delivery_kind: "primary_content_ref",
      story_cdr_access: storyCdrAccess,
    }));

    const result = await loadLiveRoomReplayPlayback({
      accessToken: "token",
      api,
      communityId: "cmt_test",
      liveRoomId: "liv_test",
    });

    expect(result).toEqual({ kind: "not_available" });
    expect(api.getLiveRoomReplayContent).not.toHaveBeenCalled();
  });

  test("fails closed when Story CDR ciphertext points at a different replay", async () => {
    const readStoryCdrAsset = mock(async () => new Blob(["locked"], { type: "video/mp4" }));
    const wallet = { address: "0x0000000000000000000000000000000000000003" } as PirateConnectedEvmWallet;
    const api = createReplayApi(replayAccess({
      access_mode: "paid",
      decision_reason: "purchase_entitlement",
      delivery_kind: "story_cdr_ref",
      delivery_ref: "story-cdr:replay",
      locked_delivery_status: "ready",
      story_cdr_access: {
        ...storyCdrAccess,
        ciphertext_ref: "/communities/cmt_other/live-rooms/liv_other/replay/content",
      },
    }));

    const result = await loadLiveRoomReplayPlayback({
      accessToken: "token",
      api,
      communityId: "cmt_test",
      liveRoomId: "liv_test",
      readStoryCdrAsset,
      wallet,
    });

    expect(result).toEqual({ kind: "not_available" });
    expect(readStoryCdrAsset).not.toHaveBeenCalled();
    expect(api.getLiveRoomReplayContent).not.toHaveBeenCalled();
  });
});
