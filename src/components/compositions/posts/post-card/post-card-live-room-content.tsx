import * as React from "react";
import { Broadcast, Calendar, Check, Clock, DownloadSimple, Lock as LockIcon, Play, Robot, Users } from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { LiveRoomViewerSurface } from "@/components/compositions/posts/live-room-viewer/live-room-viewer-modal";
import { Type } from "@/components/primitives/type";
import { resolveResourceHref } from "@/lib/resource-links";
import { cn } from "@/lib/utils";
import { interpolateMessage } from "@/lib/route-messages";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { postCardType } from "./post-card.styles";
import type { LiveRoomContentSpec, LiveRoomParticipant, PostCardViewContext } from "./post-card.types";

type LiveRoomUiState =
  | { kind: "can_watch"; cta: string; onClick?: () => void }
  | { kind: "can_watch_replay"; cta: string; onClick?: () => void }
  | { kind: "needs_access"; cta: string; onClick?: () => void }
  | { kind: "needs_owned_song"; cta: string; onClick: () => void }
  | { kind: "owned_song_unavailable" }
  | { kind: "needs_ticket"; cta: string; onClick?: () => void }
  | { kind: "has_ticket" }
  | { kind: "can_rsvp"; cta: string; onClick?: () => void }
  | { kind: "rsvped" }
  | { kind: "needs_verification"; cta: string; onClick?: () => void }
  | { kind: "tickets_unavailable" }
  | { kind: "replay_processing" }
  | { kind: "replay_review_pending" }
  | { kind: "replay_failed" }
  | { kind: "scheduled" }
  | { kind: "ended" }
  | { kind: "canceled" };

function priceLabel(content: LiveRoomContentSpec): string | null {
  return content.regionalPriceLabel ?? content.priceLabel ?? null;
}

function timeLabel(content: LiveRoomContentSpec, copy: { canceled: string; ended: string; endedAgo: string; startsAt: string }): string | null {
  if (content.status === "live") return null;
  if (content.status === "canceled") return copy.canceled;
  if (content.status === "ended") {
    if (!content.endedAtLabel) return copy.ended;
    if (content.endedAtLabel.endsWith("ago")) return `${copy.ended} ${content.endedAtLabel}`;
    return interpolateMessage(copy.endedAgo, { time: content.endedAtLabel });
  }
  return content.startsAtLabel ? interpolateMessage(copy.startsAt, { time: content.startsAtLabel }) : null;
}

function hasReplaySurface(content: LiveRoomContentSpec): boolean {
  return content.status === "ended"
    && Boolean(content.replayStatus && content.replayStatus !== "none");
}

function participantsLabel(participants: LiveRoomParticipant[] | undefined, copy: { host: string; with: string }): string | null {
  if (!participants || participants.length === 0) return null;
  const guests = participants.filter((p) => p.role === "guest");
  if (guests.length === 0) return null;
  const host = participants.find((p) => p.role === "host");
  const hostLabel = host?.label ?? copy.host;
  const extraCount = guests.length - 1;
  if (extraCount > 0) return `${hostLabel} with ${guests[0].label} + ${extraCount}`;
  return `${hostLabel} with ${guests[0].label}`;
}

