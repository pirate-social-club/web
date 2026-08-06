"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { PageContainer } from "@/components/primitives/layout-shell";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";

import type {
  TelegramVerifyLaunchProvider,
  TelegramVerifyScreenState,
} from "./telegram-mini-app-verify-controller";
import type { HumanVerificationProvider } from "@/lib/identity-gates";

export type TelegramVerifyViewModel = {
  busy: boolean;
  message: string | null;
  showSpinner: boolean;
  title: string;
};

function telegramVerifyPreparingMessage(provider: TelegramVerifyLaunchProvider): string {
  switch (provider) {
    case "zkpassport":
      return "Opening ZKPassport";
    case "very":
      return "Opening verification";
    case "self":
      return "Opening Self.xyz";
  }
}

export function telegramVerifyReadyTitle(provider?: TelegramVerifyLaunchProvider | null): string {
  switch (provider) {
    case "zkpassport":
      return "Verify with ZKPassport";
    case "self":
      return "Verify to join";
    case "very":
      return "Verify identity";
    default:
      return "Verify to join";
  }
}

export function telegramVerifyWaitingTitle(): string {
  return "Waiting for verification";
}

export function telegramVerifyReadyMessage(provider?: TelegramVerifyLaunchProvider | null): string {
  switch (provider) {
    case "zkpassport":
      return "Use the ZKPassport App to continue.";
    case "self":
      return "Use the Self.xyz App to continue.";
    case "very":
      return "Open identity verification to continue.";
    default:
      return "Open verification to continue.";
  }
}

export function telegramVerifyWaitingMessage(provider?: TelegramVerifyLaunchProvider | null): string {
  switch (provider) {
    case "zkpassport":
      return "Complete verification in the ZKPassport App. Pirate will update automatically.";
    case "self":
      return "Complete verification in the Self.xyz App. Pirate will update automatically.";
    case "very":
      return "Complete verification. Pirate will update automatically.";
    default:
      return "Complete verification. Pirate will update automatically.";
  }
}

export function telegramVerifyLaunchButtonLabel(provider: TelegramVerifyLaunchProvider): string {
  switch (provider) {
    case "zkpassport":
      return "Open ZKPassport";
    case "self":
      return "Open Self.xyz";
    case "very":
      return "Open Very";
  }
}

export function resolveTelegramVerifyViewModel({
  providerBusy = false,
  screen,
}: {
  providerBusy?: boolean;
  screen: TelegramVerifyScreenState;
}): TelegramVerifyViewModel {
  const busy = providerBusy
    || screen.kind === "booting"
    || screen.kind === "checking"
    || screen.kind === "joining"
    || screen.kind === "preparing";
  const showSpinner = busy || screen.kind === "external_started";

  switch (screen.kind) {
    case "idle":
      return {
        busy: false,
        message: null,
        showSpinner: false,
        title: "",
      };
    case "booting":
      return {
        busy,
        message: null,
        showSpinner,
        title: "Checking account",
      };
    case "choosing_provider":
      return {
        busy: false,
        message: null,
        showSpinner: false,
        title: "Choose verification method",
      };
    case "preparing":
      return {
        busy,
        message: null,
        showSpinner,
        title: telegramVerifyPreparingMessage(screen.provider),
      };
    case "checking":
      return {
        busy,
        message: null,
        showSpinner,
        title: "Checking verification",
      };
    case "joining":
      return {
        busy,
        message: null,
        showSpinner,
        title: "Joining",
      };
    case "ready":
      return {
        busy,
        message: null,
        showSpinner,
        title: screen.message || telegramVerifyReadyTitle(screen.provider),
      };
    case "external_started":
      return {
        busy,
        message: null,
        showSpinner,
        title: telegramVerifyWaitingTitle(),
      };
    case "done":
      return {
        busy,
        message: null,
        showSpinner,
        title: screen.result === "already_member"
          ? "You've already joined"
          : screen.result === "pending_request"
            ? "Your request is pending"
            : "Joined",
      };
    case "blocked":
      return {
        busy,
        message: null,
        showSpinner,
        title: screen.message || "Not eligible",
      };
    case "error":
      return {
        busy,
        message: null,
        showSpinner,
        title: screen.message || "Could not verify",
      };
  }
}

function TelegramMiniAppStoryShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {children}
    </main>
  );
}

