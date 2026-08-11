import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import { buildCommunityPath } from "@/lib/community-routing";
import type {
  LiveRoomPresentationOptions,
  PostPresentationOptions,
  SongPresentationOptions,
} from "@/app/authenticated-helpers/post-presentation-types";
import { toLinkPostContent } from "@/app/authenticated-helpers/post-link-presentation";
import { toLiveRoomPostContent } from "@/app/authenticated-helpers/post-live-room-presentation";
import {
  toSongPostContent,
  toVideoPostContent,
} from "@/app/authenticated-helpers/post-media-presentation";
import { resolveTranslatedTextPresentation } from "@/app/authenticated-helpers/post-translation-presentation";

export function toCommunityPostContent(
  postResponse: ApiPost,
  songOptions?: SongPresentationOptions,
  opts?: Pick<PostPresentationOptions, "canModeratePost" | "onVerifyAge" | "preferOriginalText" | "viewerContentLocale"> & {
    embedMode?: "preview" | "official";
    liveRoom?: LiveRoomPresentationOptions;
  },
): PostCardProps["content"] {
  const { post, translated_body, translated_caption, translated_title } = postResponse;
  if (post.status === "deleted") {
    return {
      type: "text",
      body: "Post was deleted",
    };
  }
  if (post.status === "removed") {
    return {
      type: "text",
      body: "Post was removed by moderators",
    };
  }

  const resolvedBody = opts?.preferOriginalText ? post.body ?? "" : translated_body ?? post.body ?? "";
  const resolvedCaption = opts?.preferOriginalText ? post.caption ?? undefined : translated_caption ?? post.caption ?? undefined;
  const translatedTextPresentation = !opts?.preferOriginalText && postResponse.translation_state === "ready"
    ? resolveTranslatedTextPresentation(postResponse.resolved_locale)
    : {};
  const linkLocale = opts?.preferOriginalText
    ? post.source_language
    : opts?.viewerContentLocale
      ? opts.viewerContentLocale
      : postResponse.translation_state === "ready"
      ? postResponse.resolved_locale
      : post.source_language;
  const linkTextPresentation = linkLocale ? resolveTranslatedTextPresentation(linkLocale) : {};
  const primaryMedia = post.media_refs?.[0];
  const imageMedia = primaryMedia as ({ width?: number | null; height?: number | null } & typeof primaryMedia) | undefined;
  const title = opts?.preferOriginalText ? (post.title ?? "Untitled post") : (translated_title ?? post.title ?? "Untitled post");

  if (post.anchor_live_room) {
    return toLiveRoomPostContent(postResponse, {
      liveRoom: opts?.liveRoom,
      onVerifyAge: opts?.onVerifyAge,
      primaryMedia,
      resolvedCaption,
      title,
    });
  }

  switch (post.post_type) {
    case "crosspost": {
      const source = post.crosspost_source as (typeof post.crosspost_source & {
        content_safety_state?: "pending" | "safe" | "sensitive" | "adult" | null;
        age_gate_policy?: "none" | "18_plus" | null;
      });
      return {
        type: "crosspost",
        source: {
          status: source?.status ?? "unavailable",
          communityLabel: source?.community_label
            ? `c/${source.community_label}`
            : source?.community ?? "Source community",
          communityHref: source?.community ? buildCommunityPath(source.community, source.community_route_slug ?? undefined) : undefined,
          authorLabel: source?.author_label ?? undefined,
          postHref: source?.post ? `/p/${source.post}` : undefined,
          postType: source?.post_type ?? undefined,
          thumbnailAlt: source?.title ?? undefined,
          thumbnailSrc: source?.thumbnail_ref ?? undefined,
          contentSafetyState: source?.content_safety_state ?? undefined,
          ageGatePolicy: source?.age_gate_policy ?? undefined,
          ageGateViewerState: postResponse.age_gate_viewer_state ?? undefined,
          title: source?.title ?? undefined,
        },
      };
    }
    case "image": {
      const aspectRatio = typeof imageMedia?.width === "number" && typeof imageMedia?.height === "number" && imageMedia.height > 0
        ? imageMedia.width / imageMedia.height
        : undefined;
      return {
        type: "image",
        aspectRatio,
        alt: title,
        caption: resolvedCaption,
        captionDir: translatedTextPresentation.dir,
        captionLang: translatedTextPresentation.lang,
        src: primaryMedia?.storage_ref ?? "",
        ageGatePolicy: post.age_gate_policy,
        contentSafetyState: post.content_safety_state,
        ageGateViewerState: postResponse.age_gate_viewer_state ?? undefined,
        onVerifyAge: opts?.onVerifyAge,
      };
    }
    case "video":
      return toVideoPostContent(postResponse, songOptions, {
        captionDir: translatedTextPresentation.dir,
        captionLang: translatedTextPresentation.lang,
        onVerifyAge: opts?.onVerifyAge,
        resolvedCaption,
        title,
      });
    case "link":
      return toLinkPostContent(postResponse, {
        bodyDir: translatedTextPresentation.dir,
        bodyLang: translatedTextPresentation.lang,
        embedMode: opts?.embedMode,
        linkLocale,
        linkTextDir: linkTextPresentation.dir,
        linkTextLang: linkTextPresentation.lang,
        preferOriginalText: opts?.preferOriginalText,
        resolvedBody,
        title,
      });
    case "song":
      return toSongPostContent(postResponse, songOptions, {
        captionDir: translatedTextPresentation.dir,
        captionLang: translatedTextPresentation.lang,
        onVerifyAge: opts?.onVerifyAge,
        resolvedCaption,
        title,
        viewerCanManage: opts?.canModeratePost,
      });
    case "text":
    default:
      return {
        type: "text",
        body: resolvedBody,
        bodyDir: translatedTextPresentation.dir,
        bodyLang: translatedTextPresentation.lang,
      };
  }
}
