import {
  createPirateApiClient,
  type GetPublicCommunitiesCommunityRefFeedResponse,
} from "@pirate/api-client";
import { resolveLocaleLanguageTag, type UiLocaleCode } from "../ui-locale-core";
import { resolveApiUrl } from "./request-origin";
import {
  safeCommunityHref,
  type CommunityData,
  type CommunityGate,
  type CommunityPost,
  type CommunityReferenceLink,
  type CommunityRule,
} from "../../features/community/page-shell/page-shell-model";

const DEFAULT_TIMEOUT_MS = 4_000;
const MAX_TIMEOUT_MS = 10_000;

export interface PublicCommunityThreadsPage {
  community: CommunityData;
  items: CommunityPost[];
  next_cursor: string | null;
}

export interface PublicCommunityThreadsRequestOptions {
  readonly cursor?: string | null;
  readonly locale?: UiLocaleCode;
  readonly request?: Request;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

function boundedTimeout(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(1, Math.floor(value)));
}

function boundedFetch(fetchImpl: typeof fetch, timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 ? result : null;
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const result = nonEmptyString(value);
    if (result !== null) return result;
  }
  return "";
}

function stableIsoTime(seconds: unknown): string {
  const timestamp = finiteNumber(seconds, 0) * 1_000;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function localizedCommunityText(
  community: GetPublicCommunitiesCommunityRefFeedResponse["community"],
  fieldKey: string,
  fallback: unknown,
): string {
  const item = community.localized_text?.items.find((candidate) => candidate.field_key === fieldKey);
  return firstText(item?.translated_value, fallback);
}

function referenceLink(value: unknown, index: number): CommunityReferenceLink | null {
  if (!isRecord(value)) return null;
  const href = safeCommunityHref(firstText(value.href, value.url));
  const label = firstText(value.label, value.name, value.title);
  if (href === null || label.length === 0) return null;
  return {
    href,
    label,
    position: finiteNumber(value.position, index + 1),
  };
}

function mapReferenceLinks(value: unknown): CommunityReferenceLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    const link = referenceLink(entry, index);
    return link === null ? [] : [link];
  });
}

function gateLabel(gate: GetPublicCommunitiesCommunityRefFeedResponse["community"]["membership_gate_summaries"][number]): string {
  const kind = gate.gate_type.replaceAll("_", " ");
  const detail = firstText(gate.required_value, gate.asset_filter_label, gate.asset_symbol);
  return detail.length > 0 ? `${kind}: ${detail}` : kind;
}

function mapGates(
  gates: GetPublicCommunitiesCommunityRefFeedResponse["community"]["membership_gate_summaries"],
): CommunityGate[] {
  return gates.map((gate) => ({ label: gateLabel(gate), status: "unknown" }));
}

function mapRules(
  rules: GetPublicCommunitiesCommunityRefFeedResponse["community"]["rules"],
): CommunityRule[] {
  return rules
    .filter((rule) => rule.status !== "archived")
    .map((rule, index) => ({
      body: firstText(rule.body),
      position: finiteNumber(rule.position, index + 1),
      title: firstText(rule.title, "Community rule"),
    }));
}

function mapPost(
  item: GetPublicCommunitiesCommunityRefFeedResponse["items"][number],
): CommunityPost {
  const post = item.post;
  return {
    body: firstText(item.translated_body, post.body, item.translated_caption, post.caption),
    id: firstText(post.id, "unknown-post"),
    publishedAt: stableIsoTime(post.created),
    score: finiteNumber(item.upvote_count) - finiteNumber(item.downvote_count),
    title: firstText(item.translated_title, post.title, item.translated_caption, post.caption, "Untitled post"),
  };
}

export function mapPublicCommunityThreads(
  communityRef: string,
  response: GetPublicCommunitiesCommunityRefFeedResponse,
): PublicCommunityThreadsPage {
  const community = response.community;
  const handle = firstText(community.route_slug, communityRef);
  const mode = community.gate_match_mode ?? "unknown";
  return {
    community: {
      description: localizedCommunityText(community, "community.description", community.description),
      followers: finiteNumber(community.follower_count),
      gates: mapGates(community.membership_gate_summaries),
      gateMode: mode,
      handle,
      members: finiteNumber(community.member_count),
      name: firstText(community.display_name, "Community"),
      posts: response.items.map(mapPost),
      referenceLinks: mapReferenceLinks(community.reference_links),
      rules: mapRules(community.rules),
    },
    items: response.items.map(mapPost),
    next_cursor: typeof response.next_cursor === "string" && response.next_cursor.length > 0 ? response.next_cursor : null,
  };
}

export async function fetchPublicCommunityThreads(
  communityRef: string,
  options: PublicCommunityThreadsRequestOptions = {},
): Promise<PublicCommunityThreadsPage> {
  const query: {
    surface: "threads";
    sort: "new";
    cursor?: string;
    locale: string;
  } = {
    surface: "threads",
    sort: "new",
    locale: resolveLocaleLanguageTag(options.locale ?? "en"),
  };
  if (options.cursor) query.cursor = options.cursor;

  // Public reads deliberately omit request headers: browser cookies and SSR
  // authorization must never turn this operation into a personalized fetch.
  const client = createPirateApiClient(resolveApiUrl("/", options.request), {
    fetchImpl: boundedFetch(options.fetchImpl ?? fetch, boundedTimeout(options.timeoutMs)),
  });
  const response = await client.get_publicCommunitiesCommunityRefFeed({
    path: { communityRef },
    query,
  });
  return mapPublicCommunityThreads(communityRef, response);
}
