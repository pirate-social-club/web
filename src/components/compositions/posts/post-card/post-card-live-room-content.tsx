import * as React from "react";
import { Broadcast, Calendar, DownloadSimple, Lock as LockIcon, Play, Robot } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";
import { postCardType } from "./post-card.styles";
import type { LiveRoomContentSpec, PostCardViewContext } from "./post-card.types";

type LiveRoomUiState =
  | { kind: "can_watch"; cta: string; onClick?: () => void }
  | { kind: "can_watch_replay"; cta: string; onClick?: () => void }
  | { kind: "needs_ticket"; cta: string; onClick?: () => void }
  | { kind: "has_ticket" }
  | { kind: "needs_verification"; cta: string; onClick?: () => void }
  | { kind: "tickets_unavailable" }
  | { kind: "replay_processing" }
  | { kind: "scheduled" }
  | { kind: "ended" }
  | { kind: "canceled" };

function priceLabel(content: LiveRoomContentSpec): string | null {
  return content.regionalPriceLabel ?? content.priceLabel ?? null;
}

function timeLabel(content: LiveRoomContentSpec): string {
  if (content.status === "live") return content.liveSinceLabel ? `Live for ${content.liveSinceLabel}` : "Live now";
  if (content.status === "canceled") return "Canceled";
  if (content.status === "ended") return content.endedAtLabel ? `Ended ${content.endedAtLabel} ago` : "Ended";
  return content.startsAtLabel ? `Starts ${content.startsAtLabel}` : "Scheduled";
}

function deriveLiveRoomUi(content: LiveRoomContentSpec): LiveRoomUiState {
  const ageProofRequired = content.ageGatePolicy === "18_plus"
    && content.contentSafetyState === "adult"
    && content.ageGateViewerState !== "verified_allowed";
  const price = priceLabel(content);

  if (content.status === "canceled") {
    return { kind: "canceled" };
  }

  if (content.status === "ended" || content.accessState === "ended") {
    if (content.replayStatus === "ready") {
      return { kind: "can_watch_replay", cta: "Watch replay", onClick: content.onWatch };
    }
    if (content.replayStatus === "processing") {
      return { kind: "replay_processing" };
    }
    return { kind: "ended" };
  }

  if (ageProofRequired) {
    return {
      kind: "needs_verification",
      cta: "Verify to attend",
      onClick: content.onVerifyAge,
    };
  }

  if (content.accessState === "missing_listing") {
    return { kind: "tickets_unavailable" };
  }

  if (content.accessState === "purchase_required" || (content.accessMode === "paid" && !content.hasEntitlement)) {
    return {
      kind: "needs_ticket",
      cta: price ? `Get ticket ${price}` : "Get ticket",
      onClick: content.onBuy,
    };
  }

  if (content.accessMode === "paid" && content.hasEntitlement) {
    if (content.status === "live") {
      return { kind: "can_watch", cta: "Watch live", onClick: content.onWatch };
    }
    return { kind: "has_ticket" };
  }

  if (content.status === "live") {
    return { kind: "can_watch", cta: "Watch live", onClick: content.onWatch };
  }

  return { kind: "scheduled" };
}

function shouldShowCta(ui: LiveRoomUiState): ui is Extract<LiveRoomUiState, { cta: string }> {
  return "cta" in ui && Boolean(ui.cta);
}

function ProducerControls({ content }: { content: LiveRoomContentSpec }) {
  if (!content.producerRole) return null;
  const isHost = content.producerRole === "host";
  const isAcceptedGuest = content.producerRole === "guest" && content.guestInviteStatus === "accepted";
  const showBroadcast = content.freedomDetected && content.freedomHref && (isHost || isAcceptedGuest);

  if (content.producerRole === "guest" && content.guestInviteStatus === "pending") {
    return (
      <p className="text-base text-muted-foreground">
        Accept the producer invite before broadcasting.
      </p>
    );
  }

  if (content.producerRole === "guest" && content.guestInviteStatus === "revoked") {
    return (
      <p className="text-base text-muted-foreground">
        This producer invite has been revoked.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showBroadcast ? (
        <Button asChild size="sm">
          <a href={content.freedomHref}>
            <Broadcast className="size-4" weight="bold" />
            {isHost ? "Start broadcast" : "Open producer room"}
          </a>
        </Button>
      ) : null}
      {!content.freedomDetected ? (
        <Button asChild size="sm" variant="outline">
          <a href="https://github.com/pirate-social-club/freedom-browser">
            <DownloadSimple className="size-4" weight="bold" />
            Download Freedom
          </a>
        </Button>
      ) : null}
    </div>
  );
}

