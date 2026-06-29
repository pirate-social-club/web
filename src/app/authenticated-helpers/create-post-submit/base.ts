"use client";

import type {
  AnonymousIdentityScope,
  AuthorMode,
  ComposerEventPlace,
  ComposerEventState,
  ComposerTab,
  IdentityMode,
  PostAudience,
} from "@/components/compositions/posts/post-composer/post-composer.types";
import { normalizeHttpUrl } from "@/components/compositions/posts/post-composer/post-composer-utils";

export type BasePostRequestFields = {
  anonymous_scope?: AnonymousIdentityScope | null;
  disclosed_qualifier_ids?: string[] | null;
  identity_mode: IdentityMode;
  idempotency_key: string;
  translation_policy: "none" | "machine_allowed" | "human_only" | "hybrid";
  visibility: PostAudience;
};

export type CreatePostEventRequest = {
  starts_at: number;
  ends_at?: number | null;
  timezone: string;
  location_name?: string | null;
  address?: string | null;
  is_online?: boolean | null;
  event_url?: string | null;
  status?: "scheduled" | "canceled" | "postponed" | "ended" | null;
  place?: ComposerEventPlace | null;
};

type CreatePostMediaDescriptor = {
  content_hash?: string | null;
  mime_type: string;
  poster_frame_ms?: number | null;
  poster_height?: number | null;
  poster_mime_type?: string | null;
  poster_ref?: string | null;
  poster_size_bytes?: number | null;
  poster_width?: number | null;
  size_bytes?: number | null;
  storage_ref: string;
};

type CreatePostSharedRequestFields = BasePostRequestFields & {
  access_mode?: "public" | "locked" | null;
  commercial_rev_share_pct?: number | null;
  license_preset?: "non-commercial" | "commercial-use" | "commercial-remix" | null;
  rights_basis?: "none" | "original" | "derivative" | "attribution_only" | null;
  upstream_asset_refs?: string[] | null;
};

export type CreatePostRequestWithEvent = CreatePostSharedRequestFields & {
  event?: CreatePostEventRequest | null;
} & (
  | {
    body?: string | null;
    post_type: "text";
    title?: string | null;
  }
  | {
    caption?: string | null;
    media_refs: CreatePostMediaDescriptor[];
    post_type: "image";
    title?: string | null;
  }
  | {
    caption?: string | null;
    media_refs: CreatePostMediaDescriptor[];
    post_type: "video";
    title?: string | null;
  }
  | {
    body?: string | null;
    link_url: string;
    post_type: "link";
    title?: string | null;
  }
);

export type SignAgentAuthoredBody = <T extends Record<string, unknown>>(
  path: string,
  body: T,
) => Promise<T>;

export interface ResolvedCreatePostIdentity {
  anonymousScope?: AnonymousIdentityScope;
  disclosedQualifierIds?: string[];
  identityMode: IdentityMode;
}

function assertValidTimeZone(timezone: string): void {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error("Choose a valid event timezone.");
  }
}

function parseLocalDateTime(value: string): {
  day: number;
  hasTime: boolean;
  hour: number;
  minute: number;
  month: number;
  year: number;
} | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const parts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: hour == null ? 0 : Number(hour),
    minute: minute == null ? 0 : Number(minute),
    hasTime: hour != null && minute != null,
  };
  const normalizedDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (
    !Number.isInteger(parts.year)
    || parts.month < 1
    || parts.month > 12
    || parts.day < 1
    || parts.day > 31
    || normalizedDate.getUTCFullYear() !== parts.year
    || normalizedDate.getUTCMonth() !== parts.month - 1
    || normalizedDate.getUTCDate() !== parts.day
    || parts.hour < 0
    || parts.hour > 23
    || parts.minute < 0
    || parts.minute > 59
  ) {
    return null;
  }
  return parts;
}

function timeZoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  const localAsUtcMs = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
  return localAsUtcMs - date.getTime();
}

