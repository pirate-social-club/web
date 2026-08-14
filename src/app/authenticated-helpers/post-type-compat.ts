const SUPPORTED_POST_TYPES = new Set([
  "text",
  "image",
  "video",
  "link",
  "song",
  "crosspost",
  "live_room",
  "file",
]);

/** Collection boundaries must skip future post types instead of coercing them. */
export function isSupportedPostType(value: unknown): value is string {
  return typeof value === "string" && SUPPORTED_POST_TYPES.has(value);
}

export function filterSupportedPostTypes<T extends { post: { post_type?: unknown } }>(items: readonly T[]): T[] {
  return items.filter((item) => isSupportedPostType(item.post.post_type));
}
