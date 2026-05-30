"use client";

import * as React from "react";

import { CreatePostPage } from "@/app/authenticated-routes/create-post-route";
import { PublicCommunityRoutePage } from "@/app/public-community-route";
import { navigate } from "@/app/router";
import { Button } from "@/components/primitives/button";
import { PageContainer } from "@/components/primitives/layout-shell";
import { Type } from "@/components/primitives/type";
import { resolveApiUrl } from "@/lib/api/base-url";
import { setSession } from "@/lib/api/session-store";

type TelegramWebAppBridge = {
  close?: () => void;
  expand?: () => void;
  initData?: string;
  ready?: () => void;
};

type TelegramOnboardingExchangeResponse = Parameters<typeof setSession>[0] & {
  community: string;
  eligibility?: {
    status?: string;
  };
  membership_result?: {
    status?: string;
  } | null;
  telegram_join_request?: {
    status?: string;
  };
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebAppBridge;
    };
  }
}

export function TelegramMiniAppHomePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <PageContainer size="narrow">
        <section className="flex min-h-[70svh] flex-col justify-center gap-6">
          <div className="space-y-3">
            <Type as="p" variant="overline">Telegram Mini App</Type>
            <Type as="h1" variant="h1">Pirate communities</Type>
            <Type as="p" variant="body">
              Read public community posts inside Telegram. Verified participation can come later.
            </Type>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/")}>Open feed</Button>
            <Button onClick={() => navigate("/popular")} variant="secondary">Popular</Button>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}

function exchangeStatusText(response: TelegramOnboardingExchangeResponse | null): string {
  if (!response) {
    return "Linking your Telegram account...";
  }
  if (response.telegram_join_request?.status === "approved") {
    return "Telegram is linked and your group join request was approved. Return to Telegram.";
  }
  if (response.membership_result?.status === "joined" || response.eligibility?.status === "already_joined") {
    return "Telegram is linked. Return to Telegram and message the community bot again.";
  }
  if (response.eligibility?.status === "verification_required") {
    return "Telegram is linked. This community still needs verification before access can be approved.";
  }
  return "Telegram is linked. Return to Telegram to continue.";
}

export function TelegramMiniAppExchangePage() {
  const [status, setStatus] = React.useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = React.useState("Linking your Telegram account...");
  const [exchangeResponse, setExchangeResponse] = React.useState<TelegramOnboardingExchangeResponse | null>(null);

  React.useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();

    const token = new URL(window.location.href).searchParams.get("token")?.trim();
    const initData = webApp?.initData?.trim();
    if (!token) {
      setStatus("error");
      setMessage("Telegram onboarding link is missing its token.");
      return;
    }
    if (!initData) {
      setStatus("error");
      setMessage("Open this link from Telegram to finish linking.");
      return;
    }

    const controller = new AbortController();
    void fetch(resolveApiUrl("/telegram/session/exchange"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, init_data: initData }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as TelegramOnboardingExchangeResponse | { message?: string } | null;
        if (!response.ok) {
          throw new Error(body && "message" in body && typeof body.message === "string"
            ? body.message
            : "Could not link Telegram.");
        }
        const exchange = body as TelegramOnboardingExchangeResponse;
        setSession(exchange);
        setExchangeResponse(exchange);
        setMessage(exchangeStatusText(exchange));
        setStatus("success");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Could not link Telegram.");
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <PageContainer size="narrow">
        <section className="flex min-h-[70svh] flex-col justify-center gap-6">
          <div className="space-y-3">
            <Type as="p" variant="overline">Telegram Mini App</Type>
            <Type as="h1" variant="h1">
              {status === "success" ? "Telegram linked" : status === "error" ? "Link failed" : "Linking Telegram"}
            </Type>
            <Type as="p" variant="body">{message}</Type>
          </div>
          <div className="flex flex-wrap gap-3">
            {status === "success" && exchangeResponse ? (
              <Button onClick={() => window.Telegram?.WebApp?.close?.()}>Return to Telegram</Button>
            ) : null}
            {status === "error" ? (
              <Button onClick={() => navigate("/tg")} variant="secondary">Open Telegram home</Button>
            ) : null}
          </div>
        </section>
      </PageContainer>
    </main>
  );
}

export function TelegramMiniAppCommunityPage({
  communityId,
}: {
  communityId: string;
}) {
  return (
    <main className="min-h-screen bg-background px-3 pb-8 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <PublicCommunityRoutePage
        buildCreatePostPath={(community) => `/tg/c/${encodeURIComponent(community.route_slug ?? community.id)}/submit`}
        communityId={communityId}
        disableCanonicalRouteReplace
      />
    </main>
  );
}

export function TelegramMiniAppCreatePostPage({
  communityId,
}: {
  communityId: string;
}) {
  const communityPath = `/tg/c/${encodeURIComponent(communityId)}`;

  return (
    <main className="min-h-screen bg-background px-3 pb-8 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <CreatePostPage
        buildPostPath={(postId) => `/tg/p/${encodeURIComponent(postId)}`}
        communityId={communityId}
        communityPath={communityPath}
      />
    </main>
  );
}
