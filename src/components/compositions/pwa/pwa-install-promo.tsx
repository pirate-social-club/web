"use client";

import * as React from "react";

import { ActionBanner } from "@/components/primitives/action-banner";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { trackAnalyticsEvent } from "@/lib/analytics";
import {
  dismissPromo,
  markPromoImpression,
  readPwaInstallRecord,
  shouldShowAutoPromo,
  type DismissReason,
} from "@/lib/pwa/pwa-install-storage";
import { usePwaInstallPrompt } from "@/lib/pwa/use-pwa-install-prompt";

export interface PwaInstallPromoProps {
  title: string;
  body?: string;
  installLabel: string;
  iosInstructions?: string;
  surface: "inbox" | "settings" | "snackbar";
  trigger?: string;
  unreadCount?: number;
  previewState?: "default" | "ios_instructions";
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

export function PwaInstallPromo({
  title,
  body,
  installLabel,
  iosInstructions,
  surface,
  trigger = "manual",
  unreadCount,
  previewState,
}: PwaInstallPromoProps) {
  const prompt = usePwaInstallPrompt();
  const [visible, setVisible] = React.useState(Boolean(previewState));
  const [showingIOSInstructions, setShowingIOSInstructions] = React.useState(previewState === "ios_instructions");

  React.useEffect(() => {
    if (previewState) {
      setVisible(true);
      setShowingIOSInstructions(previewState === "ios_instructions");
      return;
    }
    if (!prompt.canPrompt || prompt.isInstalled) return;
    if (shouldShowAutoPromo(readPwaInstallRecord())) {
      markPromoImpression();
      setVisible(true);
      trackAnalyticsEvent({
        eventName: "pwa_install_promo_viewed",
        properties: { surface, trigger, unread_count_bucket: unreadCountBucket(unreadCount) },
      });
    }
  }, [previewState, prompt.canPrompt, prompt.isInstalled, surface, trigger, unreadCount]);

  if (!visible) return null;

  const handleDismiss = (reason: DismissReason) => {
    dismissPromo(reason);
    setVisible(false);
    trackAnalyticsEvent({
      eventName: "pwa_install_promo_dismissed",
      properties: { surface, dismiss_reason: reason },
    });
  };

  const handleInstall = async () => {
    if (prompt.isIOS) {
      setShowingIOSInstructions(true);
      trackAnalyticsEvent({
        eventName: "pwa_install_prompt_opened",
        properties: { surface, platform: "ios_manual" },
      });
      return;
    }

    trackAnalyticsEvent({
      eventName: "pwa_install_prompt_opened",
      properties: { surface, platform: "chromium" },
    });

    const outcome = await prompt.promptInstall(surface);
    if (outcome === "accepted") {
      setVisible(false);
    } else if (outcome === "dismissed") {
      handleDismiss("native_dismissed");
    }
  };

  if (showingIOSInstructions) {
    return (
      <Card className="rounded-none border-x-0 border-t-0 bg-muted/40 px-5 py-4 shadow-none">
        <ActionBanner
          subtitle={iosInstructions ?? "Tap the Share button below, then scroll down and tap \"Add to Home Screen\"."}
          action={
            <Button onClick={() => setShowingIOSInstructions(false)} size="sm" variant="secondary">
              Back
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="rounded-none border-x-0 border-t-0 bg-muted/40 px-5 py-4 shadow-none">
      <ActionBanner
        title={title}
        subtitle={body}
        action={
          <Button onClick={handleInstall} size="sm">
            {installLabel}
          </Button>
        }
      />
    </Card>
  );
}
