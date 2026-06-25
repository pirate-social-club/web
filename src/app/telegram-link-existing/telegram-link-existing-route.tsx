"use client";

import * as React from "react";

import {
  AuthRequiredRouteState,
  FullPageSpinner,
  StackPageShell,
  StatusCard,
} from "@/app/authenticated-helpers/route-shell";
import { Button } from "@/components/primitives/button";
import { PageContainer } from "@/components/primitives/layout-shell";
import { Type } from "@/components/primitives/type";
import { resolveApiUrl } from "@/lib/api/base-url";
import { useSession } from "@/lib/api/session-store";
import { getErrorMessage } from "@/lib/error-utils";

type TelegramLinkIntentStatus =
  | "pending"
  | "completing"
  | "completed"
  | "failed"
  | "expired"
  | "superseded"
  | "canceled";

type TelegramLinkIntentResource = {
  id: string;
  object: "telegram_link_intent";
  community: {
    id: string;
    display_name: string | null;
  };
  status: TelegramLinkIntentStatus;
  expires_at: number;
  completed_at?: number;
  telegram_user_id: string;
  telegram_user: {
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    photo_url: string | null;
  };
  csrf_token?: string;
};

type TelegramLinkExistingState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; error?: string | null; resource: TelegramLinkIntentResource }
  | { kind: "confirming"; resource: TelegramLinkIntentResource }
  | { kind: "success"; resource: TelegramLinkIntentResource }
  | { kind: "error"; message: string };

function readTokenFromLocation(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
}

function resolveTelegramLabel(resource: TelegramLinkIntentResource): string {
  const user = resource.telegram_user;
  if (user.username?.trim()) {
    return `@${user.username.trim()}`;
  }
  const displayName = [user.first_name, user.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return displayName || `Telegram ${resource.telegram_user_id}`;
}

function resolveCommunityLabel(resource: TelegramLinkIntentResource): string {
  return resource.community.display_name?.trim() || resource.community.id;
}

function secondsRemaining(expiresAt: number, nowMs: number): number {
  return Math.max(0, Math.ceil((expiresAt * 1000 - nowMs) / 1000));
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

async function readJson(response: Response): Promise<unknown> {
  return await response.json().catch(() => null);
}

function messageFromApiBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }
  const error = record.error;
  if (error && typeof error === "object") {
    const errorRecord = error as Record<string, unknown>;
    if (typeof errorRecord.message === "string" && errorRecord.message.trim()) {
      return errorRecord.message.trim();
    }
  }
  return null;
}

function isTelegramLinkIntentResource(value: unknown): value is TelegramLinkIntentResource {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.object === "telegram_link_intent"
    && typeof record.id === "string"
    && typeof record.status === "string"
    && typeof record.expires_at === "number"
    && typeof record.telegram_user_id === "string"
    && typeof record.community === "object"
    && record.community !== null
    && typeof record.telegram_user === "object"
    && record.telegram_user !== null;
}

async function fetchLinkIntent(token: string, accessToken: string): Promise<TelegramLinkIntentResource> {
  const response = await fetch(resolveApiUrl(`/telegram/link-intents/${encodeURIComponent(token)}`), {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(messageFromApiBody(body) ?? "Could not load this Telegram link.");
  }
  if (!isTelegramLinkIntentResource(body)) {
    throw new Error("Telegram link response was invalid.");
  }
  return body;
}

async function completeLinkIntent(input: {
  accessToken: string;
  csrfToken: string;
  token: string;
}): Promise<TelegramLinkIntentResource> {
  const response = await fetch(resolveApiUrl(`/telegram/link-intents/${encodeURIComponent(input.token)}/complete`), {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      "x-csrf-token": input.csrfToken,
    },
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(messageFromApiBody(body) ?? "Could not link this Telegram account.");
  }
  if (!isTelegramLinkIntentResource(body)) {
    throw new Error("Telegram link response was invalid.");
  }
  return body;
}

function IntentSummary({ resource }: { resource: TelegramLinkIntentResource }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Type as="p" variant="overline">Telegram</Type>
          <Type as="p" variant="body-strong">{resolveTelegramLabel(resource)}</Type>
        </div>
        <div>
          <Type as="p" variant="overline">Community</Type>
          <Type as="p" variant="body-strong">{resolveCommunityLabel(resource)}</Type>
        </div>
      </div>
    </div>
  );
}

