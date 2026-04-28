import type { matchRoute } from "@/app/router";

export type FeedCommunity = {
  community_id?: string;
  route_slug?: string | null;
  updated_at?: string | null;
};

export type FeedPost = {
  post_id?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LocalizedPostLike = {
  post?: FeedPost | null;
};

export type HomeFeedItemLike = {
  community?: FeedCommunity | null;
  post?: LocalizedPostLike | null;
};

export type HomeFeedResponseLike = {
  items?: HomeFeedItemLike[];
  top_communities?: FeedCommunity[];
  next_cursor?: string | null;
};

export type AgentSkillDefinition = {
  description: string;
  markdown: string;
  name: string;
};

export type WebMcpToolCard = {
  description: string;
  inputSchema: Record<string, unknown>;
  name: string;
};

export type WebBotAuthEnv = {
  WEB_BOT_AUTH_PRIVATE_JWK?: string;
};

export type DiscoveryContext = {
  apiOrigin: string;
  appOrigin: string;
  canonicalUrl: string;
  isIndexable: boolean;
  pathname: string;
  routeKind: ReturnType<typeof matchRoute>["kind"] | "api-docs";
};
