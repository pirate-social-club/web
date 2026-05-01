"use client";

import * as React from "react";
import {
  Bell,
  CaretLeft,
  CaretRight,
  ChatCircleText,
  Coins,
  DeviceMobile,
  HandPalm,
  IdentificationCard,
  ShoppingCart,
  UserCircle,
  Users,
  type Icon,
} from "@phosphor-icons/react";
import type {
  NotificationFeedItem,
  RoyaltyActivityItem,
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
import { trackAnalyticsEvent } from "@/lib/analytics";
import { EmptyInboxState } from "@/components/states/empty-inbox-state";
import {
  dismissPromo,
  markPromoImpression,
  readPwaInstallRecord,
  shouldShowAutoPromo,
} from "@/lib/pwa/pwa-install-storage";
import { usePwaInstallPrompt } from "@/lib/pwa/use-pwa-install-prompt";
import { toast } from "@/components/primitives/sonner";

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
      return copy.taskUniqueHumanVerificationRequired;
    case "profile_completion_suggested":
      return copy.taskProfileCompletionSuggested;
    case "global_handle_cleanup_suggested":
      return copy.taskGlobalHandleCleanupSuggested;
    case "namespace_verification_required":
      return copy.taskNamespaceVerificationRequired;
    case "membership_review":
      return copy.taskMembershipReview;
    default:
      return type.replace(/_/g, " ");
  }
}

