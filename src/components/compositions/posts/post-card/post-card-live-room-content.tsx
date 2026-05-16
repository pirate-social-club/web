import * as React from "react";
import { Calendar, Lock as LockIcon, Robot } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";
import { postCardType } from "./post-card.styles";
import type { LiveRoomContentSpec } from "./post-card.types";

type LiveRoomUiState =
  | { kind: "can_watch"; cta: string; onClick?: () => void; statusText: string }
  | { kind: "can_attend"; cta: string; onClick?: () => void; statusText: string }
  | { kind: "needs_ticket"; cta: string; onClick?: () => void; statusText: string }
  | { kind: "has_ticket"; statusText: string }
  | { kind: "needs_membership"; cta: string; onClick?: () => void; statusText: string }
  | { kind: "needs_verification"; cta: string; onClick?: () => void; statusText: string }
  | { kind: "tickets_unavailable"; statusText: string }
  | { kind: "host_setup_incomplete"; cta: string; onClick?: () => void; statusText: string }
  | { kind: "ended"; statusText: string }
  | { kind: "canceled"; statusText: string };

function priceLabel(content: LiveRoomContentSpec): string | null {
  return content.regionalPriceLabel ?? content.priceLabel ?? null;
}

function timeLabel(content: LiveRoomContentSpec): string {
  if (content.status === "live") return "Live now";
  if (content.status === "ended") return content.endedAtLabel ? `Ended ${content.endedAtLabel}` : "Ended";
  if (content.status === "canceled") return "Canceled";
  return content.startsAtLabel ?? "Scheduled";
}

function deriveLiveRoomUi(content: LiveRoomContentSpec): LiveRoomUiState {
  const ageProofRequired = content.ageGatePolicy === "18_plus"
    && content.contentSafetyState === "adult"
    && content.ageGateViewerState !== "verified_allowed";
  const price = priceLabel(content);

  if (content.status === "canceled") {
    return { kind: "canceled", statusText: "Canceled" };
  }

  if (content.status === "ended" || content.accessState === "ended") {
    return { kind: "ended", statusText: "Ended" };
  }

  if (ageProofRequired) {
    return {
      kind: "needs_verification",
      cta: "Verify to attend",
      onClick: content.onVerifyAge,
      statusText: "Verification required",
    };
  }

  if (content.accessState === "missing_listing") {
    return {
      kind: "tickets_unavailable",
      statusText: "Tickets unavailable",
    };
  }

  if (content.accessState === "gate_required") {
    return {
      kind: "needs_membership",
      cta: "Join to attend",
      onClick: content.onGate,
      statusText: "Members only",
    };
  }

  if (content.accessState === "purchase_required" || (content.accessMode === "paid" && !content.hasEntitlement)) {
    return {
      kind: "needs_ticket",
      cta: price ? `Get ticket ${price}` : "Get ticket",
      onClick: content.onBuy,
      statusText: price ? `Tickets from ${price}` : "Tickets available",
    };
  }

  if (content.accessMode === "paid" && content.hasEntitlement) {
    if (content.status === "live") {
      return {
        kind: "can_watch",
        cta: "Watch live",
        onClick: content.onWatch,
        statusText: "Live now",
      };
    }
    return { kind: "has_ticket", statusText: "You're going" };
  }

  if (content.status === "live") {
    return {
      kind: "can_watch",
      cta: "Watch live",
      onClick: content.onWatch,
      statusText: content.attendeeCountLabel ? `Live now · ${content.attendeeCountLabel}` : "Live now",
    };
  }

  if (content.accessMode === "gated") {
    return {
      kind: "needs_membership",
      cta: "Join to attend",
      onClick: content.onGate,
      statusText: "Members only",
    };
  }

  return {
    kind: "can_attend",
    cta: "View event",
    onClick: undefined,
    statusText: "Free event",
  };
}

function shouldShowCta(ui: LiveRoomUiState): ui is Extract<LiveRoomUiState, { cta: string }> {
  return "cta" in ui && Boolean(ui.cta);
}

export function LiveRoomPostContent({
  className,
  content,
}: {
  className?: string;
  content: LiveRoomContentSpec;
}) {
  const ui = deriveLiveRoomUi(content);
  const ageProofRequired = content.ageGatePolicy === "18_plus"
    && content.contentSafetyState === "adult"
    && content.ageGateViewerState !== "verified_allowed";
  const ArtworkWrapper = content.concertHref ? "a" : "div";
  const time = timeLabel(content);
  const timeIsLive = content.status === "live";
  const showStatusChip = !shouldShowCta(ui);

  return (
    <div className={cn("flex flex-col gap-2.5 text-start", className)}>
      <div className="flex items-start gap-3">
        <ArtworkWrapper
          aria-label={content.concertHref ? `Open ${content.title}` : undefined}
          className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-post-card-interactive={content.concertHref ? "true" : undefined}
          href={content.concertHref}
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
            {content.concertHref ? (
              <a
                className={cn("min-w-0 truncate font-semibold text-foreground hover:underline", postCardType.label)}
                data-post-card-interactive="true"
                href={content.concertHref}
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

          {showStatusChip ? (
            <p
              className={cn(
                "mt-1 inline-flex rounded-full border border-border-soft bg-background px-2.5 py-1 font-medium",
                postCardType.meta,
                ui.kind === "has_ticket" ? "text-success" : "text-foreground",
              )}
            >
              {ui.statusText}
            </p>
          ) : null}
        </div>
      </div>

      {shouldShowCta(ui) ? (
        <Button
          asChild={!ui.onClick && Boolean(content.concertHref)}
          className="h-11 w-full px-5"
          disabled={!ui.onClick && !content.concertHref}
          onClick={ui.onClick}
          size="sm"
          variant={ui.kind === "can_attend" || ui.kind === "needs_membership" ? "outline" : "default"}
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