export function TelegramLinkExistingRoutePage() {
  const session = useSession();
  const [token, setToken] = React.useState(readTokenFromLocation);
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [state, setState] = React.useState<TelegramLinkExistingState>({ kind: "idle" });

  React.useEffect(() => {
    setToken(readTokenFromLocation());
  }, []);

  React.useEffect(() => {
    if (!session?.accessToken || !token) return;
    let canceled = false;
    setState({ kind: "loading" });
    void fetchLinkIntent(token, session.accessToken)
      .then((resource) => {
        if (!canceled) {
          setState({ kind: "ready", resource });
        }
      })
      .catch((error) => {
        if (!canceled) {
          setState({
            kind: "error",
            message: getErrorMessage(error, "Could not load this Telegram link."),
          });
        }
      });
    return () => {
      canceled = true;
    };
  }, [session?.accessToken, token]);

  React.useEffect(() => {
    if (state.kind !== "ready" && state.kind !== "confirming") return;
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [state.kind]);

  const confirm = React.useCallback(async () => {
    if (!session?.accessToken || !token || state.kind !== "ready") return;
    if (!state.resource.csrf_token) {
      setState({ ...state, error: "Refresh this page to continue." });
      return;
    }
    if (secondsRemaining(state.resource.expires_at, Date.now()) <= 0) {
      setState({ ...state, error: "This Telegram link expired. Return to Telegram and try again." });
      return;
    }
    setState({ kind: "confirming", resource: state.resource });
    try {
      const resource = await completeLinkIntent({
        accessToken: session.accessToken,
        csrfToken: state.resource.csrf_token,
        token,
      });
      setState({ kind: "success", resource });
    } catch (error) {
      setState({
        kind: "ready",
        resource: state.resource,
        error: getErrorMessage(error, "Could not link this Telegram account."),
      });
    }
  }, [session?.accessToken, state, token]);

  if (!session) {
    return (
      <AuthRequiredRouteState
        description="Sign in to link Telegram to your existing Pirate account."
        title="Link Telegram"
      />
    );
  }

  if (!token) {
    return (
      <section className="flex min-w-0 flex-1 flex-col justify-center">
        <PageContainer className="py-8" size="narrow">
          <StackPageShell headerVariant="plain" title="Link Telegram">
            <StatusCard
              description="This link is missing a token. Return to Telegram and start again."
              flatOnMobile
              title="Link unavailable"
              tone="warning"
            />
          </StackPageShell>
        </PageContainer>
      </section>
    );
  }

  if (state.kind === "idle" || state.kind === "loading") {
    return <FullPageSpinner />;
  }

  if (state.kind === "error") {
    return (
      <section className="flex min-w-0 flex-1 flex-col justify-center">
        <PageContainer className="py-8" size="narrow">
          <StackPageShell headerVariant="plain" title="Link Telegram">
            <StatusCard
              description={state.message}
              flatOnMobile
              title="Link unavailable"
              tone="warning"
            />
          </StackPageShell>
        </PageContainer>
      </section>
    );
  }

  const resource = state.resource;
  const remainingSeconds = secondsRemaining(resource.expires_at, nowMs);
  const expired = remainingSeconds <= 0 || resource.status === "expired";
  const pending = resource.status === "pending";
  const canConfirm = state.kind === "ready" && pending && !expired;
  const isConfirming = state.kind === "confirming";

  if (state.kind === "success" || resource.status === "completed") {
    return (
      <section className="flex min-w-0 flex-1 flex-col justify-center">
        <PageContainer className="py-8" size="narrow">
          <StackPageShell headerVariant="plain" title="Telegram linked">
            <div className="flex flex-col gap-4">
              <IntentSummary resource={resource} />
              <StatusCard
                description="Telegram is linked to this Pirate account. Return to Telegram and send /start."
                flatOnMobile
                title="Linked"
                tone="success"
              />
            </div>
          </StackPageShell>
        </PageContainer>
      </section>
    );
  }

  const unavailableDescription = expired
    ? "This Telegram link expired. Return to Telegram and start again."
    : resource.status === "superseded"
      ? "A newer Telegram link exists. Return to Telegram and use the latest link."
      : resource.status === "failed"
        ? "This Telegram link could not be completed. Return to Telegram and start again."
        : resource.status === "canceled"
          ? "This Telegram link was canceled. Return to Telegram and start again."
          : null;

  return (
    <section className="flex min-w-0 flex-1 flex-col justify-center">
      <PageContainer className="py-8" size="narrow">
        <StackPageShell
          description="Confirm that this Telegram account should use your current Pirate account."
          headerVariant="plain"
          title="Link Telegram"
        >
          <div className="flex flex-col gap-4">
            <IntentSummary resource={resource} />
            {unavailableDescription ? (
              <StatusCard
                description={unavailableDescription}
                flatOnMobile
                title="Link unavailable"
                tone="warning"
              />
            ) : (
              <StatusCard
                actions={(
                  <Button disabled={!canConfirm} loading={isConfirming} onClick={confirm}>
                    Link Telegram
                  </Button>
                )}
                description={`This link expires in ${formatCountdown(remainingSeconds)}.`}
                flatOnMobile
                title="Ready to link"
              />
            )}
            {state.kind === "ready" && state.error ? (
              <StatusCard
                description={state.error}
                flatOnMobile
                title="Could not link"
                tone="warning"
              />
            ) : null}
          </div>
        </StackPageShell>
      </PageContainer>
    </section>
  );
}
