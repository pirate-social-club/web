"use client";

import { ShoppingBag } from "@phosphor-icons/react";

import { trackAnalyticsEvent } from "@/lib/analytics";

function destinationHost(url: string): string | null {
  try {
    return new URL(url).host || null;
  } catch {
    return null;
  }
}

export function PostEventStoreLink({
  className,
  communityId,
  label,
  liveRoomId,
  postId,
  url,
}: {
  className?: string;
  communityId?: string | null;
  label: string;
  liveRoomId?: string | null;
  postId?: string | null;
  url: string;
}) {
  const host = destinationHost(url);

  return (
    <a
      className={[
        "flex min-h-12 items-center gap-3 rounded-lg border border-border-soft bg-card px-3 py-3 text-card-foreground shadow-sm transition-colors hover:bg-muted/50",
        className,
      ].filter(Boolean).join(" ")}
      href={url}
      onClick={() => {
        trackAnalyticsEvent({
          communityId,
          eventName: "store_link_clicked",
          postId,
          properties: {
            destination_host: host,
            live_room_id: liveRoomId,
            scope: "event",
          },
        });
      }}
      rel="noopener noreferrer"
      target="_blank"
    >
      <ShoppingBag className="size-5 shrink-0 opacity-75" weight="fill" />
      <span className="min-w-0 flex-1 truncate font-semibold">{label}</span>
    </a>
  );
}
