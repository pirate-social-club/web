import { beforeEach, describe, expect, mock, test } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import type {
  CommunityPreview,
  LocalizedPostResponse,
  Profile,
  ProfileActivityResponse,
} from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

let fakeApi: {
  publicProfiles: {
    getActivity: ReturnType<typeof mock>;
  };
  profiles: {
    getActivity: ReturnType<typeof mock>;
  };
};
let fakeSession: { accessToken?: string; profile?: Profile | null; user?: { id: string } } | null;
const loadProfilesByUserIdMock = mock(async () => ({}));

mock.module("@/lib/api", () => ({
  useApi: () => fakeApi,
}));

mock.module("@/lib/api/session-store", () => ({
  __resetSessionStoreForTests: () => {},
  clearSession: () => {},
  getAccessToken: () => fakeSession?.accessToken ?? null,
  getStoredSession: () => fakeSession,
  isSessionAccessTokenExpired: () => false,
  isSessionAccessTokenExpiringSoon: () => false,
  isSessionClearInProgress: () => false,
  revalidateSession: async () => true,
  setSession: () => fakeSession,
  setSessionClearCallback: () => {},
  subscribeToSession: () => () => {},
  updateSessionIdentityWallet: () => {},
  updateSessionOnboarding: () => {},
  updateSessionProfile: () => {},
  updateSessionUser: () => {},
  useSession: () => fakeSession,
  useSessionClearInProgress: () => false,
}));

mock.module("@/app/authenticated-data/community-data", () => ({
  loadProfilesByUserId: loadProfilesByUserIdMock,
}));

const { usePublicProfileActivity } = await import("./use-profile-activity");

const community = {
  display_name: "Test Builders",
  id: "cmt_test",
  object: "community_preview",
  route_slug: "test-builders",
} as CommunityPreview;

const authorProfile = {
  avatar_ref: "https://example.test/profile-avatar.png",
  display_name: "Swift Fox",
  global_handle: { label: "swift-fox-7721.pirate" },
  id: "prf_swift",
  object: "profile",
  primary_public_handle: { label: "swift-fox-7721.pirate" },
  user: "usr_swift",
} as Profile;

function makePost(): LocalizedPostResponse {
  return {
    comment_count: 0,
    community,
    downvote_count: 0,
    like_count: 0,
    machine_translated: false,
    post: {
      age_gate_policy: "none",
      analysis_state: "allow",
      author_public_handle: "swift-fox-7721.pirate",
      author_user: "usr_swift",
      authorship_mode: "human_direct",
      community: "cmt_test",
      content_safety_state: "safe",
      created: 1_782_000_000,
      id: "pst_profile",
      identity_mode: "public",
      object: "post",
      post_type: "text",
      status: "published",
      title: "Profile activity post",
      visibility: "public",
    },
    resolved_locale: "en",
    source_hash: "post-hash",
    thread_snapshot: null,
    translation_state: "same_language",
    upvote_count: 1,
    viewer_is_author: false,
    viewer_reaction_kinds: [],
    viewer_vote: null,
  } as LocalizedPostResponse;
}

describe("usePublicProfileActivity", () => {
  beforeEach(() => {
    fakeSession = null;
    loadProfilesByUserIdMock.mockClear();
    fakeApi = {
      publicProfiles: {
        getActivity: mock(async () => ({
          comments: [],
          has_more: false,
          next_cursor: null,
          object: "profile_activity",
          overview_items: [],
          posts: [{
            community,
            created: 1_782_000_000,
            kind: "post",
            post: makePost(),
          }],
          tab: "posts",
        } as ProfileActivityResponse)),
      },
      profiles: {
        getActivity: mock(async () => ({
          comments: [],
          has_more: false,
          next_cursor: null,
          object: "profile_activity",
          overview_items: [],
          posts: [],
          tab: "posts",
        } as ProfileActivityResponse)),
      },
    };
    loadProfilesByUserIdMock.mockResolvedValue({ usr_swift: authorProfile });
  });

  test("loads author profiles for activity authors and maps post avatars", async () => {
    const { result } = renderHook(() =>
      usePublicProfileActivity("swift-fox-7721.pirate", "en", "posts"),
    );

    await waitFor(() => {
      expect(result.current.posts).toHaveLength(1);
    });

    expect(fakeApi.publicProfiles.getActivity).toHaveBeenCalledWith("swift-fox-7721.pirate", {
      limit: 25,
      locale: "en",
      tab: "posts",
    });
    expect(loadProfilesByUserIdMock).toHaveBeenCalledWith(
      fakeApi,
      ["usr_swift"],
      {},
    );
    expect(result.current.posts[0]?.post.byline?.author?.avatarSrc).toBe("https://example.test/profile-avatar.png");
  });
});
