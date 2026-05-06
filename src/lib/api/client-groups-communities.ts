import type {
  Community,
  CommunityCreateAcceptedResponse,
  LocalizedPostResponse,
} from "@pirate/api-contracts";

import type {
  ApiCommunityMediaUploadResponse,
  ApiCreateCommunityRequest,
  CommunityListPostsOptions,
} from "./client-api-types";
import { buildQueryPath, type ApiRequest } from "./client-internal";
import { createCommunityCommerceApi } from "./client-groups-community-commerce";
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
      input: { kind: "avatar" | "banner" | "post_image" | "comment_image"; file: File },
    ): Promise<ApiCommunityMediaUploadResponse> => {
      const body = new FormData();
      body.set("kind", input.kind);
      body.set("file", input.file);
      return request<ApiCommunityMediaUploadResponse>("/community-media", { method: "POST", body });
    },
    get: (communityId: string, opts?: { locale?: string | null }): Promise<Community> => {
      return request<Community>(buildQueryPath(
        `/communities/${encodeURIComponent(communityId)}`,
        { locale: opts?.locale },
      ));
    },
    attachNamespace: (communityId: string, namespaceVerificationId: string): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/namespace`, {
        method: "POST",
        body: JSON.stringify({ namespace_verification: namespaceVerificationId }),
      }),
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
    ...createCommunitySettingsApi(request),
    ...createCommunityMembershipApi(request),
    ...createCommunityCommerceApi(request),
    ...createCommunityModerationApi(request),
    listPosts: (
      communityId: string,
      opts?: CommunityListPostsOptions,
    ): Promise<{ items: LocalizedPostResponse[] }> => {
      return request<{ items: LocalizedPostResponse[] }>(buildQueryPath(
        `/communities/${encodeURIComponent(communityId)}/posts`,
        {
          cursor: opts?.cursor,
          flair_id: opts?.flair_id,
          limit: opts?.limit,
          locale: opts?.locale,
          sort: opts?.sort,
        },
      ));
    },
  };
}
