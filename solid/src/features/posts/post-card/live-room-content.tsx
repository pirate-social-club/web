// Live-room post content, ported from the React post-card-live-room-content.
// All access/status derivation lives in live-room-model.ts. The inline
// post-page viewer surface (LiveRoomViewerSurface) belongs to the
// live-room-viewer lane; the post page renders the cover instead (see
// types.ts).

import { For, Show } from "solid-js";

import {
  Avatar,
  Button,
  buttonVariants,
  IconBroadcast,
  IconCalendarBlank,
  IconCheck,
  IconClock,
  IconDownloadSimple,
  IconLock,
  IconPlay,
  IconRobot,
  IconUsers,
  Type,
} from "../../../design-system";
import { cn } from "../../../design-system";
import {
  defaultLiveRoomLabels,
  deriveLiveRoomUi,
  hasReplaySurface,
  liveRoomAgeProofRequired,
  liveRoomHasPostPageMeta,
  liveRoomParticipantsLabel,
  liveRoomShouldShowCta,
  liveRoomTimeLabel,
  type LiveRoomLabels,
  type LiveRoomUiState,
} from "./live-room-model";
import { postCardType } from "./styles";
import type { LiveRoomContentSpec, LiveRoomParticipant, PostCardViewContext } from "./types";

export interface LiveRoomPostContentLabels extends Partial<LiveRoomLabels> {
  openTitle?: (title: string) => string;
  reviewRecording?: string;
  downloadFreedom?: string;
  youreGoing?: string;
  replayProcessing?: string;
  replayUnderReview?: string;
  replayUnavailable?: string;
  forSongOwnersUnavailable?: string;
  setlist?: string;
  songsCount?: (count: number) => string;
  viewFullSetlist?: string;
}

const defaultViewLabels: Required<Omit<LiveRoomPostContentLabels, keyof LiveRoomLabels>> = {
  openTitle: (title) => `Open ${title}`,
  reviewRecording: "Review recording",
  downloadFreedom: "Download Freedom",
  youreGoing: "You're going",
  replayProcessing: "Replay processing",
  replayUnderReview: "Replay under review",
  replayUnavailable: "Replay unavailable",
  forSongOwnersUnavailable: "For song owners · Not currently for sale",
  setlist: "Setlist",
  songsCount: (count) => `${count} songs`,
  viewFullSetlist: "View full setlist",
};

type ResolvedLabels = LiveRoomLabels & typeof defaultViewLabels;

function resolveLabels(labels?: LiveRoomPostContentLabels): ResolvedLabels {
  return { ...defaultLiveRoomLabels, ...defaultViewLabels, ...labels };
}

function LiveRoomCover(props: {
  ageProofRequired: boolean;
  class?: string;
  content: LiveRoomContentSpec;
  href?: string;
  labels: ResolvedLabels;
}) {
  const cover = (
    <>
      <Show
        when={props.ageProofRequired}
        fallback={(
          <Show
            when={props.content.coverSrc}
            fallback={(
              <div class="grid size-full place-items-center">
                <IconCalendarBlank class="size-12 text-muted-foreground" />
              </div>
            )}
          >
            {(src) => (
              <img alt={props.content.title} class="size-full object-cover" src={src()} />
            )}
          </Show>
        )}
      >
        <div aria-label={props.content.title} class="size-full bg-muted" role="img" />
        <div class="absolute inset-0 flex items-center justify-center bg-black/42">
          <IconLock class="size-9 text-white" />
        </div>
      </Show>
    </>
  );
  const coverClassName = cn(
    "relative aspect-video w-full overflow-hidden rounded-xl bg-muted",
    props.href && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    props.class,
  );

  return (
    <Show when={props.href} fallback={<div class={coverClassName}>{cover}</div>}>
      {(href) => (
        <a
          aria-label={props.labels.openTitle(props.content.title)}
          class={coverClassName}
          data-post-card-interactive="true"
          href={href()}
        >
          {cover}
        </a>
      )}
    </Show>
  );
}