function ParticipantAvatars({ participants, copy }: { participants: LiveRoomParticipant[]; copy: { hostedBy: string; with: string } }) {
  const guests = participants.filter((p) => p.role === "guest");
  if (guests.length === 0) return null;
  const host = participants.find((p) => p.role === "host");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Type as="span" variant="body" className="text-muted-foreground">
        {copy.hostedBy}
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
        {copy.with}
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

function deriveLiveRoomUi(content: LiveRoomContentSpec, copy: Record<string, string>): LiveRoomUiState {
  const ageProofRequired = content.ageGatePolicy === "18_plus"
    && content.contentSafetyState === "adult"
    && content.ageGateViewerState !== "verified_allowed";
  const price = priceLabel(content);

  if (content.status === "canceled") {
    return { kind: "canceled" };
  }

  if (content.status === "ended" || content.accessState === "ended") {
    if (content.replayStatus === "published") {
      if (content.accessMode === "paid" && !content.hasEntitlement) {
        return {
          kind: "needs_ticket",
          cta: price ? interpolateMessage(copy.buyForPrice, { price }) : copy.buy,
          onClick: content.onBuy,
        };
      }
      return { kind: "can_watch_replay", cta: copy.watchReplay, onClick: content.onWatch };
    }
    if (content.replayStatus === "processing") {
      return { kind: "replay_processing" };
    }
    if (content.replayStatus === "review_pending") {
      return { kind: "replay_review_pending" };
    }
    if (content.replayStatus === "failed") {
      return { kind: "replay_failed" };
    }
    return { kind: "ended" };
  }

  if (ageProofRequired) {
    return {
      kind: "needs_verification",
      cta: copy.verifyToAttend,
      onClick: content.onVerifyAge,
    };
  }

  if (content.accessState === "missing_listing") {
    return { kind: "tickets_unavailable" };
  }

  if (content.accessState === "gate_required") {
    if (content.onGatePurchase) {
      return {
        kind: "needs_owned_song",
        cta: content.gatePurchaseLabel ? interpolateMessage(copy.buySongToWatchForPrice, { price: content.gatePurchaseLabel }) : copy.buySongToWatch,
        onClick: content.onGatePurchase,
      };
    }
    if (content.gateOwnershipRequired) {
      return { kind: "owned_song_unavailable" };
    }
    return {
      kind: "needs_access",
      cta: copy.verifyAccess,
      onClick: content.onWatch,
    };
  }

  if (content.accessState === "purchase_required" || (content.accessMode === "paid" && !content.hasEntitlement)) {
    return {
      kind: "needs_ticket",
      cta: price ? interpolateMessage(copy.getTicketForPrice, { price }) : copy.getTicket,
      onClick: content.onBuy,
    };
  }

  if (content.accessMode === "paid" && content.hasEntitlement) {
    if (content.status === "live") {
      return { kind: "can_watch", cta: copy.watchLive, onClick: content.onWatch };
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
    if (content.onRsvp) return { kind: "can_rsvp", cta: copy.rsvp, onClick: content.onRsvp };
  }

  if (content.status === "live" && !content.accessState && !content.producerRole) {
    return { kind: "scheduled" };
  }

  if (content.status === "live") {
    return { kind: "can_watch", cta: copy.watchLive, onClick: content.onWatch };
  }

  return { kind: "scheduled" };
}

function shouldShowCta(ui: LiveRoomUiState): ui is Extract<LiveRoomUiState, { cta: string }> {
  return "cta" in ui && Boolean(ui.cta);
}

function hasPostPageMeta(content: LiveRoomContentSpec, ui: LiveRoomUiState, time: string | null): boolean {
  return Boolean(
    time
    || content.replayDurationLabel
    || content.attendeeCountLabel
    || ui.kind === "has_ticket"
    || ui.kind === "rsvped"
    || ui.kind === "replay_processing"
    || ui.kind === "replay_review_pending"
    || ui.kind === "replay_failed"
    || ui.kind === "owned_song_unavailable",
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
      {ageProofRequired ? (
        <>
          <div
            aria-label={content.title}
            className="size-full bg-muted"
            role="img"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/42">
            <LockIcon className="size-9 text-white" weight="fill" />
          </div>
        </>
      ) : content.coverSrc ? (
        <>
          <img
            alt={content.title}
            className="size-full object-cover"
            src={content.coverSrc}
          />
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

function ProducerControls({
  buttonClassName,
  className,
  content,
  copy,
}: {
  buttonClassName?: string;
  className?: string;
  content: LiveRoomContentSpec;
  copy: Record<string, string>;
}) {
  if (!content.producerRole) return null;
  const isHost = content.producerRole === "host";
  const isAcceptedGuest = content.producerRole === "guest" && content.guestInviteStatus === "accepted";
  const showBroadcast = Boolean(content.freedomDetected && content.freedomHref && (isHost || isAcceptedGuest));

  if (content.producerRole === "guest" && content.guestInviteStatus === "pending") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {content.onAcceptGuestInvite ? (
          <Button className={buttonClassName} onClick={content.onAcceptGuestInvite} size="sm">
            <Check className="size-4" weight="bold" />
            {copy.acceptInvite}
          </Button>
        ) : content.anchorPostHref ? (
          <Button asChild className={buttonClassName} size="sm">
            <a href={content.anchorPostHref}>{copy.openInvite}</a>
          </Button>
        ) : null}
        <p className="text-base text-muted-foreground">
          {copy.producerInviteHint}
        </p>
      </div>
    );
  }

  if (content.producerRole === "guest" && content.guestInviteStatus === "revoked") {
    return (
      <p className="text-base text-muted-foreground">
        {copy.producerInviteRevoked}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {showBroadcast ? (
        <Button asChild className={buttonClassName} size="sm">
          <a href={content.freedomHref} rel="noreferrer" target="_blank">
            <Broadcast className="size-4" weight="bold" />
            {isHost ? copy.startBroadcast : copy.openProducerRoom}
          </a>
        </Button>
      ) : null}
      {content.status === "ended" && content.replayStatus === "review_pending" && content.onReviewReplay ? (
        <Button className={buttonClassName} onClick={content.onReviewReplay} size="sm" variant="secondary">
          <Play className="size-4" weight="bold" />
          Review recording
        </Button>
      ) : null}
      {!showBroadcast && !content.freedomDetected ? (
        <Button asChild className={buttonClassName} size="sm" variant="outline">
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
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");
  const liveRoom = copy.post.liveRoom;
  const ui = deriveLiveRoomUi(content, liveRoom);
  const ageProofRequired = content.ageGatePolicy === "18_plus"
    && content.contentSafetyState === "adult"
    && content.ageGateViewerState !== "verified_allowed";
  const inPostPage = viewContext === "post";
  const eventHref = inPostPage ? undefined : content.concertHref;
  const time = timeLabel(content, liveRoom);
  const replaySurface = hasReplaySurface(content);
  const feedMeta = [time, content.replayDurationLabel].filter(Boolean).join(" · ");
  const postPageTime = inPostPage && content.status === "live" ? null : time;
  const timeIsLive = content.status === "live";
  const inlineViewerAttach = inPostPage
    && content.status === "live"
    && content.accessMode === "free"
    && content.hasEntitlement
    && !content.producerRole
    ? content.viewerAttachResponse ?? null
    : null;
  const showProducerPrimaryControl = Boolean(content.producerRole);
  const showPrimaryCta = !content.producerRole && shouldShowCta(ui) && !inlineViewerAttach;
  const showPostPageMeta = hasPostPageMeta(content, ui, postPageTime);

  if (inPostPage) {
    return (
      <div className={cn("flex flex-col gap-5 text-start", className)}>
        {inlineViewerAttach ? (
          <LiveRoomViewerSurface
            attachResponse={inlineViewerAttach}
            className="overflow-hidden rounded-xl border border-border-soft"
            onRenew={content.onViewerRenew}
            open
            placeholderSrc={content.coverSrc}
            showDetails={false}
            title={content.title}
          />
        ) : (
          <LiveRoomCover ageProofRequired={ageProofRequired} content={content} />
        )}

        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Type as="h2" variant="h2" className="min-w-0">
              {content.title}
            </Type>
          </div>
          {showProducerPrimaryControl ? (
            <ProducerControls content={content} copy={liveRoom} />
          ) : showPrimaryCta ? (
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
          <ParticipantAvatars copy={liveRoom} participants={content.participants} />
        ) : null}

        {showPostPageMeta ? (
          <div className="flex flex-wrap items-center gap-2">
            {postPageTime ? (
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
                {postPageTime}
              </Type>
            ) : null}
            {content.attendeeCountLabel ? (
              <Type as="span" variant="label" className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                <Users className="size-4" weight="bold" />
                {content.attendeeCountLabel}
              </Type>
            ) : null}
            {content.replayDurationLabel ? (
              <Type as="span" variant="label" className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                <Play className="size-4" weight="bold" />
                {content.replayDurationLabel}
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
            {ui.kind === "replay_review_pending" ? (
              <Type as="span" variant="label" className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-warning">
                Replay under review
              </Type>
            ) : null}
            {ui.kind === "replay_failed" ? (
              <Type as="span" variant="label" className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                Replay unavailable
              </Type>
            ) : null}
            {ui.kind === "owned_song_unavailable" ? (
              <Type as="span" variant="label" className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                For song owners · Not currently for sale
              </Type>
            ) : null}
          </div>
        ) : null}

        {content.description && !replaySurface ? (
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
                {content.agentPurchaseLabel ?? liveRoom.agentCheckout}
              </a>
            </Button>
          ) : null}
        </div>

        {showProducerPrimaryControl ? null : <ProducerControls content={content} copy={liveRoom} />}
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

        {feedMeta ? (
          <p
            className={cn(
              "mt-0.5 font-medium",
              postCardType.meta,
              timeIsLive ? "text-destructive" : "text-foreground/90",
            )}
          >
            {feedMeta}
          </p>
        ) : null}

        {participantsLabel(content.participants, liveRoom) ? (
          <p className={cn("mt-0.5 text-muted-foreground", postCardType.meta)}>
            {participantsLabel(content.participants, liveRoom)}
          </p>
        ) : null}

        {content.description && !replaySurface ? (
          <p className={cn("mt-0.5 text-muted-foreground", postCardType.meta)}>
            {content.description}
          </p>
        ) : null}
      </div>

      {showProducerPrimaryControl ? (
        <ProducerControls buttonClassName="h-11 w-full px-5" className="w-full" content={content} copy={liveRoom} />
      ) : showPrimaryCta ? (
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
      ) : ui.kind === "owned_song_unavailable" ? (
        <p className={cn("text-muted-foreground", postCardType.meta)}>
          For song owners · Not currently for sale
        </p>
      ) : null}

      {content.agentPurchaseUrl ? (
        <a
          className={cn("inline-flex items-center gap-1.5 text-primary hover:underline", postCardType.label)}
          href={content.agentPurchaseUrl}
        >
          <Robot className="size-4" weight="duotone" />
          {content.agentPurchaseLabel ?? liveRoom.agentCheckout}
        </a>
      ) : null}
    </div>
  );
}
