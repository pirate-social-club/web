import type { RoutePost } from "./types";

export function buildPostsById(posts: RoutePost[]): Record<string, RoutePost> {
  return Object.fromEntries(posts.map((post) => [post.postId, post] as const));
}
