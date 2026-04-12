"use client";

import * as React from "react";

import { PostCard } from "@/components/compositions/post-card/post-card";
import type { PostCardProps } from "@/components/compositions/post-card/post-card.types";
import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/primitives/card";
import { ContentWithRail } from "@/components/primitives/content-with-rail";
import { OptionCard } from "@/components/primitives/option-card";
import { Textarea } from "@/components/primitives/textarea";
import type {
  PirateApiModerationActionType,
  PirateApiModerationCaseDetail,
  PirateApiPost,
} from "@/lib/pirate-api";

type ActionDescriptor = {
  type: PirateApiModerationActionType;
  title: string;
  description: string;
};

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return date.toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
}

function formatActionLabel(actionType: PirateApiModerationActionType): string {
  switch (actionType) {
    case "age_gate":
      return "Age gate";
    default:
      return actionType[0]?.toUpperCase() + actionType.slice(1);
  }
}

function formatReportReason(reasonCode: string): string {
  return reasonCode
    .split("_")
    .map((token) => token[0]?.toUpperCase() + token.slice(1))
    .join(" ");
}

function formatOpenedByLabel(openedBy: PirateApiModerationCaseDetail["case"]["opened_by"]): string {
  switch (openedBy) {
    case "platform_analysis":
      return "Platform analysis";
    case "user_report":
      return "User reports";
    case "mixed":
      return "Mixed inputs";
    default:
      return openedBy;
  }
}

function formatQueueScopeLabel(scope: PirateApiModerationCaseDetail["case"]["queue_scope"]): string {
  return scope === "platform" ? "Platform floor" : "Community queue";
}

function formatMaskedUserRoleLabel(kind: "reporter" | "moderator"): string {
  return kind === "reporter" ? "Member account" : "Moderator account";
}

function describeStatusTransition(action: PirateApiModerationCaseDetail["actions"][number]): string | null {
  if (
    !action.previous_post_status
    || !action.next_post_status
    || action.previous_post_status === action.next_post_status
  ) {
    return null;
  }

  return `${action.previous_post_status} -> ${action.next_post_status}`;
}

function getAvailableActions(post: PirateApiPost): ActionDescriptor[] {
  const actions: ActionDescriptor[] = [
    {
      type: "dismiss",
      title: "Dismiss",
      description: "Close the case without changing the post.",
    },
  ];

  if (post.status !== "hidden") {
    actions.push({
      type: "hide",
      title: "Hide",
      description: "Keep the post off the public feed while preserving it.",
    });
  }

  if (post.status !== "removed") {
    actions.push({
      type: "remove",
      title: "Remove",
      description: "Remove the post from normal circulation and resolve the case.",
    });
  }

  if (post.status !== "published") {
    actions.push({
      type: "restore",
      title: "Restore",
      description: "Return the post to its last visible state allowed by the product rules.",
    });
  }

  if (post.age_gate_policy !== "18_plus") {
    actions.push({
      type: "age_gate",
      title: "Age gate",
      description: "Keep the post published, but restrict it to adult-eligible viewers.",
    });
  }

  return actions;
}

export interface CommunityModerationCaseDetailProps {
  detail: PirateApiModerationCaseDetail;
  post: PostCardProps;
  onResolve: (input: {
    actionType: PirateApiModerationActionType;
    note: string;
  }) => Promise<void> | void;
  resolving?: boolean;
}

