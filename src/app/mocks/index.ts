export { COMMUNITY_RECORDS, HOME_POSTS, YOUR_COMMUNITIES_POSTS } from "./community-fixtures";
;
;
;
export type {    RoutePost } from "./types";
;

import { COMMUNITY_RECORDS, HOME_POSTS, YOUR_COMMUNITIES_POSTS } from "./community-fixtures";
import { PROFILES } from "./profile-fixtures";
import { buildPostsById } from "./scenario-fixtures";
import type { RoutePost } from "./types";

const indexedPosts: RoutePost[] = [
  ...HOME_POSTS,
  ...YOUR_COMMUNITIES_POSTS,
  ...Object.values(COMMUNITY_RECORDS).flatMap((community) => community.posts),
  ...Object.values(PROFILES).flatMap((profile) => profile.posts),
];

export const POSTS_BY_ID = buildPostsById(indexedPosts);
