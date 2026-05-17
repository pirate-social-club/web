import * as React from "react";
import { Broadcast, Calendar, Clock, DownloadSimple, Lock as LockIcon, Play, Robot, Users } from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { resolveResourceHref } from "@/lib/resource-links";
import { cn } from "@/lib/utils";
import { postCardType } from "./post-card.styles";
import type { LiveRoomContentSpec, LiveRoomParticipant, PostCardViewContext } from "./post-card.types";

type LiveRoomUiState =
  | { kind: "can_watch"; cta: string; onClick?: () => void }
  | { kind: "can_watch_replay"; cta: string; onClick?: () => void }
  | { kind: "needs_access"; cta: string; onClick?: () => void }
  | { kind: "needs_ticket"; cta: string; onClick?: () => void }
  | { kind: "has_ticket" }
  | { kind: "can_rsvp"; cta: string; onClick?: () => void }
  | { kind: "rsvped" }
  | { kind: "needs_verification"; cta: string; onClick?: () => void }
  | { kind: "tickets_unavailable" }
  | { kind: "replay_processing" }
  | { kind: "scheduled" }
  | { kind: "ended" }
  | { kind: "canceled" };

function priceLabel(content: LiveRoomContentSpec): string | null {
  return content.regionalPriceLabel ?? content.priceLabel ?? null;
}

function timeLabel(content: LiveRoomContentSpec): string | null {
  if (content.status === "live") return content.liveSinceLabel ? `Live for ${content.liveSinceLabel}` : "Live now";
  if (content.status === "canceled") return "Canceled";
  if (content.status === "ended") return content.endedAtLabel ? `Ended ${content.endedAtLabel} ago` : "Ended";
  return content.startsAtLabel ? `Starts ${content.startsAtLabel}` : null;
}

function participantsLabel(participants: LiveRoomParticipant[] | undefined): string | null {
  if (!participants || participants.length === 0) return null;
  const guests = participants.filter((p) => p.role === "guest");
  if (guests.length === 0) return null;
  const host = participants.find((p) => p.role === "host");
  const hostLabel = host?.label ?? "Host";
  const extraCount = guests.length - 1;
  if (extraCount > 0) return `${hostLabel} with ${guests[0].label} + ${extraCount}`;
  return `${hostLabel} with ${guests[0].label}`;
}

function ParticipantAvatars({ participants }: { participants: LiveRoomParticipant[] }) {
  const guests = participants.filter((p) => p.role === "guest");
  if (guests.length === 0) return null;
  const host = participants.find((p) => p.role === "host");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Type as="span" variant="body" className="text-muted-foreground">
        Hosted by
      </Type>
      {host ? (
        <span className="inline-flex items-center gap-1.5">
          {host.avatarSrc ? <Avatar size="xs" src={host.avatarSrc} fallback={host.label.slice(0, 2)} /> : null}
          <Type as="span" variant="body-strong">
            {host.href ? <a className="text-primary hover:underline" href={host.href}>{host.label}</a> : host.label}
          </Type>
        </span>
      ) : null}
      <Type as="span" variant="body" className="text-muted-foreground">
        with
      </Type>
      {guests.slice(0, 3).map((guest, i) => (
        <React.Fragment key={guest.label + i}>
          {i > 0 ? <Type as="span" variant="body" className="text-muted-foreground">,</Type> : null}
          <span className="inline-flex items-center gap-1.5">
            {guest.avatarSrc ? <Avatar size="xs" src={guest.avatarSrc} fallback={guest.label.slice(0, 2)} /> : null}
            <Type as="span" variant="body-strong">
              {guest.href ? <a className="text-primary hover:underline" href={guest.href}>{guest.label}</a> : guest.label}
            </Type>
          </span>
        </React.Fragment>
      ))}
      {guests.length > 3 ? (
        <Type as="span" variant="body" className="text-muted-foreground">
          +{guests.length - 3}
        </Type>
      ) : null}
    </div>
  );
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

  if (content.accessState === "gate_required") {
    return {
      kind: "needs_access",
      cta: "Verify access",
      onClick: content.onWatch,
    };
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

  if (
    content.status === "scheduled"
    && content.accessMode === "free"
    && !content.producerRole
    && (content.accessState === "waiting" || content.accessState === "allowed" || !content.accessState)
  ) {
    if (content.rsvpState === "going") return { kind: "rsvped" };
    if (content.onRsvp) return { kind: "can_rsvp", cta: "RSVP", onClick: content.onRsvp };
  }

  if (content.status === "live") {
    return { kind: "can_watch", cta: "Watch live", onClick: content.onWatch };
  }

  return { kind: "scheduled" };
}

function shouldShowCta(ui: LiveRoomUiState): ui is Extract<LiveRoomUiState, { cta: string }> {
  return "cta" in ui && Boolean(ui.cta);
}

function hasPostPageMeta(content: LiveRoomContentSpec, ui: LiveRoomUiState, time: string | null): boolean {
  return Boolean(
    time
    || content.attendeeCountLabel
    || ui.kind === "has_ticket"
    || ui.kind === "rsvped"
    || ui.kind === "replay_processing",
  );
}

