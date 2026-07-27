export interface ProfileFollowRelationshipRead {
  target_wallet: { status: "available"; address: string } | { status: "no_wallet" };
  relationship: {
    status: "current" | "viewer_anonymous" | "viewer_no_wallet" | "unavailable";
    viewer_follows: boolean | null;
  };
}

export type ResolvedProfileFollowRelationship =
  | { kind: "current"; viewerFollows: boolean }
  | { kind: "not_applicable" }
  | { kind: "viewer_absent" }
  | { kind: "unavailable" };

export function resolveProfileFollowRelationship(
  state: ProfileFollowRelationshipRead,
): ResolvedProfileFollowRelationship {
  if (state.target_wallet.status === "no_wallet") {
    return { kind: "not_applicable" };
  }

  if (state.relationship.status === "viewer_anonymous"
    || state.relationship.status === "viewer_no_wallet") {
    return { kind: "viewer_absent" };
  }

  if (state.relationship.status !== "current"
    || typeof state.relationship.viewer_follows !== "boolean") {
    return { kind: "unavailable" };
  }

  return {
    kind: "current",
    viewerFollows: state.relationship.viewer_follows,
  };
}