export function TelegramMiniAppVerifyView({
  debugEvents,
  onOpenBoard,
  onOpenPendingLaunch,
  onChooseProvider,
  onRetry,
  providerBusy = false,
  screen,
  ShellComponent = TelegramMiniAppStoryShell,
}: {
  debugEvents?: Array<{ at: string; data?: Record<string, unknown>; label: string }>;
  onOpenBoard?: () => void;
  onOpenPendingLaunch?: () => void;
  onChooseProvider?: (provider: HumanVerificationProvider) => void;
  onRetry?: () => void;
  providerBusy?: boolean;
  screen: TelegramVerifyScreenState;
  ShellComponent?: React.ComponentType<{ children: React.ReactNode }>;
}) {
  if (screen.kind === "idle") {
    return (
      <ShellComponent>
        <div className="min-h-screen bg-background" aria-busy="true" />
      </ShellComponent>
    );
  }

  const viewModel = resolveTelegramVerifyViewModel({
    providerBusy,
    screen,
  });
  const pendingLaunch = screen.kind === "ready"
    ? { href: screen.href, provider: screen.provider }
    : null;
  const canRetry = (screen.kind === "error" || screen.kind === "blocked") && screen.canRetry;

  return (
    <ShellComponent>
      <div className="px-4 py-6">
        <PageContainer size="narrow">
          <section className="flex min-h-[calc(100svh-3rem)] flex-col items-center justify-center">
            <div className="flex min-h-52 w-full max-w-md flex-col items-center justify-center text-center">
              <div>
                <Type as="h1" className="text-balance leading-tight" variant="h1">{viewModel.title}</Type>
                {viewModel.message ? <Type as="p" variant="body">{viewModel.message}</Type> : null}
              </div>
              <div className="mt-5 flex h-9 items-center justify-center">
                {viewModel.showSpinner ? (
                  <Spinner className="size-8 text-muted-foreground" />
                ) : null}
              </div>
              <div className="mt-5 flex min-h-11 flex-wrap items-center justify-center gap-3">
                {screen.kind === "choosing_provider" ? screen.providers.map((provider) => (
                  <Button key={provider} onClick={() => onChooseProvider?.(provider)} variant="secondary">
                    {telegramVerifyLaunchButtonLabel(provider)}
                  </Button>
                )) : null}
                {pendingLaunch ? (
                  <Button onClick={onOpenPendingLaunch}>
                    {telegramVerifyLaunchButtonLabel(pendingLaunch.provider)}
                  </Button>
                ) : null}
                {canRetry ? (
                  <Button loading={viewModel.busy} onClick={onRetry}>
                    Try again
                  </Button>
                ) : null}
                {screen.kind === "done" ? (
                  <Button onClick={onOpenBoard}>
                    Open community
                  </Button>
                ) : null}
                {(screen.kind === "error" || screen.kind === "blocked") && !canRetry ? (
                  <Button onClick={onOpenBoard} variant="ghost">
                    Open community
                  </Button>
                ) : null}
              </div>
            </div>
            {debugEvents?.length ? (
              <div className="mt-4 w-full max-w-80 rounded border border-border bg-muted/40 p-3 text-left">
                <Type as="p" variant="overline">Debug</Type>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-snug text-muted-foreground">
                  {debugEvents.map((event) => JSON.stringify(event)).join("\n")}
                </pre>
              </div>
            ) : null}
          </section>
        </PageContainer>
      </div>
    </ShellComponent>
  );
}

export function TelegramMiniAppSelfReturnView({
  hasCommunityId,
  returnHref,
  ShellComponent = TelegramMiniAppStoryShell,
}: {
  hasCommunityId: boolean;
  returnHref?: string | null;
  ShellComponent?: React.ComponentType<{ children: React.ReactNode }>;
}) {
  return (
    <ShellComponent>
      <div className="px-4 py-6">
        <PageContainer size="narrow">
          <section className="flex min-h-[calc(100svh-3rem)] flex-col items-center justify-center">
            {hasCommunityId ? (
              <div className="flex w-full max-w-80 flex-col items-center justify-center gap-5 text-center">
                <Type as="h1" className="text-balance leading-tight" variant="h1">Return to Telegram</Type>
                {returnHref ? (
                  <Button asChild>
                    <a href={returnHref} rel="noreferrer">
                      Open Telegram
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="w-full max-w-80 text-center">
                <Type as="h1" className="text-balance leading-tight" variant="h1">Open from Telegram</Type>
              </div>
            )}
          </section>
        </PageContainer>
      </div>
    </ShellComponent>
  );
}