export function LiveRoomPostContent({
  className,
  content,
  viewContext,
}: {
  className?: string;
  content: LiveRoomContentSpec;
  viewContext?: PostCardViewContext;
}) {
  const ui = deriveLiveRoomUi(content);
  const ageProofRequired = content.ageGatePolicy === "18_plus"
    && content.contentSafetyState === "adult"
    && content.ageGateViewerState !== "verified_allowed";
  const inPostPage = viewContext === "post";
  const eventHref = inPostPage ? undefined : content.concertHref;
  const ArtworkWrapper = eventHref ? "a" : "div";
  const time = timeLabel(content);
  const timeIsLive = content.status === "live";
  const showPrimaryCta = shouldShowCta(ui);

  if (inPostPage) {
    return (
      <div className={cn("flex flex-col gap-4 text-start", className)}>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
          {content.coverSrc ? (
            <>
              <img
                alt={content.title}
                className={cn(
                  "size-full object-cover transition-[filter,transform]",
                  ageProofRequired && "blur-md saturate-0",
                )}
                src={content.coverSrc}
              />
              {ageProofRequired ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/42">
                  <LockIcon className="size-9 text-white" weight="fill" />
                </div>
              ) : null}
            </>
          ) : (
            <div className="grid size-full place-items-center">
              <Calendar className="size-12 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="min-w-0 text-xl font-semibold leading-tight text-foreground">
              {content.title}
            </h2>
            {content.roomKind === "duet" ? (
              <span className="shrink-0 text-base text-muted-foreground">
                Duet
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p
              className={cn(
                "text-base font-semibold",
                timeIsLive ? "text-destructive" : "text-foreground",
              )}
            >
              {time}
            </p>
            {content.attendeeCountLabel && timeIsLive ? (
              <p className="text-base text-muted-foreground">
                {content.attendeeCountLabel}
              </p>
            ) : null}
            {ui.kind === "has_ticket" ? (
              <p className="text-base font-medium text-success">You&apos;re going</p>
            ) : null}
            {ui.kind === "replay_processing" ? (
              <p className="text-base text-muted-foreground">Replay processing</p>
            ) : null}
          </div>

          {content.description ? (
            <p className="max-w-[72ch] text-base leading-7 text-muted-foreground">
              {content.description}
            </p>
          ) : null}

          {content.setlistPreview && content.setlistPreview.length > 0 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {content.setlistPreview.map((track) => (
                <p key={track.title} className="text-base text-muted-foreground">
                  {track.title}{track.artist ? ` — ${track.artist}` : ""}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showPrimaryCta ? (
            <Button
              className="h-11 px-5"
              disabled={!ui.onClick}
              onClick={ui.onClick}
              size="sm"
            >
              {ui.kind === "can_watch_replay" ? <Play className="mr-1 size-4" weight="bold" /> : null}
              {ui.cta}
            </Button>
          ) : null}

          {content.agentPurchaseUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={content.agentPurchaseUrl}>
                <Robot className="size-4" weight="duotone" />
                {content.agentPurchaseLabel ?? "Agent checkout"}
              </a>
            </Button>
          ) : null}
        </div>

        <ProducerControls content={content} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2.5 text-start", className)}>
      <div className="flex items-start gap-3">
        <ArtworkWrapper
          aria-label={eventHref ? `Open ${content.title}` : undefined}
          className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-post-card-interactive={eventHref ? "true" : undefined}
          href={eventHref}
        >
          {content.coverSrc ? (
            <>
              <img
                alt={content.title}
                className={cn(
                  "size-full object-cover transition-[filter,transform]",
                  ageProofRequired && "blur-md saturate-0",
                )}
                src={content.coverSrc}
              />
              {ageProofRequired ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/42">
                  <LockIcon className="size-6 text-white" weight="fill" />
                </div>
              ) : null}
            </>
          ) : (
            <Calendar className="size-7 text-muted-foreground" />
          )}
        </ArtworkWrapper>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {eventHref ? (
              <a
                className={cn("min-w-0 truncate font-semibold text-foreground hover:underline", postCardType.label)}
                data-post-card-interactive="true"
                href={eventHref}
              >
                {content.title}
              </a>
            ) : (
              <p className={cn("min-w-0 truncate font-semibold text-foreground", postCardType.label)}>
                {content.title}
              </p>
            )}
            {content.roomKind === "duet" ? (
              <span className={cn("shrink-0 text-muted-foreground", postCardType.label)}>
                Duet
              </span>
            ) : null}
          </div>

          <p
            className={cn(
              "mt-0.5 font-medium",
              postCardType.meta,
              timeIsLive ? "text-destructive" : "text-foreground/90",
            )}
          >
            {time}
          </p>

          {content.description ? (
            <p className={cn("mt-0.5 text-muted-foreground", postCardType.meta)}>
              {content.description}
            </p>
          ) : null}
        </div>
      </div>

      {showPrimaryCta ? (
        <Button
          asChild={!ui.onClick && Boolean(content.concertHref)}
          className="h-11 w-full px-5"
          disabled={!ui.onClick && !content.concertHref}
          onClick={ui.onClick}
          size="sm"
          variant="default"
        >
          {!ui.onClick && content.concertHref ? <a href={content.concertHref}>{ui.cta}</a> : ui.cta}
        </Button>
      ) : null}

      {content.agentPurchaseUrl ? (
        <a
          className={cn("inline-flex items-center gap-1.5 text-primary hover:underline", postCardType.label)}
          href={content.agentPurchaseUrl}
        >
          <Robot className="size-4" weight="duotone" />
          {content.agentPurchaseLabel ?? "Agent checkout"}
        </a>
      ) : null}
    </div>
  );
}
