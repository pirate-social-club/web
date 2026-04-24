"use client";

import * as React from "react";
import type {
  NotificationFeedItem,
  UserTask,
} from "@pirate/api-contracts";

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
    case "membership_review":
      return "Membership requests";
    default:
      return type.replace(/_/g, " ");
  }
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
    default:
      return `${actorLabel} ${item.event.type.replace(/_/g, " ")}`;
  }
}

function formatEventMeta(item: NotificationFeedItem, localeTag: string): string {
  const communityLabel = payloadString(item.event.payload, "community_display_name")
    ?? payloadString(item.event.payload, "community_id");
  const dateLabel = new Date(item.event.created_at).toLocaleDateString(localeTag);
  return [communityLabel, dateLabel].filter(Boolean).join(" · ");
}

function formatEventContext(item: NotificationFeedItem): string | null {
  return payloadString(item.event.payload, "comment_excerpt")
    ?? payloadString(item.event.payload, "post_title")
    ?? payloadString(item.event.payload, "context_label");
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

  return null;
}

function SectionCard({
  children,
  flat = false,
  title,
}: {
  children: React.ReactNode;
  flat?: boolean;
  title: string;
}) {
  return (
    <Card className={cn("overflow-hidden", flat && "rounded-none border-x-0 bg-transparent shadow-none")}>
      <div className={cn("border-b border-border-soft px-5 py-4", flat && "px-3")}>
        <Type as="h2" variant="h4">{title}</Type>
      </div>
      {children}
    </Card>
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

  return (
    <PageContainer className={cn("flex min-w-0 flex-1 flex-col", isMobile ? "gap-4" : "gap-6")}>
      {isMobile ? (
        null
      ) : (
        <CardShell className="px-5 py-5 md:px-6 md:py-6">
          <Type as="h1" variant="h2">{title ?? copy.title}</Type>
        </CardShell>
      )}

      <div className={cn("flex flex-col gap-4", isMobile && "-mx-3 gap-0")}>
        {loading ? (
          <Card className={cn("px-5 py-8 text-center text-muted-foreground", isMobile && "rounded-none border-x-0 bg-transparent shadow-none")}>
            {copy.loading}
          </Card>
        ) : !hasTasks && !hasActivity ? (
          <Card className={cn("px-5 py-8 text-center text-muted-foreground", isMobile && "rounded-none border-x-0 bg-transparent shadow-none")}>
            {copy.emptyState}
          </Card>
        ) : (
          <>
            {hasTasks ? (
              <SectionCard flat={isMobile} title={copy.taskActionNeeded}>
                <div>
                  {tasks.map((task, index) => (
                    <div key={task.task_id}>
                      {index > 0 ? <Separator /> : null}
                      <div className={cn("flex items-center gap-4 px-5 py-4", isMobile && "flex-col items-stretch px-3")}>
                        <div className="min-w-0 flex-1">
                          <Type as="p" variant="label" className="">{formatTaskLabel(task.type, copy)}</Type>
                          {task.type === "membership_review" ? (
                            <p className="text-base text-muted-foreground">
                              {[
                                task.payload?.community_display_name ? String(task.payload.community_display_name) : null,
                                getMembershipReviewCount(task) != null ? `${getMembershipReviewCount(task)} pending` : null,
                              ].filter(Boolean).join(" · ")}
                            </p>
                          ) : task.payload?.community_display_name ? (
                            <p className="text-base text-muted-foreground">{String(task.payload.community_display_name)}</p>
                          ) : null}
                        </div>
                        {task.type === "namespace_verification_required" ? (
                          <Button className={cn(isMobile && "w-full")} onClick={() => onVerifyTask?.(task)} variant="secondary">
                            {copy.taskVerify}
                          </Button>
                        ) : task.type === "membership_review" ? (
                          <Button className={cn(isMobile && "w-full")} onClick={() => onVerifyTask?.(task)} variant="secondary">
                            Review
                          </Button>
                        ) : null}
                        {task.type === "membership_review" ? null : (
                          <Button className={cn(isMobile && "w-full")} onClick={() => onDismissTask?.(task)} variant="ghost">
                            {copy.taskDismiss}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {hasActivity ? (
              <SectionCard flat={isMobile} title={copy.recentActivity}>
                <div>
                  {activityItems.map((item, index) => {
                    const href = resolveNotificationActivityHref(item);
                    const context = formatEventContext(item);

                    return (
                      <div key={item.event.event_id}>
                        {index > 0 ? <Separator /> : null}
                        <a
                          className={cn("block px-5 py-4 transition-colors hover:bg-muted/30", isMobile && "px-3")}
                          href={href ?? undefined}
                          onClick={(event) => {
                            if (!href || !onOpenActivityItem) {
                              return;
                            }
                            event.preventDefault();
                            onOpenActivityItem(item);
                          }}
                        >
                          <div className="space-y-1.5">
                            <p className={`text-base text-foreground ${!item.receipt.read_at ? "font-semibold" : "font-medium"}`}>
                              {formatEventLabel(item, copy)}
                            </p>
                            {context ? (
                              <p className="text-base leading-6 text-muted-foreground">{context}</p>
                            ) : null}
                            <p className="text-base text-muted-foreground">{formatEventMeta(item, localeTag)}</p>
                          </div>
                        </a>
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