function LiveRoomCover({
  ageProofRequired,
  className,
  content,
  href,
}: {
  ageProofRequired: boolean;
  className?: string;
  content: LiveRoomContentSpec;
  href?: string;
}) {
  const cover = (
    <>
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
    </>
  );
  const coverClassName = cn(
    "relative aspect-video w-full overflow-hidden rounded-xl bg-muted",
    href && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    className,
  );

  return href ? (
    <a
      aria-label={`Open ${content.title}`}
      className={coverClassName}
      data-post-card-interactive="true"
      href={href}
    >
      {cover}
    </a>
  ) : (
    <div className={coverClassName}>{cover}</div>
  );
}

function ProducerControls({ content }: { content: LiveRoomContentSpec }) {
  if (!content.producerRole) return null;
  const isHost = content.producerRole === "host";
  const isAcceptedGuest = content.producerRole === "guest" && content.guestInviteStatus === "accepted";
  const showBroadcast = Boolean(content.freedomDetected && content.freedomHref && (isHost || isAcceptedGuest));

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
          <a href={content.freedomHref} rel="noreferrer" target="_blank">
            <Broadcast className="size-4" weight="bold" />
            {isHost ? "Start broadcast" : "Open producer room"}
          </a>
        </Button>
      ) : null}
      {!showBroadcast && !content.freedomDetected ? (
        <Button asChild size="sm" variant="outline">
          <a href={resolveResourceHref("source-freedom-browser") ?? "#"} rel="noreferrer" target="_blank">
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
  const time = timeLabel(content);
  const timeIsLive = content.status === "live";
  const showPrimaryCta = shouldShowCta(ui);
  const showPostPageMeta = hasPostPageMeta(content, ui, time);

  if (inPostPage) {
    return (
      <div className={cn("flex flex-col gap-5 text-start", className)}>
        <LiveRoomCover ageProofRequired={ageProofRequired} content={content} />

        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Type as="h2" variant="h2" className="min-w-0">
              {content.title}
            </Type>
          </div>
          {showPrimaryCta ? (
            <Button
              className="h-11 shrink-0 px-5 md:self-start"
              disabled={!ui.onClick}
              onClick={ui.onClick}
              size="sm"
            >
              {ui.kind === "can_watch_replay" ? <Play className="mr-1 size-4" weight="bold" /> : null}
              {ui.cta}
            </Button>
          ) : null}
        </div>

        {content.participants && content.participants.length > 0 ? (
          <ParticipantAvatars participants={content.participants} />
        ) : null}

        {showPostPageMeta ? (
          <div className="flex flex-wrap items-center gap-2">
            {time ? (
              <Type
                as="span"
                variant="label"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
                  timeIsLive
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary",
                )}
              >
                <Clock className="size-4" weight="bold" />
                {time}
              </Type>
            ) : null}
            {content.attendeeCountLabel ? (
              <Type as="span" variant="label" className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                <Users className="size-4" weight="bold" />
                {content.attendeeCountLabel}
              </Type>
            ) : null}
            {ui.kind === "has_ticket" ? (
              <Type as="span" variant="label" className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-success">
                You&apos;re going
              </Type>
            ) : null}
            {ui.kind === "rsvped" ? (
              <Type as="span" variant="label" className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-success">
                You&apos;re going
              </Type>
            ) : null}
            {ui.kind === "replay_processing" ? (
              <Type as="span" variant="label" className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                Replay processing
              </Type>
            ) : null}
          </div>
        ) : null}

        {content.description ? (
          <Type as="p" variant="body" className="max-w-[72ch] leading-7 text-muted-foreground">
            {content.description}
          </Type>
        ) : null}

        {content.setlistPreview && content.setlistPreview.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border-soft bg-muted/30">
            <div className="flex items-center gap-2 px-4 pt-4">
              <Type variant="body-strong">Setlist</Type>
              {content.setlistTotalCount ? (
                <Type as="span" variant="caption" className="inline-flex items-center rounded-full border border-border-soft bg-background px-2 py-0.5">
                  {content.setlistTotalCount} songs
                </Type>
              ) : null}
            </div>
            <ol className="space-y-0.5 px-4 py-3">
              {content.setlistPreview.map((track, index) => (
                <li key={track.title} className="flex gap-2">
                  <Type variant="caption" className="tabular-nums">
                    {index + 1}.
                  </Type>
                  <Type variant="caption">
                    {track.title}
                    {track.artist ? (
                      <span className="text-muted-foreground/70"> - {track.artist}</span>
                    ) : null}
                  </Type>
                </li>
              ))}
            </ol>
            {content.setlistHref ? (
              <div className="border-t border-border-soft px-4 py-3">
                <a
                  className="text-base font-medium text-primary hover:underline"
                  href={content.setlistHref}
                >
                  View full setlist
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
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
      <LiveRoomCover ageProofRequired={ageProofRequired} content={content} href={eventHref} />

      <div className="min-w-0">
        <div className="min-w-0">
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
        </div>

        {time ? (
          <p
            className={cn(
              "mt-0.5 font-medium",
              postCardType.meta,
              timeIsLive ? "text-destructive" : "text-foreground/90",
            )}
          >
            {time}
          </p>
        ) : null}

        {participantsLabel(content.participants) ? (
          <p className={cn("mt-0.5 text-muted-foreground", postCardType.meta)}>
            {participantsLabel(content.participants)}
          </p>
        ) : null}

        {content.description ? (
          <p className={cn("mt-0.5 text-muted-foreground", postCardType.meta)}>
            {content.description}
          </p>
        ) : null}
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
