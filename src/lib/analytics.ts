import { resolveApiUrl } from "@/lib/api/base-url";
import { getAccessToken } from "@/lib/api/session-store";
import { getAnalyticsIdentity } from "@/lib/analytics-identity";
import { logger } from "@/lib/logger";

export type AnalyticsEventName =
  | "page_viewed"
  | "auth_started"
  | "reddit_verification_started"
  | "handle_claim_started"
  | "handle_claim_failed"
  | "home_feed_viewed"
  | "community_viewed"
  | "community_join_requested"
  | "post_composer_opened"
  | "thread_viewed"
  | "community_create_started"
  | "listing_viewed"
  | "purchase_quote_requested"
  | "checkout_started"
  | "funding_route_selected"
  | "asset_accessed"
  | "donation_selected"
  | "notification_inbox_viewed"
  | "notification_opened"
  | "notification_marked_read"
  | "pwa_install_promo_viewed"
  | "pwa_install_prompt_opened"
  | "pwa_install_prompt_accepted"
  | "pwa_install_prompt_dismissed"
  | "pwa_install_promo_dismissed"
  | "pwa_installed";

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

type TrackAnalyticsEventInput = {
  eventName: AnalyticsEventName;
  communityId?: string | null;
  postId?: string | null;
  commentId?: string | null;
  listingId?: string | null;
  quoteId?: string | null;
  purchaseId?: string | null;
  verificationSessionId?: string | null;
  properties?: AnalyticsProperties;
};

function compactProperties(properties: AnalyticsProperties | undefined): Record<string, string | number | boolean | null> {
  const compacted: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties ?? {})) {
    if (value !== undefined) {
      compacted[key] = value;
    }
  }
  return compacted;
}

function analyticsEnabled(): boolean {
  if (import.meta.env.VITE_ENABLE_ANALYTICS === "true") {
    return true;
  }

  return !import.meta.env.DEV;
}

export function trackAnalyticsEvent(input: TrackAnalyticsEventInput): void {
  if (typeof window === "undefined" || !analyticsEnabled()) {
    return;
  }

  const identity = getAnalyticsIdentity();
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  void fetch(resolveApiUrl("/analytics/events", window.location.hostname), {
    body: JSON.stringify({
      event_name: input.eventName,
      session_id: identity.sessionId,
      anonymous_id: identity.anonymousId,
      community_id: input.communityId ?? undefined,
      post_id: input.postId ?? undefined,
      comment_id: input.commentId ?? undefined,
      listing_id: input.listingId ?? undefined,
      quote_id: input.quoteId ?? undefined,
      purchase_id: input.purchaseId ?? undefined,
      verification_session_id: input.verificationSessionId ?? undefined,
      properties: compactProperties(input.properties),
    }),
    headers,
    keepalive: true,
    method: "POST",
  }).catch((error: unknown) => {
    logger.debug("[analytics] event send failed", {
      eventName: input.eventName,
      message: error instanceof Error ? error.message : String(error),
    });
  });
}
