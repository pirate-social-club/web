import type {
  Community,
  CommunityCreateAcceptedResponse,
  LocalizedPostResponse,
} from "@pirate/api-contracts";

import type {
  ApiCommunityMediaUploadResponse,
  ApiCreateLiveRoomRequest,
  ApiCreateCommunityRequest,
  ApiCommunityNamespaceListResponse,
  ApiLiveRoom,
  ApiLiveRoomAccessResponse,
  ApiLiveRoomReplayAccessResponse,
  ApiLiveRoomReplayDraft,
  ApiLiveRoomViewerAttachResponse,
  ApiLiveRoomViewerRenewRequest,
  ApiPublishLiveRoomRequest,
  ApiPublishLiveRoomReplayDraftRequest,
  ApiPublishLiveRoomResponse,
  ApiUpdateLiveRoomReplayDraftRequest,
  CommunityListPostsOptions,
} from "./client-api-types";
import { buildQueryPath, type ApiRequest } from "./client-internal";
import { createCommunityCommerceApi } from "./client-groups-community-commerce";
import { createCommunityHandleApi } from "./client-groups-community-handles";
import { createCommunityMembershipApi } from "./client-groups-community-membership";
import { createCommunityModerationApi } from "./client-groups-community-moderation";
import { createCommunitySettingsApi } from "./client-groups-community-settings";

export function createCommunitiesApi(request: ApiRequest) {
  return {
    create: (body: ApiCreateCommunityRequest): Promise<CommunityCreateAcceptedResponse> =>
      request<CommunityCreateAcceptedResponse>("/communities", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    uploadMedia: (
      input: {
        kind: "avatar" | "banner" | "post_image" | "comment_image";
        file: File;
        onProgress?: (fraction: number) => void;
      },
    ): Promise<ApiCommunityMediaUploadResponse> => {
      const body = new FormData();
      body.set("kind", input.kind);
      body.set("file", input.file);
      return request<ApiCommunityMediaUploadResponse>("/community-media", {
        method: "POST",
        body,
        onUploadProgress: input.onProgress,
      });
    },
    get: (communityId: string, opts?: { locale?: string | null }): Promise<Community> => {
      return request<Community>(buildQueryPath(
        `/communities/${encodeURIComponent(communityId)}`,
        { locale: opts?.locale },
      ));
    },
    attachNamespace: (
      communityId: string,
      namespaceVerificationId: string,
      namespaceRole: "primary" | "mirror" = "primary",
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/namespace`, {
        method: "POST",
        body: JSON.stringify({
          namespace_verification: namespaceVerificationId,
          namespace_role: namespaceRole,
        }),
      }),
    listNamespaces: (communityId: string): Promise<ApiCommunityNamespaceListResponse> =>
      request<ApiCommunityNamespaceListResponse>(
        `/communities/${encodeURIComponent(communityId)}/namespaces`,
      ),
    setPendingNamespaceSession: (
      communityId: string,
      namespaceVerificationSessionId: string | null,
    ): Promise<Community> =>
      request<Community>(
        `/communities/${encodeURIComponent(communityId)}/pending-namespace-session`,
        {
          method: "POST",
          body: JSON.stringify({
            namespace_verification_session_id: namespaceVerificationSessionId,
          }),
        },
      ),
    createLiveRoom: (
      communityId: string,
      body: ApiCreateLiveRoomRequest,
    ): Promise<ApiLiveRoom> =>
      request<ApiLiveRoom>(`/communities/${encodeURIComponent(communityId)}/live-rooms`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    publishLiveRoom: (
      communityId: string,
      body: ApiPublishLiveRoomRequest,
    ): Promise<ApiPublishLiveRoomResponse> =>
      request<ApiPublishLiveRoomResponse>(`/communities/${encodeURIComponent(communityId)}/live-rooms/publish`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    getLiveRoom: (communityId: string, liveRoomId: string): Promise<ApiLiveRoom> =>
      request<ApiLiveRoom>(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}`,
      ),
    getLiveRoomReplayDraft: (communityId: string, liveRoomId: string): Promise<ApiLiveRoomReplayDraft> =>
      request<ApiLiveRoomReplayDraft>(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}/replay-draft`,
      ),
    updateLiveRoomReplayDraft: (
      communityId: string,
      liveRoomId: string,
      body: ApiUpdateLiveRoomReplayDraftRequest,
    ): Promise<ApiLiveRoomReplayDraft> =>
      request<ApiLiveRoomReplayDraft>(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}/replay-draft`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    publishLiveRoomReplayDraft: (
      communityId: string,
      liveRoomId: string,
      body: ApiPublishLiveRoomReplayDraftRequest,
    ): Promise<ApiLiveRoomReplayDraft> =>
      request<ApiLiveRoomReplayDraft>(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}/replay-draft/publish`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    getLiveRoomReplayAccess: (communityId: string, liveRoomId: string): Promise<ApiLiveRoomReplayAccessResponse> =>
      request<ApiLiveRoomReplayAccessResponse>(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}/replay/access`,
      ),
    getLiveRoomReplayContent: (communityId: string, liveRoomId: string): Promise<Response> =>
      request<Response>(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}/replay/content`,
        { responseType: "response" },
      ),
    getLiveRoomAccess: (communityId: string, liveRoomId: string): Promise<ApiLiveRoomAccessResponse> =>
      request<ApiLiveRoomAccessResponse>(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}/access`,
      ),
    acceptLiveRoomGuestInvite: (communityId: string, liveRoomId: string): Promise<ApiLiveRoom> =>
      request<ApiLiveRoom>(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}/guest_accept`,
        { method: "POST" },
      ),
    viewerAttachLiveRoom: (communityId: string, liveRoomId: string): Promise<ApiLiveRoomViewerAttachResponse> =>
      request<ApiLiveRoomViewerAttachResponse>(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}/viewer_attach`,
        { method: "POST" },
      ),
    viewerRenewLiveRoom: (
      communityId: string,
      liveRoomId: string,
      body: ApiLiveRoomViewerRenewRequest,
    ): Promise<ApiLiveRoomViewerAttachResponse> =>
      request<ApiLiveRoomViewerAttachResponse>(
        `/communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}/viewer_renew`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    ...createCommunitySettingsApi(request),
    ...createCommunityMembershipApi(request),
    ...createCommunityHandleApi(request),
    ...createCommunityCommerceApi(request),
    ...createCommunityModerationApi(request),
    listPosts: (
      communityId: string,
      opts?: CommunityListPostsOptions,
    ): Promise<{ items: LocalizedPostResponse[]; next_cursor: string | null }> => {
      return request<{ items: LocalizedPostResponse[]; next_cursor: string | null }>(buildQueryPath(
        `/communities/${encodeURIComponent(communityId)}/posts`,
        {
          cursor: opts?.cursor,
          flair_id: opts?.flair_id,
          has_event: opts?.has_event == null ? null : String(opts.has_event),
          limit: opts?.limit,
          locale: opts?.locale,
          sort: opts?.sort,
        },
      ));
    },
  };
}