function ParticipantAvatars(props: {
  labels: ResolvedLabels;
  participants: LiveRoomParticipant[];
}) {
  const guests = () => props.participants.filter((p) => p.role === "guest");
  const host = () => props.participants.find((p) => p.role === "host");

  return (
    <Show when={guests().length > 0}>
      <div class="flex flex-wrap items-center gap-2">
        <Type as="span" variant="body" class="text-muted-foreground">
          {props.labels.hostedBy}
        </Type>
        <Show when={host()}>
          {(hostParticipant) => (
            <span class="inline-flex items-center gap-1.5">
              <Show when={hostParticipant().avatarSrc}>
                {(src) => <Avatar fallback={hostParticipant().label.slice(0, 2)} size="xs" src={src()} />}
              </Show>
              <Type as="span" variant="body-strong">
                <Show when={hostParticipant().href} fallback={hostParticipant().label}>
                  {(href) => <a class="text-primary hover:underline" href={href()}>{hostParticipant().label}</a>}
                </Show>
              </Type>
            </span>
          )}
        </Show>
        <Type as="span" variant="body" class="text-muted-foreground">
          {props.labels.with}
        </Type>
        <For each={guests().slice(0, 3)}>
          {(guest, index) => (
            <>
              <Show when={index() > 0}>
                <Type as="span" variant="body" class="text-muted-foreground">,</Type>
              </Show>
              <span class="inline-flex items-center gap-1.5">
                <Show when={guest.avatarSrc}>
                  {(src) => <Avatar fallback={guest.label.slice(0, 2)} size="xs" src={src()} />}
                </Show>
                <Type as="span" variant="body-strong">
                  <Show when={guest.href} fallback={guest.label}>
                    {(href) => <a class="text-primary hover:underline" href={href()}>{guest.label}</a>}
                  </Show>
                </Type>
              </span>
            </>
          )}
        </For>
        <Show when={guests().length > 3}>
          <Type as="span" variant="body" class="text-muted-foreground">
            +{guests().length - 3}
          </Type>
        </Show>
      </div>
    </Show>
  );
}

function ProducerControls(props: {
  buttonClass?: string;
  class?: string;
  content: LiveRoomContentSpec;
  labels: ResolvedLabels;
}) {
  const isHost = () => props.content.producerRole === "host";
  const isAcceptedGuest = () => props.content.producerRole === "guest" && props.content.guestInviteStatus === "accepted";
  const showBroadcast = () => Boolean(props.content.freedomDetected && props.content.freedomHref && (isHost() || isAcceptedGuest()));
  const isPendingGuest = () => props.content.producerRole === "guest" && props.content.guestInviteStatus === "pending";
  const isRevokedGuest = () => props.content.producerRole === "guest" && props.content.guestInviteStatus === "revoked";
  const showReviewReplay = () => props.content.status === "ended"
    && props.content.replayStatus === "review_pending"
    && Boolean(props.content.onReviewReplay);

  return (
    <Show when={props.content.producerRole}>
      <Show
        when={!isPendingGuest() && !isRevokedGuest()}
        fallback={(
          <Show
            when={isPendingGuest()}
            fallback={(
              <p class="text-base text-muted-foreground">
                {props.labels.producerInviteRevoked}
              </p>
            )}
          >
            <div class={cn("flex flex-wrap items-center gap-2", props.class)}>
              <Show
                when={props.content.onAcceptGuestInvite}
                fallback={(
                  <Show when={props.content.anchorPostHref}>
                    {(href) => (
                      <a
                        class={cn(buttonVariants({ size: "sm" }), props.buttonClass)}
                        data-post-card-interactive="true"
                        href={href()}
                      >
                        {props.labels.openInvite}
                      </a>
                    )}
                  </Show>
                )}
              >
                {(onAccept) => (
                  <Button class={props.buttonClass} onClick={onAccept()} size="sm">
                    <IconCheck class="size-4" />
                    {props.labels.acceptInvite}
                  </Button>
                )}
              </Show>
              <p class="text-base text-muted-foreground">
                {props.labels.producerInviteHint}
              </p>
            </div>
          </Show>
        )}
      >
        <div class={cn("flex flex-wrap items-center gap-2", props.class)}>
          <Show when={showBroadcast() && props.content.freedomHref}>
            {(href) => (
              <a
                class={cn(buttonVariants({ size: "sm" }), props.buttonClass)}
                data-post-card-interactive="true"
                href={href()}
                rel="noreferrer"
                target="_blank"
              >
                <IconBroadcast class="size-4" />
                {isHost() ? props.labels.startBroadcast : props.labels.openProducerRoom}
              </a>
            )}
          </Show>
          <Show when={showReviewReplay()}>
            <Button class={props.buttonClass} onClick={props.content.onReviewReplay} size="sm" variant="secondary">
              <IconPlay class="size-4" />
              {props.labels.reviewRecording}
            </Button>
          </Show>
          <Show when={!showBroadcast() && !props.content.freedomDetected}>
            <a
              class={cn(buttonVariants({ size: "sm", variant: "outline" }), props.buttonClass)}
              data-post-card-interactive="true"
              href={props.content.freedomHref ?? "#"}
              rel="noreferrer"
              target="_blank"
            >
              <IconDownloadSimple class="size-4" />
              {props.labels.downloadFreedom}
            </a>
          </Show>
        </div>
      </Show>
    </Show>
  );
}

