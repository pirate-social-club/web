"use client";

import * as React from "react";
import {
  Bell,
  CaretRight,
  ChatCircleText,
  Coins,
  HandPalm,
  IdentificationCard,
  UserCircle,
  Users,
  type Icon,
} from "@phosphor-icons/react";
import type {
  NotificationFeedItem,
  UserTask,
} from "@pirate/api-contracts";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { CardShell, PageContainer } from "@/components/primitives/layout-shell";
import { Separator } from "@/components/primitives/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { resolveLocaleLanguageTag } from "@/lib/ui-locale-core";
import { getLocaleMessages } from "@/locales";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

function payloadString(
  payload: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function formatTaskLabel(type: string, copy: ReturnType<typeof getLocaleMessages<"routes">>["inbox"]): string {
  switch (type) {
    case "namespace_verification_required":
      return copy.taskNamespaceVerificationRequired;
    case "namespace_verification_pending":
      return "Namespace verification pending";
    case "unique_human_verification_required":
      return "Verify you're human";
    case "membership_review":
      return "Membership requests";
    case "profile_completion_suggested":
      return "Finish your profile";
    case "global_handle_cleanup_suggested":
      return "Choose your .pirate name";
    case "payout_setup_required":
      return "Set up creator payouts";
    case "royalty_claim_available":
      return "Claim royalties";
    default:
      return type.replace(/_/g, " ");
  }
}

function getMembershipReviewCount(task: UserTask): number | null {
  const value = task.payload?.request_count;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatTaskMeta(task: UserTask): string | null {
  if (task.type === "unique_human_verification_required") {
    return "Take a photo of your palm";
  }
  if (task.type === "profile_completion_suggested") {
    return "Add a name, bio, avatar, or cover";
  }
  if (task.type === "global_handle_cleanup_suggested") {
    return "Replace your generated handle";
  }
  if (task.type === "payout_setup_required") {
    return task.payload?.community_display_name
      ? `${String(task.payload.community_display_name)} · connect a payout wallet`
      : "Connect a payout wallet";
  }
  if (task.type === "royalty_claim_available") {
    return task.payload?.community_display_name
      ? `${String(task.payload.community_display_name)} · royalties are ready`
      : "Royalties are ready";
  }
  if (task.type === "namespace_verification_pending") {
    return task.payload?.community_display_name
      ? `${String(task.payload.community_display_name)} · waiting for verification`
      : "Waiting for verification";
  }
  if (task.type === "membership_review") {
    return [
      task.payload?.community_display_name ? String(task.payload.community_display_name) : null,
      getMembershipReviewCount(task) != null ? `${getMembershipReviewCount(task)} pending` : null,
    ].filter(Boolean).join(" · ");
  }
  return task.payload?.community_display_name ? String(task.payload.community_display_name) : null;
}

function formatEventLabel(
  item: NotificationFeedItem,
  copy: ReturnType<typeof getLocaleMessages<"routes">>["inbox"],
): string {
  const actorLabel = payloadString(item.event.payload, "actor_display_name") ?? copy.someone;

  switch (item.event.type) {
    case "comment_reply":
      return copy.eventCommentReply.replace("{actor}", actorLabel);
    case "post_commented":
      return copy.eventPostCommented.replace("{actor}", actorLabel);
    case "xmtp_message":
      return `${actorLabel} sent a message`;
    case "mention":
      return `${actorLabel} mentioned you`;
    case "mod_event":
      return "Moderation update";
    case "community_update":
      return payloadString(item.event.payload, "title") ?? "Community update";
    case "royalty_earned":
      return "Royalty earned";
    default:
      return actorLabel;
  }
}

function formatEventMeta(item: NotificationFeedItem, localeTag: string): string {
  const communityLabel = payloadString(item.event.payload, "community_display_name")
    ?? payloadString(item.event.payload, "community_id");
  const dateLabel = new Date(item.event.created_at).toLocaleDateString(localeTag);
  return [communityLabel, dateLabel].filter(Boolean).join(" · ");
}

function formatEventContext(item: NotificationFeedItem): string | null {
  if (item.event.type === "royalty_earned") {
    const amount = payloadString(item.event.payload, "amount_wip_wei");
    const title = payloadString(item.event.payload, "title");
    if (amount && title) return `+$${formatWipAmount(amount)} $WIP from ${title}`;
    if (amount) return `+$${formatWipAmount(amount)} $WIP`;
  }

  return payloadString(item.event.payload, "comment_excerpt")
    ?? payloadString(item.event.payload, "post_title")
    ?? payloadString(item.event.payload, "body")
    ?? payloadString(item.event.payload, "message_preview")
    ?? payloadString(item.event.payload, "context_label");
}

function formatWipAmount(wei: string): string {
  try {
    const formatted = `${BigInt(wei) / 10n ** 18n}.${`${BigInt(wei) % 10n ** 18n}`.padStart(18, "0")}`;
    const [whole, fraction = ""] = formatted.split(".");
    const trimmedFraction = fraction.slice(0, 4).replace(/0+$/u, "");
    if (whole === "0" && fraction.replace(/0/gu, "").length > 0 && !trimmedFraction) {
      return "<0.0001";
    }
    return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
  } catch {
    return "0";
  }
}

function formatRelativeShort(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "";
  const diffMs = Date.now() - timestamp;
  const future = diffMs < 0;
  const absSeconds = Math.max(0, Math.round(Math.abs(diffMs) / 1000));
  const units = [
    { label: "y", seconds: 365 * 24 * 60 * 60 },
    { label: "mo", seconds: 30 * 24 * 60 * 60 },
    { label: "w", seconds: 7 * 24 * 60 * 60 },
    { label: "d", seconds: 24 * 60 * 60 },
    { label: "h", seconds: 60 * 60 },
    { label: "m", seconds: 60 },
  ] as const;

  for (const unit of units) {
    if (absSeconds >= unit.seconds) {
      const amount = Math.floor(absSeconds / unit.seconds);
      return future ? `in ${amount}${unit.label}` : `${amount}${unit.label}`;
    }
  }

  return "now";
}

function getTaskIcon(task: UserTask): Icon {
  switch (task.type) {
    case "namespace_verification_required":
    case "namespace_verification_pending":
      return IdentificationCard;
    case "membership_review":
      return Users;
    case "unique_human_verification_required":
      return HandPalm;
    case "profile_completion_suggested":
    case "global_handle_cleanup_suggested":
      return UserCircle;
    case "payout_setup_required":
    case "royalty_claim_available":
      return Coins;
    default:
      return Bell;
  }
}

function getActivityIcon(item: NotificationFeedItem): Icon {
  if (item.event.type === "royalty_earned") return Coins;
  return item.event.type === "xmtp_message" ? ChatCircleText : Bell;
}

function getActivityMedia(item: NotificationFeedItem): React.ReactNode | null {
  const socialTypes = ["comment_reply", "post_commented", "xmtp_message"];
  if (!socialTypes.includes(item.event.type)) return null;

  const actorName = payloadString(item.event.payload, "actor_display_name") ?? "?";
  const avatarUrl = payloadString(item.event.payload, "actor_avatar_url");

  return (
    <Avatar
      className="h-10 w-10 border-none"
      fallback={actorName}
      size="sm"
      src={avatarUrl ?? undefined}
    />
  );
}

export function resolveNotificationActivityHref(item: NotificationFeedItem): string | null {
  const payloadPath = payloadString(item.event.payload, "target_path");
  if (payloadPath) {
    return payloadPath;
  }

  if (item.event.type === "comment_reply") {
    const threadRootPostId = payloadString(item.event.payload, "thread_root_post_id");
    return threadRootPostId ? `/p/${threadRootPostId}` : null;
  }

  if (item.event.type === "post_commented") {
    return item.event.subject_type === "post" ? `/p/${item.event.subject_id}` : null;
  }

  if (item.event.type === "xmtp_message") {
    return `/chat/c/${encodeURIComponent(item.event.subject_id)}`;
  }

  return null;
}

function SectionCard({
  children,
  flat = false,
}: {
  children: React.ReactNode;
  flat?: boolean;
}) {
  return (
    <Card className={cn("overflow-hidden", flat && "rounded-none border-x-0 border-t-0 bg-transparent shadow-none")}>
      {children}
    </Card>
  );
}

function NotificationIcon({
  icon: IconComponent,
  unread = false,
}: {
  icon: Icon;
  unread?: boolean;
}) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground">
      <IconComponent aria-hidden className="size-5" weight={unread ? "fill" : "regular"} />
    </span>
  );
}

