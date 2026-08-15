import type { PostCardContent, PostCardProps } from "./types";

type PostCardTitleProps = Pick<PostCardProps, "title" | "titleDir" | "titleLang" | "titleHref">;

export function postCardContentOwnsTitle(content: PostCardContent): boolean {
  return content.type === "live_room";
}

export function buildPostCardTitleProps({
  content,
  suppressTitle = false,
  title,
  titleDir,
  titleHref,
  titleLang,
}: {
  content: PostCardContent;
  suppressTitle?: boolean;
  title?: string | null;
  titleDir?: PostCardProps["titleDir"] | null;
  titleHref?: string | null;
  titleLang?: string | null;
}): PostCardTitleProps {
  if (suppressTitle || postCardContentOwnsTitle(content)) {
    return {
      title: undefined,
      titleDir: undefined,
      titleHref: undefined,
      titleLang: undefined,
    };
  }

  return {
    title: title || undefined,
    titleDir: titleDir ?? undefined,
    titleHref: titleHref ?? undefined,
    titleLang: titleLang ?? undefined,
  };
}
