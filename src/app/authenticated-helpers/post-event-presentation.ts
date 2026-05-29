import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import type { PostCardEvent } from "@/components/compositions/posts/post-card/post-card.types";

type ApiPostWithEvent = ApiPost["post"] & {
  event?: {
    starts_at?: number | null;
    ends_at?: number | null;
    timezone?: string | null;
    location_name?: string | null;
    address?: string | null;
    is_online?: boolean | null;
    event_url?: string | null;
    status?: PostCardEvent["status"] | null;
    place?: PostCardEvent["place"] | null;
  } | null;
};

export function toPostCardEvent(post: ApiPost["post"]): PostCardEvent | undefined {
  const event = (post as ApiPostWithEvent).event;
  if (!event?.starts_at || !event.timezone?.trim()) return undefined;
  return {
    startsAt: new Date(event.starts_at * 1000).toISOString(),
    endsAt: event.ends_at ? new Date(event.ends_at * 1000).toISOString() : undefined,
    timezone: event.timezone,
    locationName: event.location_name ?? undefined,
    address: event.address ?? undefined,
    isOnline: event.is_online === true,
    eventUrl: event.event_url ?? undefined,
    status: event.status ?? undefined,
    place: event.place ?? undefined,
  };
}