function formatTaskMeta(task: UserTask, copy: ReturnType<typeof getLocaleMessages<"routes">>["inbox"]): string | null {
  if (task.type === "unique_human_verification_required") {
    return copy.taskUniqueHumanVerificationMeta;
  }
  if (task.type === "profile_completion_suggested") {
    return copy.taskProfileCompletionMeta;
  }
  if (task.type === "global_handle_cleanup_suggested") {
    return copy.taskGlobalHandleCleanupMeta;
  }
  if (task.type === "membership_review") {
    const count = getMembershipReviewCount(task);
    return [
      task.payload?.community_display_name ? String(task.payload.community_display_name) : null,
      count != null ? copy.pendingCount.replace("{count}", String(count)) : null,
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

function formatRelativeShort(value: string | number): string {
  const timestamp = typeof value === "number" ? value * 1000 : Date.parse(value);
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

function unreadCountBucket(count: number | undefined): string | undefined {
  if (!Number.isFinite(count)) return undefined;
  const normalized = Math.max(0, Math.floor(count ?? 0));
  if (normalized === 0) return "0";
  if (normalized === 1) return "1";
  if (normalized <= 5) return "2_5";
  if (normalized <= 20) return "6_20";
  return "20_plus";
}

function isNotificationRead(item: NotificationFeedItem): boolean {
  return Boolean(item.receipt?.read_at);
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
      return copy.eventXmtpMessage.replace("{actor}", actorLabel);
    case "royalty_earned":
      return copy.eventRoyaltyEarned;
    default:
      return `${actorLabel} ${item.event.type.replace(/_/g, " ")}`;
  }
}

function formatEventContext(
  item: NotificationFeedItem,
  copy: ReturnType<typeof getLocaleMessages<"routes">>["inbox"],
): string | null {
  if (item.event.type === "royalty_earned") {
    const amount = payloadString(item.event.payload, "amount_wip_wei");
    const title = payloadString(item.event.payload, "title");
    const amountLabel = amount ? `+$${formatWipAmount(amount)} $WIP` : null;
    if (amountLabel && title) return copy.eventRoyaltyContext.replace("{amount}", amountLabel).replace("{title}", title);
    if (amountLabel) return copy.eventRoyaltyContextAmount.replace("{amount}", amountLabel);
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
    return item.event.subject_type === "post" ? `/p/${item.event.subject}` : null;
  }

  if (item.event.type === "xmtp_message") {
    return `/chat/c/${encodeURIComponent(item.event.subject)}`;
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
      return `/c/${task.subject}/mod/requests`;
    case "namespace_verification_required":
      return `/c/${task.subject}/mod/namespace`;
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
      className="h-10 w-10 border-none"
      fallback={actorName}
      fallbackSeed={item.event.actor_user ?? undefined}
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
    primary: "bg-muted text-foreground",
    warning: "bg-muted text-foreground",
    success: "bg-muted text-foreground",
    muted: "bg-muted text-foreground",
    foreground: "bg-muted text-foreground",
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
    <Card className={cn("overflow-hidden", flat && "rounded-none border-x-0 border-t-0 bg-transparent shadow-none")}>
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
  const { isRtl } = useUiLocale();
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
        </span>
        {(subtext || meta) ? (
          <Type as="span" className="block truncate text-muted-foreground" variant="body">
            {[subtext, meta].filter(Boolean).join(" · ")}
          </Type>
        ) : null}
      </span>
      {href || onClick ? (
        isRtl
          ? <CaretLeft aria-hidden className="size-5 shrink-0 text-muted-foreground" />
          : <CaretRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      ) : null}
    </>
  );
  const interactive = Boolean(href || onClick);
  const className = cn(
    "flex w-full items-center gap-3 px-5 py-4 text-start",
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
  onOpenPwaInstallTask,
  onVerifyTask,
  showPwaInstallTask,
  tasks,
}: {
  copy: ReturnType<typeof getLocaleMessages<"routes">>["inbox"];
  onOpenPwaInstallTask?: () => void;
  onVerifyTask?: (task: UserTask) => void;
  showPwaInstallTask?: boolean;
  tasks: UserTask[];
}) {
  return (
    <div>
      {showPwaInstallTask ? (
        <div>
          <NotificationRow
            icon={DeviceMobile}
            onClick={onOpenPwaInstallTask}
            subtext={copy.installPromoBody}
            title={copy.installPromoTitle}
          />
        </div>
      ) : null}
      {tasks.map((task, index) => {
        const href = resolveNotificationTaskHref(task);
        return (
          <div key={task.id}>
            {index > 0 || showPwaInstallTask ? <Separator /> : null}
            <NotificationRow
              icon={getTaskIcon(task)}
              onClick={href && onVerifyTask ? () => onVerifyTask(task) : undefined}
              subtext={formatTaskMeta(task, copy)}
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
;

function parseTimestamp(value: string | number | null | undefined): number {
  if (!value) return 0;
  if (typeof value === "number") return value * 1000;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function NotificationActivityList({
  activityItems,
  copy,
  onOpenActivityItem,
  royaltyActivityItems,
  royaltyActivityLoading,
}: {
  activityItems: NotificationFeedItem[];
  copy: ReturnType<typeof getLocaleMessages<"routes">>["inbox"];
  onOpenActivityItem?: (item: NotificationFeedItem) => void;
  royaltyActivityItems: RoyaltyActivityItem[];
  royaltyActivityLoading?: boolean;

}) {
  const timelineItems = React.useMemo<NotificationTimelineEntry[]>(() => {
    const notificationEntries: NotificationTimelineEntry[] = activityItems.map((item) => ({
      item,
      key: item.event.id,
      timestamp: parseTimestamp(item.event.created),
      type: "notification",
    }));
    const royaltyActivityEntries: NotificationTimelineEntry[] = royaltyActivityItems.map((item) => ({
      item,
      key: item.id,
      timestamp: parseTimestamp(item.created),
      type: "royalty_activity",
    }));
    return [...notificationEntries, ...royaltyActivityEntries]
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [activityItems, royaltyActivityItems]);

  if (timelineItems.length === 0 && royaltyActivityLoading) {
    return (
      <div className="px-5 py-8 text-center">
        <Type as="p" className="text-muted-foreground" variant="body">{copy.loadingNotifications}</Type>
      </div>
    );
  }

  return (
    <div>
      {timelineItems.map((entry, index) => {
        if (entry.type === "notification") {
          const href = resolveNotificationActivityHref(entry.item);
          const context = formatEventContext(entry.item, copy);
          const relativeTime = formatRelativeShort(entry.item.event.created);

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
                unread={!isNotificationRead(entry.item)}
              />
            </div>
          );
        }

        if (entry.type === "royalty_activity") {
          const buyerProfile = (entry.item as RoyaltyActivityItem & { buyerProfile?: { href: string; label: string } | null }).buyerProfile ?? null;
          const buyer = buyerProfile?.label ?? formatCompactAddress(entry.item.buyer_wallet_address);
          const relativeTime = formatRelativeShort(entry.item.created);
          const amountLabel = `+$${formatWipAmount(entry.item.amount_wip_wei)} $WIP`;

          return (
            <div key={entry.key}>
              {index > 0 ? <Separator /> : null}
              <NotificationRow
                icon={ShoppingCart}
                meta={relativeTime || null}
                subtext={buyer ? copy.royaltyPurchasedBy.replace("{buyer}", buyer).replace("{amount}", amountLabel) : amountLabel}
                title={entry.item.title?.trim() || copy.eventRoyaltyEarned}
                unread={!entry.item.read_at}
              />
            </div>
          );
        }


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

  installPromoUnreadCount?: number;
  installPromoPreviewState?: "default" | "ios_instructions";
  tasks: UserTask[];
  title?: string;
}) {
  const { locale } = useUiLocale();
  const copy = React.useMemo(() => getLocaleMessages(locale, "routes").inbox, [locale]);
  const isMobile = useIsMobile();
  const pwaPrompt = usePwaInstallPrompt();
  const [showPwaInstallTask, setShowPwaInstallTask] = React.useState(Boolean(installPromoPreviewState));
  const pwaInstallTaskViewedRef = React.useRef(false);

  React.useEffect(() => {
    if (installPromoPreviewState) {
      setShowPwaInstallTask(true);
      return;
    }
    if (pwaPrompt.isInstalled || !pwaPrompt.canPrompt) {
      setShowPwaInstallTask(false);
      return;
    }
    if (showPwaInstallTask) return;
    if (!shouldShowAutoPromo(readPwaInstallRecord())) return;

    markPromoImpression();
    setShowPwaInstallTask(true);
    if (!pwaInstallTaskViewedRef.current) {
      pwaInstallTaskViewedRef.current = true;
      trackAnalyticsEvent({
        eventName: "pwa_install_promo_viewed",
        properties: { surface: "inbox", trigger: "inbox_task", unread_count_bucket: unreadCountBucket(installPromoUnreadCount) },
      });
    }
  }, [installPromoPreviewState, installPromoUnreadCount, pwaPrompt.canPrompt, pwaPrompt.isInstalled, showPwaInstallTask]);

  const handleOpenPwaInstallTask = React.useCallback(() => {
    const platform = pwaPrompt.isIOS ? "ios_manual" : "chromium";
    trackAnalyticsEvent({
      eventName: "pwa_install_prompt_opened",
      properties: { surface: "inbox", platform },
    });

    if (pwaPrompt.isIOS || installPromoPreviewState === "ios_instructions") {
      pwaPrompt.promptInstallIOS("inbox");
      toast(copy.installPromoIOSInstructions);
      return;
    }

    void pwaPrompt.promptInstall("inbox").then((outcome) => {
      if (outcome === "accepted") {
        setShowPwaInstallTask(false);
      } else if (outcome === "dismissed") {
        dismissPromo("native_dismissed");
        setShowPwaInstallTask(false);
        trackAnalyticsEvent({
          eventName: "pwa_install_promo_dismissed",
          properties: { surface: "inbox", dismiss_reason: "native_dismissed" },
        });
      }
    });
  }, [copy.installPromoIOSInstructions, installPromoPreviewState, pwaPrompt]);

  const hasTasks = tasks.length > 0 || showPwaInstallTask;
  const hasActivity = activityItems.length > 0 || royaltyActivityItems.length > 0;
  const hasContent = hasTasks || hasActivity;

  return (
    <PageContainer className={cn("flex min-w-0 flex-1 flex-col gap-6", isMobile && "-mt-2")}>
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
            {hasContent ? (
              <>
                {hasTasks ? (
                  isMobile ? (
                    <SectionCard flat>
                      <NotificationTaskList
                        copy={copy}
                        onOpenPwaInstallTask={handleOpenPwaInstallTask}
                        onVerifyTask={onVerifyTask}
                        showPwaInstallTask={showPwaInstallTask}
                        tasks={tasks}
                      />
                    </SectionCard>
                  ) : (
                    <div className={cn(hasActivity && "border-b border-border-soft")}>
                      <NotificationTaskList
                        copy={copy}
                        onOpenPwaInstallTask={handleOpenPwaInstallTask}
                        onVerifyTask={onVerifyTask}
                        showPwaInstallTask={showPwaInstallTask}
                        tasks={tasks}
                      />
                    </div>
                  )
                ) : null}
                {hasActivity ? (
                  isMobile ? (
                    <SectionCard flat>
                      <NotificationActivityList
                        activityItems={activityItems}
                        copy={copy}
                        onOpenActivityItem={onOpenActivityItem}
                        royaltyActivityItems={royaltyActivityItems}
                        royaltyActivityLoading={royaltyActivityLoading}
                      />
                    </SectionCard>
                  ) : (
                    <div>
                      <NotificationActivityList
                        activityItems={activityItems}
                        copy={copy}
                        onOpenActivityItem={onOpenActivityItem}
                        royaltyActivityItems={royaltyActivityItems}
                        royaltyActivityLoading={royaltyActivityLoading}
                      />
                    </div>
                  )
                ) : null}
              </>
            ) : (
              <div className="flex flex-1 flex-col justify-center">
                <EmptyInboxState description={copy.emptyState} />
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
