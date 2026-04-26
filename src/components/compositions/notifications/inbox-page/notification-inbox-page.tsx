"use client";

import * as React from "react";
import {
  Bell,
  CaretRight,
  ChatCircleText,
  CheckCircle,
  Coins,
  HandPalm,
  IdentificationCard,
  UserCircle,
  Users,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react";
import type {
  NotificationFeedItem,
  RoyaltyActivityItem,
  RoyaltyClaimRecord,
  UserTask,
} from "@pirate/api-contracts";
import { formatUnits, getAddress, isAddress } from "viem";

import { Avatar } from "@/components/primitives/avatar";
import { Card } from "@/components/primitives/card";
import { Spinner } from "@/components/primitives/spinner";
import { PageContainer } from "@/components/primitives/layout-shell";
import { Separator } from "@/components/primitives/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { getPirateNetworkConfig } from "@/lib/network-config";
import { getLocaleMessages } from "@/locales";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import { PwaInstallPromo } from "@/components/compositions/pwa/pwa-install-promo";

function payloadString(
  payload: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function formatTaskLabel(type: string, copy: ReturnType<typeof getLocaleMessages<"routes">>["inbox"]): string {
  switch (type) {
    case "unique_human_verification_required":
      return "Verify you're human";
    case "profile_completion_suggested":
      return "Finish your profile";
    case "global_handle_cleanup_suggested":
      return "Choose your .pirate name";
    case "namespace_verification_required":
      return copy.taskNamespaceVerificationRequired;
    case "membership_review":
      return "Membership requests";
    default:
      return type.replace(/_/g, " ");
  }
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
  if (task.type === "membership_review") {
    return [
      task.payload?.community_display_name ? String(task.payload.community_display_name) : null,
      getMembershipReviewCount(task) != null ? `${getMembershipReviewCount(task)} pending` : null,
    ].filter(Boolean).join(" · ");
  }
  return task.payload?.community_display_name ? String(task.payload.community_display_name) : null;
}

function formatWipAmount(wei: string): string {
  try {
    const formatted = formatUnits(BigInt(wei), 18);
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

function formatCompactAddress(address: string | null | undefined): string | null {
  if (!address || !isAddress(address)) return null;
  const normalized = getAddress(address);
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

function formatCompactHash(hash: string | null | undefined): string | null {
  if (!hash?.startsWith("0x") || hash.length < 14) return null;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
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

  return future ? "now" : "now";
}

function txHref(txHash: string | null | undefined, chainId = getPirateNetworkConfig().story.chainId): string | null {
  if (!txHash?.startsWith("0x")) return null;
  const config = getPirateNetworkConfig();
  const explorerUrl = chainId === config.story.chainId
    ? config.story.explorerUrl
    : config.story.explorerUrl;
  return `${explorerUrl.replace(/\/$/u, "")}/tx/${txHash}`;
}

function getMembershipReviewCount(task: UserTask): number | null {
  const value = task.payload?.request_count;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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
    case "royalty_earned":
      return "Royalty earned";
    default:
      return `${actorLabel} ${item.event.type.replace(/_/g, " ")}`;
  }
}

function formatEventContext(item: NotificationFeedItem): string | null {
  if (item.event.type === "royalty_earned") {
    const amount = payloadString(item.event.payload, "amount_wip_wei");
    const title = payloadString(item.event.payload, "title");
    if (amount && title) return `+$${formatWipAmount(amount)} $WIP from ${title}`;
    if (amount) return `+$${formatWipAmount(amount)} $WIP`;
  }
  return payloadString(item.event.payload, "comment_excerpt")
    ?? payloadString(item.event.payload, "post_title");
}

function isChatActivity(item: NotificationFeedItem): boolean {
  return item.event.type === "xmtp_message";
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

export function resolveNotificationTaskHref(task: UserTask): string | null {
  const payloadPath = payloadString(task.payload, "target_path");
  if (payloadPath) {
    return payloadPath;
  }

  switch (task.type) {
    case "unique_human_verification_required":
      return "/onboarding?verify=human";
    case "profile_completion_suggested":
      return "/settings/profile";
    case "global_handle_cleanup_suggested":
      return "/settings/profile";
    case "membership_review":
      return `/c/${task.subject_id}/mod/requests`;
    case "namespace_verification_required":
      return `/c/${task.subject_id}/mod/namespace`;
    default:
      return null;
  }
}

function getTaskIcon(task: UserTask): Icon {
  switch (task.type) {
    case "unique_human_verification_required":
      return HandPalm;
    case "namespace_verification_required":
      return IdentificationCard;
    case "profile_completion_suggested":
      return UserCircle;
    case "global_handle_cleanup_suggested":
      return IdentificationCard;
    case "membership_review":
      return Users;
    default:
      return Bell;
  }
}

function getActivityIcon(item: NotificationFeedItem): Icon {
  if (item.event.type === "royalty_earned") return Coins;
  return isChatActivity(item) ? ChatCircleText : Bell;
}

function getActivityMedia(item: NotificationFeedItem): React.ReactNode | null {
  const socialTypes = ["comment_reply", "post_commented", "xmtp_message"];
  if (!socialTypes.includes(item.event.type)) return null;

  const actorName = payloadString(item.event.payload, "actor_display_name") ?? "?";
  const avatarUrl = payloadString(item.event.payload, "actor_avatar_url");

  return (
    <Avatar
      fallback={actorName}
      size="sm"
      src={avatarUrl ?? undefined}
    />
  );
}

type IconTone = "primary" | "warning" | "success" | "muted" | "foreground";

function NotificationIcon({
  icon: IconComponent,
  tone = "primary",
  weight = "regular",
}: {
  icon: Icon;
  tone?: IconTone;
  weight?: "fill" | "regular" | "bold" | "duotone";
}) {
  const toneClass: Record<IconTone, string> = {
    primary: "bg-primary-subtle text-primary",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    muted: "bg-muted text-muted-foreground",
    foreground: "bg-muted/45 text-foreground",
  };

  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", toneClass[tone])}>
      <IconComponent aria-hidden className="size-5" weight={weight} />
    </span>
  );
}

function SectionCard({
  children,
  flat = false,
}: {
  children: React.ReactNode;
  flat?: boolean;
}) {
  return (
    <Card className={cn("overflow-hidden", flat && "rounded-none border-x-0 bg-transparent shadow-none")}>
      {children}
    </Card>
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
  const content = (
    <>
      {media ? (
        <span className="shrink-0">{media}</span>
      ) : IconComponent ? (
        <NotificationIcon
          icon={IconComponent}
          tone={unread ? "foreground" : "muted"}
          weight={unread ? "fill" : "regular"}
        />
      ) : null}
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex min-w-0 items-center justify-between gap-3">
          <Type
            as="span"
            className="truncate"
            variant={unread ? "body-strong" : "body"}
          >
            {title}
          </Type>
          {meta ? (
            <Type as="span" className="shrink-0 text-muted-foreground" variant="caption">
              {meta}
            </Type>
          ) : null}
        </span>
        {subtext ? (
          <Type as="span" className="block truncate text-muted-foreground" variant="body">
            {subtext}
          </Type>
        ) : null}
      </span>
      {href || onClick ? <CaretRight aria-hidden className="size-5 shrink-0 text-muted-foreground" /> : null}
    </>
  );
  const interactive = Boolean(href || onClick);
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

function NotificationTaskList({
  copy,
  onVerifyTask,
  tasks,
}: {
  copy: ReturnType<typeof getLocaleMessages<"routes">>["inbox"];
  onVerifyTask?: (task: UserTask) => void;
  tasks: UserTask[];
}) {
  return (
    <div>
      {tasks.map((task, index) => {
        const href = resolveNotificationTaskHref(task);
        return (
          <div key={task.task_id}>
            {index > 0 ? <Separator /> : null}
            <NotificationRow
              icon={getTaskIcon(task)}
              onClick={href && onVerifyTask ? () => onVerifyTask(task) : undefined}
              subtext={formatTaskMeta(task)}
              title={formatTaskLabel(task.type, copy)}
              unread
            />
          </div>
        );
      })}
    </div>
  );
}

type NotificationTimelineEntry =
  | {
    item: NotificationFeedItem;
    key: string;
    timestamp: number;
    type: "notification";
  }
  | {
    item: RoyaltyActivityItem;
    key: string;
    timestamp: number;
    type: "royalty_activity";
  }
  | {
    item: RoyaltyClaimRecord;
    key: string;
    timestamp: number;
    type: "royalty_claim";
  };

function parseTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function NotificationActivityList({
  activityItems,
  copy,
  onOpenActivityItem,
  royaltyActivityItems,
  royaltyActivityLoading,
  royaltyClaimItems,
  royaltyClaimLoading,
}: {
  activityItems: NotificationFeedItem[];
  copy: ReturnType<typeof getLocaleMessages<"routes">>["inbox"];
  onOpenActivityItem?: (item: NotificationFeedItem) => void;
  royaltyActivityItems: RoyaltyActivityItem[];
  royaltyActivityLoading?: boolean;
  royaltyClaimItems: RoyaltyClaimRecord[];
  royaltyClaimLoading?: boolean;
}) {
  const timelineItems = React.useMemo<NotificationTimelineEntry[]>(() => {
    const notificationEntries: NotificationTimelineEntry[] = activityItems.map((item) => ({
      item,
      key: item.event.event_id,
      timestamp: parseTimestamp(item.event.created_at),
      type: "notification",
    }));
    const royaltyActivityEntries: NotificationTimelineEntry[] = royaltyActivityItems.map((item) => ({
      item,
      key: item.event_id,
      timestamp: parseTimestamp(item.created_at),
      type: "royalty_activity",
    }));
    const royaltyClaimEntries: NotificationTimelineEntry[] = royaltyClaimItems.map((item) => ({
      item,
      key: item.claim_id,
      timestamp: parseTimestamp(item.claimed_at ?? item.created_at),
      type: "royalty_claim",
    }));

    return [...notificationEntries, ...royaltyActivityEntries, ...royaltyClaimEntries]
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [activityItems, royaltyActivityItems, royaltyClaimItems]);

  if (timelineItems.length === 0 && (royaltyActivityLoading || royaltyClaimLoading)) {
    return (
      <div className="px-5 py-8 text-center">
        <Type as="p" className="text-muted-foreground" variant="body">Loading notifications...</Type>
      </div>
    );
  }

  return (
    <div>
      {timelineItems.map((entry, index) => {
        if (entry.type === "notification") {
          const href = resolveNotificationActivityHref(entry.item);
          const context = formatEventContext(entry.item);
          const relativeTime = formatRelativeShort(entry.item.event.created_at);

          return (
            <div key={entry.key}>
              {index > 0 ? <Separator /> : null}
              <NotificationRow
                href={href}
                icon={getActivityIcon(entry.item)}
                media={getActivityMedia(entry.item)}
                meta={relativeTime || null}
                onClick={(event) => {
                  if (!href || !onOpenActivityItem) {
                    return;
                  }
                  event.preventDefault();
                  onOpenActivityItem(entry.item);
                }}
                subtext={context}
                title={formatEventLabel(entry.item, copy)}
                unread={!entry.item.receipt.read_at}
              />
            </div>
          );
        }

        if (entry.type === "royalty_activity") {
          const buyerProfile = (entry.item as RoyaltyActivityItem & { buyerProfile?: { href: string; label: string } | null }).buyerProfile ?? null;
          const buyer = buyerProfile?.label ?? formatCompactAddress(entry.item.buyer_wallet_address);
          const relativeTime = formatRelativeShort(entry.item.created_at);
          const amountLabel = `+$${formatWipAmount(entry.item.amount_wip_wei)} $WIP`;

          return (
            <div key={entry.key}>
              {index > 0 ? <Separator /> : null}
              <NotificationRow
                icon={Coins}
                meta={relativeTime || null}
                subtext={buyer ? `Purchased by ${buyer} · ${amountLabel}` : amountLabel}
                title={entry.item.title?.trim() || "Royalty earned"}
                unread={!entry.item.read_at}
              />
            </div>
          );
        }

        const txLabel = formatCompactHash(entry.item.tx_hash) ?? entry.item.tx_hash;
        const relativeTime = formatRelativeShort(entry.item.claimed_at ?? entry.item.created_at);
        const transactionHref = txHref(entry.item.tx_hash, entry.item.chain_id);
        const amountLabel = `$${formatWipAmount(entry.item.claimable_wip_wei_at_submission)} $WIP`;
        const statusLabel = entry.item.status === "confirmed"
          ? "Claim confirmed"
          : entry.item.status === "failed"
            ? "Claim failed"
            : "Claim submitted";

        return (
          <div key={entry.key}>
            {index > 0 ? <Separator /> : null}
            <NotificationRow
              href={transactionHref}
              icon={entry.item.status === "failed" ? WarningCircle : CheckCircle}
              meta={relativeTime || null}
              subtext={`Tx ${txLabel} · ${amountLabel}`}
              title={statusLabel}
            />
          </div>
        );
      })}
    </div>
  );
}

export function NotificationInboxPage({
  activityItems,
  loading = false,
  onOpenActivityItem,
  onVerifyTask,
  royaltyActivityItems = [],
  royaltyActivityLoading = false,
  royaltyClaimItems = [],
  royaltyClaimLoading = false,
  installPromoUnreadCount = 0,
  installPromoPreviewState,
  tasks,
  title,
}: {
  activityItems: NotificationFeedItem[];
  loading?: boolean;
  onOpenActivityItem?: (item: NotificationFeedItem) => void;
  onVerifyTask?: (task: UserTask) => void;
  royaltyActivityItems?: RoyaltyActivityItem[];
  royaltyActivityLoading?: boolean;
  royaltyClaimItems?: RoyaltyClaimRecord[];
  royaltyClaimLoading?: boolean;
  installPromoUnreadCount?: number;
  installPromoPreviewState?: "default" | "ios_instructions";
  tasks: UserTask[];
  title?: string;
}) {
  const { locale } = useUiLocale();
  const copy = React.useMemo(() => getLocaleMessages(locale, "routes").inbox, [locale]);
  const isMobile = useIsMobile();
  const hasTasks = tasks.length > 0;
  const hasActivity = activityItems.length > 0 || royaltyActivityItems.length > 0 || royaltyClaimItems.length > 0;
  const hasContent = hasTasks || hasActivity;

  return (
    <PageContainer className="flex min-w-0 flex-1 flex-col gap-6">
      <div className={cn(
        "flex min-w-0 flex-1 flex-col",
        isMobile ? "-mx-3 gap-0" : "overflow-hidden rounded-[var(--radius-2xl)] border border-border-soft bg-card",
      )}>
        {!isMobile && (
          <div className="flex items-center justify-between border-b border-border-soft px-5 py-5 md:px-6 md:py-6">
            <Type as="h1" variant="h2">{title ?? copy.notificationsTab}</Type>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[40vh] w-full flex-1 items-center justify-center" aria-busy="true">
            <Spinner className="size-6" />
          </div>
        ) : (
          <>
            <PwaInstallPromo
              title={copy.installPromoTitle}
              body={copy.installPromoBody}
              installLabel={copy.installPromoAction}
              iosInstructions={copy.installPromoIOSInstructions}
              surface="inbox"
              trigger="inbox"
              unreadCount={installPromoUnreadCount}
              previewState={installPromoPreviewState}
            />
            {hasContent ? (
              <>
                {hasTasks ? (
                  isMobile ? (
                    <SectionCard flat>
                      <NotificationTaskList
                        copy={copy}
                        onVerifyTask={onVerifyTask}
                        tasks={tasks}
                      />
                    </SectionCard>
                  ) : (
                    <div className={cn(hasActivity && "border-b border-border-soft")}>
                      <NotificationTaskList
                        copy={copy}
                        onVerifyTask={onVerifyTask}
                        tasks={tasks}
                      />
                    </div>
                  )
                ) : null}
                {hasActivity ? (
                  isMobile ? (
                    <SectionCard flat>
                      <div className="px-5 py-3">
                        <Type as="h2" variant="label" className="text-muted-foreground">
                          Recent activity
                        </Type>
                      </div>
                      <NotificationActivityList
                        activityItems={activityItems}
                        copy={copy}
                        onOpenActivityItem={onOpenActivityItem}
                        royaltyActivityItems={royaltyActivityItems}
                        royaltyActivityLoading={royaltyActivityLoading}
                        royaltyClaimItems={royaltyClaimItems}
                        royaltyClaimLoading={royaltyClaimLoading}
                      />
                    </SectionCard>
                  ) : (
                    <div>
                      <div className="px-5 py-3 md:px-6">
                        <Type as="h2" variant="label" className="text-muted-foreground">
                          Recent activity
                        </Type>
                      </div>
                      <NotificationActivityList
                        activityItems={activityItems}
                        copy={copy}
                        onOpenActivityItem={onOpenActivityItem}
                        royaltyActivityItems={royaltyActivityItems}
                        royaltyActivityLoading={royaltyActivityLoading}
                        royaltyClaimItems={royaltyClaimItems}
                        royaltyClaimLoading={royaltyClaimLoading}
                      />
                    </div>
                  )
                ) : null}
              </>
            ) : (
              isMobile ? (
                <Card className="rounded-none border-x-0 bg-transparent px-5 py-8 text-center shadow-none">
                  <Type as="p" className="text-muted-foreground" variant="body">{copy.emptyState}</Type>
                </Card>
              ) : (
                <div className="px-5 py-8 text-center">
                  <Type as="p" className="text-muted-foreground" variant="body">{copy.emptyState}</Type>
                </div>
              )
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