export interface LiveRoomPostContentProps {
  class?: string;
  content: LiveRoomContentSpec;
  labels?: LiveRoomPostContentLabels;
  viewContext?: PostCardViewContext;
}

export function LiveRoomPostContent(props: LiveRoomPostContentProps) {
  const labels = () => resolveLabels(props.labels);
  const ui = () => deriveLiveRoomUi(props.content, labels());
  const ageProofRequired = () => liveRoomAgeProofRequired(props.content);
  const inPostPage = () => props.viewContext === "post";
  const eventHref = () => (inPostPage() ? undefined : props.content.concertHref);
  const time = () => liveRoomTimeLabel(props.content, labels());
  const replaySurface = () => hasReplaySurface(props.content);
  const feedMeta = () => [time(), props.content.replayDurationLabel].filter(Boolean).join(" · ");
  const postPageTime = () => (inPostPage() && props.content.status === "live" ? null : time());
  const timeIsLive = () => props.content.status === "live";
  const showProducerPrimaryControl = () => Boolean(props.content.producerRole);
  /** The primary CTA state, narrowed to the variants that actually carry one. */
  const primaryCtaState = () => {
    const state = ui();
    return !props.content.producerRole && liveRoomShouldShowCta(state) ? state : null;
  };
  const showPrimaryCta = () => primaryCtaState() !== null;
  const showPostPageMeta = () => liveRoomHasPostPageMeta(props.content, ui(), postPageTime());

  const metaPill = (pillClass: string, text: string, icon?: import("@solidjs/web").JSX.Element) => (
    <Type as="span" variant="label" class={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1", pillClass)}>
      {icon}
      {text}
    </Type>
  );

  const postPageMetaPills = (uiState: LiveRoomUiState) => (
    <div class="flex flex-wrap items-center gap-2">
      <Show when={postPageTime()}>
        {(timeLabel) => metaPill(
          timeIsLive() ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          timeLabel(),
          <IconClock class="size-4" />,
        )}
      </Show>
      <Show when={props.content.attendeeCountLabel}>
        {(count) => metaPill("bg-muted", count(), <IconUsers class="size-4" />)}
      </Show>
      <Show when={props.content.replayDurationLabel}>
        {(duration) => metaPill("bg-muted text-muted-foreground", duration(), <IconPlay class="size-4" />)}
      </Show>
      <Show when={uiState.kind === "has_ticket" || uiState.kind === "rsvped"}>
        {metaPill("bg-success/10 text-success", labels().youreGoing)}
      </Show>
      <Show when={uiState.kind === "replay_processing"}>
        {metaPill("bg-muted text-muted-foreground", labels().replayProcessing)}
      </Show>
      <Show when={uiState.kind === "replay_review_pending"}>
        {metaPill("bg-warning/10 text-warning", labels().replayUnderReview)}
      </Show>
      <Show when={uiState.kind === "replay_failed"}>
        {metaPill("bg-muted text-muted-foreground", labels().replayUnavailable)}
      </Show>
      <Show when={uiState.kind === "owned_song_unavailable"}>
        {metaPill("bg-muted text-muted-foreground", labels().forSongOwnersUnavailable)}
      </Show>
    </div>
  );

  const agentCheckoutLink = (className: string) => (
    <Show when={props.content.agentPurchaseUrl}>
      {(url) => (
        <a class={className} data-post-card-interactive="true" href={url()}>
          <IconRobot class="size-4" />
          {props.content.agentPurchaseLabel ?? labels().agentCheckout}
        </a>
      )}
    </Show>
  );

  return (
    <Show
      when={!inPostPage()}
      fallback={(
        <div class={cn("flex flex-col gap-5 text-start", props.class)}>
          <LiveRoomCover ageProofRequired={ageProofRequired()} content={props.content} labels={labels()} />

          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div class="flex min-w-0 items-center gap-2">
              <Type as="h2" variant="h2" class="min-w-0">
                {props.content.title}
              </Type>
            </div>
            <Show
              when={!showProducerPrimaryControl()}
              fallback={<ProducerControls content={props.content} labels={labels()} />}
            >
              <Show when={primaryCtaState()}>
                {(ctaState) => (
                  <Button
                    class="h-11 shrink-0 px-5 md:self-start"
                    disabled={!ctaState().onClick}
                    onClick={ctaState().onClick}
                    size="sm"
                  >
                    <Show when={ctaState().kind === "can_watch_replay"}>
                      <IconPlay class="mr-1 size-4" />
                    </Show>
                    {ctaState().cta}
                  </Button>
                )}
              </Show>
            </Show>
          </div>

          <Show when={props.content.participants && props.content.participants.length > 0}>
            <ParticipantAvatars labels={labels()} participants={props.content.participants ?? []} />
          </Show>

          <Show when={showPostPageMeta()}>
            {postPageMetaPills(ui())}
          </Show>

          <Show when={props.content.description && !replaySurface()}>
            <Type as="p" variant="body" class="max-w-[72ch] leading-7 text-muted-foreground">
              {props.content.description}
            </Type>
          </Show>

          <Show when={props.content.setlistPreview && props.content.setlistPreview.length > 0}>
            <div class="overflow-hidden rounded-xl border border-border-soft bg-muted/30">
              <div class="flex items-center gap-2 px-4 pt-4">
                <Type variant="body-strong">{labels().setlist}</Type>
                <Show when={props.content.setlistTotalCount}>
                  {(count) => (
                    <Type as="span" variant="caption" class="inline-flex items-center rounded-full border border-border-soft bg-background px-2 py-0.5">
                      {labels().songsCount(count())}
                    </Type>
                  )}
                </Show>
              </div>
              <ol class="space-y-0.5 px-4 py-3">
                <For each={props.content.setlistPreview}>
                  {(track, index) => (
                    <li class="flex gap-2">
                      <Type variant="caption" class="tabular-nums">
                        {index() + 1}.
                      </Type>
                      <Type variant="caption">
                        {track.title}
                        <Show when={track.artist}>
                          <span class="text-muted-foreground/70"> - {track.artist}</span>
                        </Show>
                      </Type>
                    </li>
                  )}
                </For>
              </ol>
              <Show when={props.content.setlistHref}>
                {(href) => (
                  <div class="border-t border-border-soft px-4 py-3">
                    <a
                      class="text-base font-medium text-primary hover:underline"
                      data-post-card-interactive="true"
                      href={href()}
                    >
                      {labels().viewFullSetlist}
                    </a>
                  </div>
                )}
              </Show>
            </div>
          </Show>

          <div class="flex flex-wrap items-center gap-2">
            <Show when={props.content.agentPurchaseUrl}>
              {(url) => (
                <a
                  class={buttonVariants({ size: "sm", variant: "outline" })}
                  data-post-card-interactive="true"
                  href={url()}
                >
                  <IconRobot class="size-4" />
                  {props.content.agentPurchaseLabel ?? labels().agentCheckout}
                </a>
              )}
            </Show>
          </div>

          <Show when={!showProducerPrimaryControl()}>
            <ProducerControls content={props.content} labels={labels()} />
          </Show>
        </div>
      )}
    >
      <div class={cn("flex flex-col gap-2.5 text-start", props.class)}>
        <LiveRoomCover ageProofRequired={ageProofRequired()} content={props.content} href={eventHref()} labels={labels()} />

        <div class="min-w-0">
          <div class="min-w-0">
            <Show
              when={eventHref()}
              fallback={(
                <p class={cn("min-w-0 truncate font-semibold text-foreground", postCardType.label)}>
                  {props.content.title}
                </p>
              )}
            >
              {(href) => (
                <a
                  class={cn("min-w-0 truncate font-semibold text-foreground hover:underline", postCardType.label)}
                  data-post-card-interactive="true"
                  href={href()}
                >
                  {props.content.title}
                </a>
              )}
            </Show>
          </div>

          <Show when={feedMeta()}>
            <p
              class={cn(
                "mt-0.5 font-medium",
                postCardType.meta,
                timeIsLive() ? "text-destructive" : "text-foreground/90",
              )}
            >
              {feedMeta()}
            </p>
          </Show>

          <Show when={liveRoomParticipantsLabel(props.content.participants, labels())}>
            {(participants) => (
              <p class={cn("mt-0.5 text-muted-foreground", postCardType.meta)}>
                {participants()}
              </p>
            )}
          </Show>

          <Show when={props.content.description && !replaySurface()}>
            <p class={cn("mt-0.5 text-muted-foreground", postCardType.meta)}>
              {props.content.description}
            </p>
          </Show>
        </div>

        <Show
          when={!showProducerPrimaryControl()}
          fallback={(
            <ProducerControls buttonClass="h-11 w-full px-5" class="w-full" content={props.content} labels={labels()} />
          )}
        >
          <Show when={primaryCtaState()}>
            {(ctaState) => (
              <Show
                when={!ctaState().onClick && props.content.concertHref}
                fallback={(
                  <Button
                    class="h-11 w-full px-5"
                    disabled={!ctaState().onClick}
                    onClick={ctaState().onClick}
                    size="sm"
                    variant="default"
                  >
                    {ctaState().cta}
                  </Button>
                )}
              >
                {(href) => (
                  <a
                    class={cn(buttonVariants({ size: "sm" }), "h-11 w-full px-5")}
                    data-post-card-interactive="true"
                    href={href()}
                  >
                    {ctaState().cta}
                  </a>
                )}
              </Show>
            )}
          </Show>
          <Show when={ui().kind === "owned_song_unavailable"}>
            <p class={cn("text-muted-foreground", postCardType.meta)}>
              {labels().forSongOwnersUnavailable}
            </p>
          </Show>
        </Show>

        {agentCheckoutLink(cn("inline-flex items-center gap-1.5 text-primary hover:underline", postCardType.label))}
      </div>
    </Show>
  );
}
