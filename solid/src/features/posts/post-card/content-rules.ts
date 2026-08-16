import type { PostCardContent, PostCardProps } from "./types";

type PostCardTitleProps = Pick<PostCardProps, "title" | "titleDir" | "titleLang" | "titleHref">;

// Human-readable byte size for generic asset cards: exact under 1 KB, then
// one decimal (or a whole number >= 10) through GB.
export function formatByteSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} bytes`;
  const units = ["KB", "MB", "GB"];
  let size = sizeBytes;
  let unitIndex = -1;
  do {
    size /= 1024;
    unitIndex += 1;
  } while (size >= 1024 && unitIndex < units.length - 1);
  const value = size >= 10 ? String(Math.round(size)) : String(Math.round(size * 10) / 10);
  return `${value} ${units[unitIndex]}`;
}

// Meta line for the generic asset card: "text/csv · 18 bytes". Returns
// undefined when neither MIME type nor size is known so the line is omitted.
export function formatGenericAssetMeta(
  mimeType?: string | null,
  sizeBytes?: number | null,
): string | undefined {
  const type = mimeType?.trim() || undefined;
  const size = typeof sizeBytes === "number" && Number.isFinite(sizeBytes) && sizeBytes >= 0
    ? formatByteSize(sizeBytes)
    : undefined;
  const parts = [type, size].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

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