function NotificationRow({
  href,
  icon: IconComponent,
  media,
  meta,
  onClick,
  subtext,
  title,
  unread = false,
}: {
  href?: string | null;
  icon?: Icon;
  media?: React.ReactNode;
  meta?: string | null;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  subtext?: string | null;
  title: string;
  unread?: boolean;
}) {
  const interactive = Boolean(href || onClick);
  const content = (
    <>
      {media ? (
        <span aria-hidden className="shrink-0">{media}</span>
      ) : IconComponent ? (
        <NotificationIcon icon={IconComponent} unread={unread} />
      ) : null}
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex min-w-0 items-baseline gap-2">
          <Type as="span" className="truncate" variant={unread ? "body-strong" : "body"}>
            {title}
          </Type>
          {meta ? (
            <Type as="span" className="shrink-0 text-muted-foreground" variant="caption">
              <span aria-hidden>· </span>{meta}
            </Type>
          ) : null}
        </span>
        {subtext ? (
          <Type as="span" className="block truncate text-muted-foreground" variant="body">
            {subtext}
          </Type>
        ) : null}
      </span>
      {interactive ? <CaretRight aria-hidden className="hidden size-5 shrink-0 text-muted-foreground sm:block" /> : null}
    </>
  );
  const className = cn(
    "flex w-full items-center gap-3 px-5 py-4 text-left",
    interactive && "transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
  );

  if (href) {
    return (
      <a className={className} href={href} onClick={onClick}>
        {content}
      </a>
    );
  }

  if (!onClick) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button className={className} onClick={onClick} type="button">
      {content}
    </button>
  );
}