function localDateTimeToUnixSeconds(value: string, timezone: string, options: { endOfDate?: boolean } = {}): number | null {
  const parts = parseLocalDateTime(value);
  if (!parts) return null;
  const hour = options.endOfDate === true && !parts.hasTime ? 23 : parts.hour;
  const minute = options.endOfDate === true && !parts.hasTime ? 59 : parts.minute;

  const wallTimeUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    hour,
    minute,
    0,
  );
  let resolvedUtcMs = wallTimeUtcMs;
  for (let iteration = 0; iteration < 2; iteration += 1) {
    resolvedUtcMs = wallTimeUtcMs - timeZoneOffsetMs(new Date(resolvedUtcMs), timezone);
  }
  const unixSeconds = Math.floor(resolvedUtcMs / 1000);
  return Number.isFinite(unixSeconds) && unixSeconds > 0 ? unixSeconds : null;
}

export function buildCreatePostEventRequest(event: ComposerEventState): CreatePostEventRequest | undefined {
  if (event.enabled !== true) {
    return undefined;
  }

  const timezone = event.timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
  assertValidTimeZone(timezone);

  const startsAt = event.startsAt?.trim()
    ? localDateTimeToUnixSeconds(event.startsAt, timezone)
    : null;
  if (startsAt == null) {
    throw new Error("Add an event date or turn off event details.");
  }

  const endsAt = event.endsAt?.trim()
    ? localDateTimeToUnixSeconds(event.endsAt, timezone, { endOfDate: true })
    : null;
  if (event.endsAt?.trim() && endsAt == null) {
    throw new Error("Choose a valid event end time.");
  }
  if (endsAt != null && endsAt < startsAt) {
    throw new Error("Event end time must be after the start time.");
  }

  const isOnline = event.isOnline === true;
  const locationName = isOnline ? undefined : event.locationName?.trim() || undefined;
  const address = isOnline ? undefined : event.address?.trim() || undefined;
  if (!isOnline && !locationName && !address) {
    throw new Error("Add an event location or mark the event online.");
  }

  const rawEventUrl = event.eventUrl?.trim();
  const eventUrl = rawEventUrl ? normalizeHttpUrl(rawEventUrl) : undefined;
  if (rawEventUrl && !eventUrl) {
    throw new Error("Enter a valid http or https event link.");
  }

  return {
    starts_at: startsAt,
    ends_at: endsAt,
    timezone,
    location_name: locationName,
    address,
    is_online: isOnline,
    event_url: eventUrl,
    status: "scheduled",
    place: isOnline ? undefined : event.place,
  };
}

export function resolveCreatePostIdentity({
  allowAnonymousIdentity,
  anonymousIdentityScope,
  authorMode,
  composerMode,
  monetizedVideo,
  requestedIdentityMode,
  selectedQualifierIds,
}: {
  allowAnonymousIdentity: boolean;
  anonymousIdentityScope?: AnonymousIdentityScope | null;
  authorMode: AuthorMode;
  composerMode: ComposerTab;
  monetizedVideo?: boolean;
  requestedIdentityMode: IdentityMode;
  selectedQualifierIds: string[];
}): ResolvedCreatePostIdentity {
  const identityMode = authorMode === "agent"
    || composerMode === "song"
    || composerMode === "live"
    || (composerMode === "video" && monetizedVideo)
    || !allowAnonymousIdentity
    ? "public"
    : requestedIdentityMode;

  return {
    identityMode,
    anonymousScope: identityMode === "anonymous"
      ? (anonymousIdentityScope ?? "community_stable")
      : undefined,
    disclosedQualifierIds: identityMode === "anonymous" && selectedQualifierIds.length > 0
      ? selectedQualifierIds
      : undefined,
  };
}

export function buildBasePostRequest({
  anonymousScope,
  disclosedQualifierIds,
  idempotencyKey,
  identityMode,
  visibility,
}: {
  anonymousScope?: AnonymousIdentityScope;
  disclosedQualifierIds?: string[];
  idempotencyKey: string;
  identityMode: IdentityMode;
  visibility: PostAudience;
}): BasePostRequestFields {
  return {
    anonymous_scope: anonymousScope,
    disclosed_qualifier_ids: disclosedQualifierIds,
    identity_mode: identityMode,
    idempotency_key: idempotencyKey,
    translation_policy: "machine_allowed",
    visibility,
  };
}

export async function signIfAgent<T extends Record<string, unknown>>({
  authorMode,
  path,
  request,
  signAgentAuthoredBody,
}: {
  authorMode: AuthorMode;
  path: string;
  request: T;
  signAgentAuthoredBody: SignAgentAuthoredBody;
}): Promise<T> {
  return authorMode === "agent"
    ? await signAgentAuthoredBody(path, request)
    : request;
}
