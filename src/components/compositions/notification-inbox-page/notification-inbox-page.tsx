"use client";

import * as React from "react";
import type {
  NotificationFeedItem,
  UserTask,
} from "@pirate/api-contracts";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Separator } from "@/components/primitives/separator";
import { useUiLocale } from "@/lib/ui-locale";
import { resolveLocaleLanguageTag } from "@/lib/ui-locale-core";
import { getLocaleMessages } from "@/locales";

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
    default:
      return type.replace(/_/g, " ");
  }
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
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border-soft px-5 py-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
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
  const hasTasks = tasks.length > 0;
  const hasActivity = activityItems.length > 0;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5 md:px-6 md:py-6">
        <div className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title ?? copy.title}</div>
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <Card className="px-5 py-8 text-center text-muted-foreground">
            {copy.loading}
          </Card>
        ) : !hasTasks && !hasActivity ? (
          <Card className="px-5 py-8 text-center text-muted-foreground">
            {copy.emptyState}
          </Card>
        ) : (
          <>
            {hasTasks ? (
              <SectionCard title={copy.taskActionNeeded}>
                <div>
                  {tasks.map((task, index) => (
                    <div key={task.task_id}>
                      {index > 0 ? <Separator /> : null}
                      <div className="flex items-center gap-4 px-5 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-medium text-foreground">{formatTaskLabel(task.type, copy)}</p>
                          {task.payload?.community_display_name ? (
                            <p className="text-base text-muted-foreground">{String(task.payload.community_display_name)}</p>
                          ) : null}
                        </div>
                        {task.type === "namespace_verification_required" ? (
                          <Button onClick={() => onVerifyTask?.(task)} variant="secondary">
                            {copy.taskVerify}
                          </Button>
                        ) : null}
                        <Button onClick={() => onDismissTask?.(task)} variant="ghost">
                          {copy.taskDismiss}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {hasActivity ? (
              <SectionCard title={copy.recentActivity}>
                <div>
                  {activityItems.map((item, index) => {
                    const href = resolveNotificationActivityHref(item);
                    const context = formatEventContext(item);

                    return (
                      <div key={item.event.event_id}>
                        {index > 0 ? <Separator /> : null}
                        <a
                          className="block px-5 py-4 transition-colors hover:bg-muted/30"
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
    </section>
  );
}
