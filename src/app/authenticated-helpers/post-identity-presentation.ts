import type { CommentListItem as ApiCommentListItem } from "@pirate/api-contracts";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import { buildPublicProfilePathForProfile, getProfileHandleLabel } from "@/lib/profile-routing";

export function formatQualifierLabel(qualifierTemplateId: string): string {
  const trimmed = qualifierTemplateId.trim();
  if (!trimmed) return "Qualifier";

  const normalized = trimmed
    .replace(/^qlf_/iu, "")
    .replace(/^vc_/iu, "")
    .replace(/^proof_/iu, "");

  if (normalized === "age_over_18") return "18+";
  if (normalized === "unique_human") return "Unique Human";

  return normalized
    .split(/[_-]+/u)
    .reduce<string[]>((result, segment) => {
      if (segment) {
        result.push(segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase());
      }
      return result;
    }, [])
    .join(" ");
}

export function resolveAnonymousComposerLabel(
  scope: ApiCommunity["anonymous_identity_scope"] | undefined | null,
): string {
  switch (scope) {
    case "thread_stable":
      return "Pseudonym";
    case "post_ephemeral":
      return "Pseudonym";
    case "community_stable":
    default:
      return "Pseudonym";
  }
}

export function resolveAnonymousComposerDescription(
  scope: ApiCommunity["anonymous_identity_scope"] | undefined | null,
): string {
  switch (scope) {
    case "thread_stable":
      return "Same identity in this thread";
    case "post_ephemeral":
      return "New identity for this post";
    case "community_stable":
    default:
      return "Same identity across this community";
  }
}

export function resolvePublicIdentityLabel(
  profile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
): string | null {
  if (!profile?.global_handle?.label) {
    return null;
  }

  return getProfileHandleLabel(profile);
}

export function resolvePublicAuthorFallback(
  authorUserId?: string | null,
  authorProfile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
): string {
  return resolvePublicIdentityLabel(authorProfile)
    ?? (authorUserId ? authorUserId.slice(0, 8) : "Pirate user");
}

export function resolvePostAuthorLabel(
  post: Pick<ApiPost["post"], "agent_display_name_snapshot" | "anonymous_label" | "author_public_handle" | "author_user" | "authorship_mode" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
): string {
  if (post.identity_mode === "anonymous") {
    return post.anonymous_label ?? "anon";
  }

  if (post.authorship_mode === "user_agent" && post.agent_display_name_snapshot) {
    return post.agent_display_name_snapshot;
  }

  // Prefer the server-resolved public handle so the byline is correct on first
  // paint; fall back to the separately-fetched profile (then a truncated id).
  return post.author_public_handle ?? resolvePublicAuthorFallback(post.author_user, authorProfile);
}

export function resolvePostAuthorAvatarSeed(
  post: Pick<ApiPost["post"], "anonymous_label" | "author_user" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "id"> | null,
): string | undefined {
  if (post.identity_mode === "anonymous") {
    return post.anonymous_label ?? post.author_user ?? undefined;
  }
  return authorProfile?.id ?? post.author_user ?? undefined;
}

export function resolveAgentAuthor(
  post: Pick<ApiPost["post"], "agent_display_name_snapshot" | "agent_owner_handle_snapshot" | "author_user" | "authorship_mode" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
) {
  if (post.identity_mode !== "public" || post.authorship_mode !== "user_agent" || !post.agent_display_name_snapshot) {
    return undefined;
  }

  const ownerLabel = post.agent_owner_handle_snapshot?.trim()
    || resolvePublicIdentityLabel(authorProfile)
    || resolvePublicAuthorFallback(post.author_user, authorProfile);
  const ownerHref = post.author_user && authorProfile
    ? buildPublicProfilePathForProfile(authorProfile)
    : undefined;

  return {
    label: post.agent_display_name_snapshot,
    ownerLabel,
    ownerHref,
  };
}

export function resolveCommentAuthorLabel(
  comment: Pick<ApiCommentListItem["comment"], "anonymous_label" | "author_public_handle" | "author_user" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
): string {
  if (comment.identity_mode === "anonymous") {
    return comment.anonymous_label ?? "anon";
  }

  // Prefer the server-resolved public handle so the byline is correct on first
  // paint; fall back to the separately-fetched profile (then a truncated id).
  return comment.author_public_handle ?? resolvePublicAuthorFallback(comment.author_user, authorProfile);
}

export function resolveCommentAuthorAvatarSeed(
  comment: Pick<ApiCommentListItem["comment"], "anonymous_label" | "author_user" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "id"> | null,
): string | undefined {
  if (comment.identity_mode === "anonymous") {
    return comment.anonymous_label ?? comment.author_user ?? undefined;
  }
  return authorProfile?.id ?? comment.author_user ?? undefined;
}

export function resolvePostQualifierLabels(postResponse: ApiPost): string[] | undefined {
  const disclosedQualifierLabels = postResponse.post.disclosed_qualifiers_json
    ?.reduce<string[]>((result, qualifier) => {
      const label = qualifier.rendered_label?.trim();
      if (label) {
        result.push(label);
      }
      return result;
    }, []);

  if (disclosedQualifierLabels?.length) {
    return disclosedQualifierLabels;
  }

  return postResponse.label?.label ? [postResponse.label.label] : undefined;
}

export function toViewerVote(value: ApiPost["viewer_vote"]): PostCardProps["engagement"]["viewerVote"] {
  if (value === 1) return "up";
  if (value === -1) return "down";
  return null;
}

export function getPostCommentCount(postResponse: ApiPost): number {
  return postResponse.comment_count ?? postResponse.thread_snapshot?.comment_count ?? 0;
}

export function toCommentViewerVote(value: ApiCommentListItem["viewer_vote"]): "up" | "down" | null {
  if (value === 1) return "up";
  if (value === -1) return "down";
  return null;
}
