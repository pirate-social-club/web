import { describe, expect, test } from "bun:test";

import { videoViewerPublisherRelationship } from "./video-viewer-publisher";

describe("videoViewerPublisherRelationship", () => {
  test("returns a follow relationship for public authors with a wallet", () => {
    expect(videoViewerPublisherRelationship({
      authorUserId: "user-author",
      authorWalletAddress: "0xabc",
      currentUserId: "user-viewer",
      identityMode: "public",
      joinedLabel: "Joined",
      joinLabel: "Join",
    })).toEqual({
      kind: "follow",
      ownProfile: false,
      targetUserId: "user-author",
      targetWalletAddress: "0xabc",
    });
  });

  test("marks the author's own profile", () => {
    expect(videoViewerPublisherRelationship({
      authorUserId: "user-author",
      authorWalletAddress: "0xabc",
      currentUserId: "user-author",
      identityMode: "public",
      joinedLabel: "Joined",
      joinLabel: "Join",
    })).toMatchObject({ ownProfile: true });
  });

  test("marks the author's own profile across repeated prefixes", () => {
    expect(videoViewerPublisherRelationship({
      authorUserId: "usr_workspace_owner",
      authorWalletAddress: "0xabc",
      currentUserId: "usr_usr_workspace_owner",
      identityMode: "public",
      joinedLabel: "Joined",
      joinLabel: "Join",
    })).toMatchObject({ ownProfile: true });
  });

  test("hides the follow relationship when the wallet is unresolved", () => {
    expect(videoViewerPublisherRelationship({
      authorUserId: "user-author",
      currentUserId: "user-viewer",
      identityMode: "public",
      joinedLabel: "Joined",
      joinLabel: "Join",
    })).toBeUndefined();
  });

  test("returns an inactive join for anonymous posts without membership", () => {
    expect(videoViewerPublisherRelationship({
      identityMode: "anonymous",
      joinedLabel: "Joined",
      joinLabel: "Join",
    })).toEqual({ active: false, disabled: false, kind: "join", label: "Join" });
  });

  test("prefers gate-state membership over the embedded community payload", () => {
    expect(videoViewerPublisherRelationship({
      community: { viewer_community_role: null, viewer_membership_status: "not_member" },
      gateState: { viewer_community_role: "member", viewer_membership_status: "member" },
      identityMode: "anonymous",
      joinedLabel: "Joined",
      joinLabel: "Join",
    })).toEqual({ active: true, disabled: true, kind: "join", label: "Joined" });
  });

  test("falls back to the embedded community payload without gate state", () => {
    expect(videoViewerPublisherRelationship({
      community: { viewer_community_role: "moderator" },
      identityMode: "anonymous",
      joinedLabel: "Joined",
      joinLabel: "Join",
    })).toEqual({ active: true, disabled: true, kind: "join", label: "Joined" });
  });

  test("disables join for banned viewers", () => {
    expect(videoViewerPublisherRelationship({
      gateState: { viewer_membership_status: "banned" },
      identityMode: "anonymous",
      joinedLabel: "Joined",
      joinLabel: "Join",
    })).toEqual({ active: false, disabled: true, kind: "join", label: "Join" });
  });
});