export function CommunityModerationCaseDetail({
  detail,
  post,
  onResolve,
  resolving = false,
}: CommunityModerationCaseDetailProps) {
  const availableActions = React.useMemo(() => getAvailableActions(detail.post), [detail.post]);
  const [actionType, setActionType] = React.useState<PirateApiModerationActionType>(
    availableActions[0]?.type ?? "dismiss",
  );
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    setActionType(availableActions[0]?.type ?? "dismiss");
    setNote("");
  }, [detail.case.moderation_case_id, availableActions]);

  return (
    <ContentWithRail
      rail={(
        <div className="space-y-4">
          <Card className="rounded-[var(--radius-3xl)] border-border-soft bg-card shadow-none">
            <CardHeader className="gap-2">
              <CardTitle className="text-2xl font-semibold text-foreground">Case summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-base text-foreground">Status: {detail.case.status}</div>
              <div className="text-base text-foreground">Priority: {detail.case.priority}</div>
              <div className="text-base text-foreground">Queue: {formatQueueScopeLabel(detail.case.queue_scope)}</div>
              <div className="text-base text-foreground">Opened by: {formatOpenedByLabel(detail.case.opened_by)}</div>
              <div className="text-base text-foreground">Reports: {detail.reports.length}</div>
              <div className="text-base text-foreground">Signals: {detail.signals.length}</div>
              <div className="text-base text-foreground">Actions: {detail.actions.length}</div>
              <div className="text-base text-muted-foreground">
                Updated {formatTimestamp(detail.case.updated_at)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      railSticky
      railWidth="23rem"
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[var(--radius-3xl)] border border-border-soft bg-card">
          <PostCard {...post} className="border-b-0" />
        </div>

        {detail.case.status === "open" ? (
          <Card className="rounded-[var(--radius-3xl)] border-border-soft bg-card shadow-none">
            <CardHeader className="gap-2">
              <CardTitle className="text-2xl font-semibold text-foreground">Resolve case</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {availableActions.map((item) => (
                  <OptionCard
                    className="rounded-[var(--radius-xl)]"
                    description={item.description}
                    key={item.type}
                    onClick={() => setActionType(item.type)}
                    selected={actionType === item.type}
                    title={item.title}
                  />
                ))}
              </div>

              <div className="space-y-2">
                <div className="text-base font-semibold text-foreground">Moderator note</div>
                <Textarea
                  maxLength={500}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional note for the action log."
                  value={note}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  loading={resolving}
                  onClick={() => void onResolve({ actionType, note })}
                >
                  Resolve case
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-[var(--radius-3xl)] border-border-soft bg-card shadow-none">
            <CardHeader className="gap-2">
              <CardTitle className="text-2xl font-semibold text-foreground">Case resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-7 text-muted-foreground">
                This case is closed. The action log below shows how the post changed.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-[var(--radius-3xl)] border-border-soft bg-card shadow-none">
          <CardHeader className="gap-2">
            <CardTitle className="text-2xl font-semibold text-foreground">User reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.reports.length === 0 ? (
              <p className="text-base leading-7 text-muted-foreground">No direct member reports are attached to this case.</p>
            ) : (
              detail.reports.map((report) => (
                <div
                  className="rounded-[var(--radius-xl)] border border-border-soft bg-background px-4 py-4"
                  key={report.user_report_id}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="text-lg font-semibold text-foreground">
                        {formatReportReason(report.reason_code)}
                      </div>
                      <div className="text-base text-muted-foreground">
                        {formatMaskedUserRoleLabel("reporter")}
                      </div>
                    </div>
                    <div className="text-base text-muted-foreground">{formatTimestamp(report.created_at)}</div>
                  </div>
                  {report.note ? (
                    <p className="mt-3 text-base leading-7 text-foreground/88">{report.note}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[var(--radius-3xl)] border-border-soft bg-card shadow-none">
          <CardHeader className="gap-2">
            <CardTitle className="text-2xl font-semibold text-foreground">Platform signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.signals.length === 0 ? (
              <p className="text-base leading-7 text-muted-foreground">No platform analysis signals are attached to this case.</p>
            ) : (
              detail.signals.map((signal) => (
                <div
                  className="rounded-[var(--radius-xl)] border border-border-soft bg-background px-4 py-4"
                  key={signal.moderation_signal_id}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="text-lg font-semibold text-foreground">
                        {signal.provider_label}
                      </div>
                      <div className="text-base text-muted-foreground">
                        {signal.signal_type} · {signal.severity}
                      </div>
                    </div>
                    <div className="text-base text-muted-foreground">{formatTimestamp(signal.created_at)}</div>
                  </div>
                  {signal.analysis_result_ref ? (
                    <div className="mt-3 text-base text-muted-foreground">
                      Analysis {signal.analysis_result_ref}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[var(--radius-3xl)] border-border-soft bg-card shadow-none">
          <CardHeader className="gap-2">
            <CardTitle className="text-2xl font-semibold text-foreground">Action log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.actions.length === 0 ? (
              <p className="text-base leading-7 text-muted-foreground">No moderator actions have been recorded yet.</p>
            ) : (
              detail.actions.map((action) => {
                const transition = describeStatusTransition(action);

                return (
                  <div
                    className="rounded-[var(--radius-xl)] border border-border-soft bg-background px-4 py-4"
                    key={action.moderation_action_id}
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="text-lg font-semibold text-foreground">
                          {formatActionLabel(action.action_type)}
                        </div>
                        <div className="text-base text-muted-foreground">
                          {formatMaskedUserRoleLabel("moderator")}
                        </div>
                      </div>
                      <div className="text-base text-muted-foreground">{formatTimestamp(action.created_at)}</div>
                    </div>
                    {transition ? (
                      <div className="mt-3 text-base text-foreground/88">{transition}</div>
                    ) : null}
                    {action.note ? (
                      <p className="mt-3 text-base leading-7 text-foreground/88">{action.note}</p>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </ContentWithRail>
  );
}
