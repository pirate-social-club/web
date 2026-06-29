import type { AssetAccessResponse, CommunityListing } from "@pirate/api-contracts";

import type { ApiLiveRoomReplayAccessResponse } from "@/lib/api/client-api-types";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";

type ReplayCommunitiesClient = {
  getLiveRoomReplayAccess: (communityId: string, liveRoomId: string) => Promise<ApiLiveRoomReplayAccessResponse>;
  getLiveRoomReplayContent: (communityId: string, liveRoomId: string) => Promise<Response>;
};

type StoryCdrAccessPackage = NonNullable<AssetAccessResponse["story_cdr_access"]>;

type ReadStoryCdrAsset = (params: {
  access: StoryCdrAccessPackage;
  accessToken: string | null;
  wallet: PirateConnectedEvmWallet;
}) => Promise<Blob>;

export type LiveRoomReplayPlaybackResult =
  | { kind: "ready"; blob: Blob }
  | { kind: "purchase_required"; replayAsset: string | null; replayListing: CommunityListing | null }
  | { kind: "delivery_pending" }
  | { kind: "not_published" }
  | { kind: "wallet_required" }
  | { kind: "not_available" };

async function loadStoryCdrReader(): Promise<ReadStoryCdrAsset> {
  const { readStoryCdrAsset } = await import("@/lib/story/cdr-browser");
  return readStoryCdrAsset;
}

function mapDeniedReplayAccess(access: ApiLiveRoomReplayAccessResponse): LiveRoomReplayPlaybackResult {
  if (access.decision_reason === "purchase_required") {
    return {
      kind: "purchase_required",
      replayAsset: access.replay_asset,
      replayListing: access.replay_listing,
    };
  }
  if (access.decision_reason === "delivery_pending") return { kind: "delivery_pending" };
  if (access.decision_reason === "not_published") return { kind: "not_published" };
  return { kind: "not_available" };
}

export async function loadLiveRoomReplayPlayback(params: {
  accessToken: string | null;
  api: ReplayCommunitiesClient;
  communityId: string;
  liveRoomId: string;
  readStoryCdrAsset?: ReadStoryCdrAsset;
  wallet?: PirateConnectedEvmWallet | null;
}): Promise<LiveRoomReplayPlaybackResult> {
  const access = await params.api.getLiveRoomReplayAccess(params.communityId, params.liveRoomId);
  if (!access.access_granted) {
    return mapDeniedReplayAccess(access);
  }

  if (access.delivery_kind === "primary_content_ref") {
    const response = await params.api.getLiveRoomReplayContent(params.communityId, params.liveRoomId);
    if (!response.ok) {
      throw new Error("Could not load this replay.");
    }
    return {
      kind: "ready",
      blob: await response.blob(),
    };
  }

  if (access.delivery_kind === "story_cdr_ref" && access.story_cdr_access) {
    if (!params.wallet) {
      return { kind: "wallet_required" };
    }
    const readStoryCdrAsset = params.readStoryCdrAsset ?? await loadStoryCdrReader();
    return {
      kind: "ready",
      blob: await readStoryCdrAsset({
        access: access.story_cdr_access as StoryCdrAccessPackage,
        accessToken: params.accessToken,
        wallet: params.wallet,
      }),
    };
  }

  return { kind: "not_available" };
}