export function NotificationInboxPage({
  activityItems,
  loading = false,
  onDismissTask,
  onOpenActivityItem,
  onVerifyTask,
  tasks,
  title,
}: {
  activityItems: NotificationFeedItem[];
  loading?: boolean;
  onDismissTask?: (task: UserTask) => void;
  onOpenActivityItem?: (item: NotificationFeedItem) => void;
  onVerifyTask?: (task: UserTask) => void;
  tasks: UserTask[];
  title?: string;
}) {
  const { locale } = useUiLocale();
  const copy = React.useMemo(() => getLocaleMessages(locale, "routes").inbox, [locale]);
  const localeTag = React.useMemo(() => resolveLocaleLanguageTag(locale), [locale]);
  const isMobile = useIsMobile();
  const hasTasks = tasks.length > 0;
  const hasActivity = activityItems.length > 0;
  const hasContent = hasTasks || hasActivity;

  return (
    <PageContainer className={cn("flex min-w-0 flex-1 flex-col", isMobile ? "gap-4" : "gap-6")}>
      {isMobile ? null : (
        <CardShell className="px-5 py-5 md:px-6 md:py-6">
          <Type as="h1" variant="h2">{title ?? copy.title}</Type>
        </CardShell>
      )}

      <div className={cn(
        "flex min-w-0 flex-1 flex-col",
        isMobile ? "-mx-3 gap-0" : "overflow-hidden rounded-[var(--radius-2xl)] border border-border-soft bg-card",
      )}>
        {loading ? (
          <div className="px-5 py-8 text-center">
            <Type as="p" className="text-muted-foreground" variant="body">{copy.loading}</Type>
          </div>
        ) : !hasContent ? (
          <div className="px-5 py-8 text-center">
            <Type as="p" className="text-muted-foreground" variant="body">{copy.emptyState}</Type>
          </div>
        ) : (
          <>
            {hasTasks ? (
              <SectionCard flat={isMobile}>
                <div>
                  <Type as="h2" className="sr-only" variant="h4">{copy.taskActionNeeded}</Type>
                  {tasks.map((task, index) => (
                    <div key={task.task_id}>
                      {index > 0 ? <Separator /> : null}
                      <div className="flex items-center gap-3 px-5 py-4">
                        <NotificationIcon icon={getTaskIcon(task)} unread />
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="flex min-w-0 items-baseline gap-2">
                            <Type as="span" className="truncate" variant="body-strong">
                              {formatTaskLabel(task.type, copy)}
                            </Type>
                            <Type as="span" className="shrink-0 text-muted-foreground" variant="caption">
                              <span aria-hidden>· </span>{formatRelativeShort(task.created_at)}
                            </Type>
                          </span>
                          {formatTaskMeta(task) ? (
                            <Type as="p" className="truncate text-muted-foreground" variant="body">
                              {formatTaskMeta(task)}
                            </Type>
                          ) : null}
                        </div>
                        <div className="hidden shrink-0 items-center gap-2 sm:flex">
                          {task.type === "namespace_verification_required" ? (
                            <Button onClick={() => onVerifyTask?.(task)} size="sm" variant="secondary">
                              {copy.taskVerify}
                            </Button>
                          ) : task.type === "membership_review" ? (
                            <Button onClick={() => onVerifyTask?.(task)} size="sm" variant="secondary">
                              Review
                            </Button>
                          ) : null}
                          {task.type === "membership_review" ? null : (
                            <Button onClick={() => onDismissTask?.(task)} size="sm" variant="ghost">
                              {copy.taskDismiss}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {hasActivity ? (
              <SectionCard flat={isMobile}>
                <div>
                  <Type as="h2" className="sr-only" variant="h4">{copy.recentActivity}</Type>
                  {activityItems.map((item, index) => {
                    const href = resolveNotificationActivityHref(item);
                    const context = formatEventContext(item);
                    const relativeTime = formatRelativeShort(item.event.created_at);

                    return (
                      <div key={item.event.event_id}>
                        {index > 0 || hasTasks ? <Separator /> : null}
                        <NotificationRow
                          href={href ?? undefined}
                          icon={getActivityIcon(item)}
                          media={getActivityMedia(item)}
                          meta={relativeTime || null}
                          onClick={(event) => {
                            if (!href || !onOpenActivityItem) {
                              return;
                            }
                            event.preventDefault();
                            onOpenActivityItem(item);
                          }}
                          subtext={context ?? formatEventMeta(item, localeTag)}
                          title={formatEventLabel(item, copy)}
                          unread={!item.receipt.read_at}
                        />
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            ) : null}
          </>
        )}
      </div>
    </PageContainer>
  );
}
