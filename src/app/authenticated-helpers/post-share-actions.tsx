"use client";

import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import { ArrowsClockwise, Copy, ShareNetwork } from "@phosphor-icons/react";

import { navigate } from "@/app/router";
import type { PostCardShareAction } from "@/components/compositions/posts/post-card/post-card.types";
import { toast } from "@/components/primitives/sonner";

function buildPostUrl(postId: string): string {
  const path = `/p/${encodeURIComponent(postId)}`;
  const origin = typeof window === "undefined" ? null : window.location?.origin;
  return origin ? new URL(path, origin).toString() : path;
}

function canCrosspostPost(post: ApiPost["post"]): boolean {
  return post.status === "published"
    && post.visibility === "public"
    && post.post_type !== "crosspost"
    && !post.parent_post;
}

export function buildPostShareActions(post: ApiPost["post"]): PostCardShareAction[] {
  const postUrl = buildPostUrl(post.id);
  const title = post.title?.trim() || "Pirate post";
  const actions: PostCardShareAction[] = [
    ...(canCrosspostPost(post)
      ? [{
          key: "crosspost",
          label: "Crosspost",
          icon: <ArrowsClockwise className="size-5" />,
          onSelect: () => navigate(`/p/${encodeURIComponent(post.id)}/crosspost`),
        }]
      : []),
    {
      key: "copy-link",
      label: "Copy link",
      icon: <Copy className="size-5" />,
      onSelect: async () => {
        try {
          await navigator.clipboard.writeText(postUrl);
          toast.success("Post link copied.");
        } catch {
          toast.error("Could not copy post link.");
        }
      },
    },
  ];

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    actions.push({
      key: "native-share",
      label: "Share...",
      icon: <ShareNetwork className="size-5" />,
      onSelect: async () => {
        try {
          await navigator.share({ title, url: postUrl });
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          toast.error("Could not share this post.");
        }
      },
    });
  }

  return actions;
}
