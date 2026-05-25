"use client";

import * as React from "react";
import "altcha";
import type {} from "altcha/types/react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";

import type { AltchaScope } from "@/lib/api/client-groups-core";
import { ActionBanner } from "@/components/primitives/action-banner";
import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { cn } from "@/lib/utils";

type AltchaWidgetElement = HTMLElement & {
  configure?: (options: Record<string, unknown>) => void;
  reset?: () => void;
  verify?: () => void;
};

type AltchaStateChangeEvent = CustomEvent<{
  payload?: string;
  state: string;
}>;

type AltchaVerifiedEvent = CustomEvent<{
  payload: string;
}>;

export function AltchaPowWidget({
  action,
  className,
  challengeLoader,
  locale,
  onPayloadChange,
  scope,
}: {
  action: string;
  className?: string;
  challengeLoader?: (input: { action: string; scope: AltchaScope }) => Promise<Record<string, unknown>>;
  locale?: string | null;
  onPayloadChange: (payload: string | null) => void;
  scope: AltchaScope;
}) {
  const api = useApi();
  const widgetRef = React.useRef<AltchaWidgetElement | null>(null);
  const [challenge, setChallenge] = React.useState<Record<string, unknown> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [retryKey, setRetryKey] = React.useState(0);
  const [verified, setVerified] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setChallenge(null);
    setVerified(false);
    onPayloadChange(null);

    const loadChallenge = challengeLoader ?? api.verification.createAltchaChallenge;
    void loadChallenge({ action, scope })
      .then((nextChallenge) => {
        if (!cancelled) {
          setChallenge(nextChallenge);
        }
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(nextError, "Could not start proof-of-work check."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [action, api.verification.createAltchaChallenge, challengeLoader, onPayloadChange, retryKey, scope]);

  React.useEffect(() => {
    const widget = widgetRef.current;
    if (!widget || !challenge || loading || verified) {
      return;
    }

    const handleVerified = (event: Event) => {
      const payload = (event as AltchaVerifiedEvent).detail?.payload;
      onPayloadChange(payload?.trim() ? payload : null);
      setVerified(Boolean(payload?.trim()));
    };
    const handleStateChange = (event: Event) => {
      const detail = (event as AltchaStateChangeEvent).detail;
      if (detail?.state === "verified" && detail.payload?.trim()) {
        onPayloadChange(detail.payload);
        setVerified(true);
        return;
      }
      if (detail?.state === "expired" || detail?.state === "error" || detail?.state === "unverified") {
        onPayloadChange(null);
        setVerified(false);
      }
    };

    widget.addEventListener("verified", handleVerified);
    widget.addEventListener("statechange", handleStateChange);
    return () => {
      widget.removeEventListener("verified", handleVerified);
      widget.removeEventListener("statechange", handleStateChange);
    };
  }, [challenge, loading, onPayloadChange, verified]);

  React.useEffect(() => {
    const widget = widgetRef.current;
    if (!widget || !challenge || loading || verified) {
      return;
    }

    const language = locale?.toLowerCase().startsWith("ar")
      ? "ar"
      : locale?.toLowerCase().startsWith("zh")
        ? "zh"
        : "en";

    const configureWidget = () => {
      if (typeof widget.configure !== "function") {
        return;
      }
      widget.configure({
        auto: "off",
        challenge,
        display: "standard",
        hideFooter: true,
        hideLogo: true,
        language,
        workers: 1,
      });
      widget.reset?.();
      widget.verify?.();
    };

    configureWidget();
    widget.addEventListener("load", configureWidget);
    return () => {
      widget.removeEventListener("load", configureWidget);
    };
  }, [challenge, loading, locale, verified]);

  if (loading) {
    return (
      <Type as="div" className={cn("flex items-center gap-3 text-muted-foreground", className)} variant="body">
        <Spinner className="size-5" />
        <span>Preparing proof-of-work check&hellip;</span>
      </Type>
    );
  }

  if (error) {
    return (
      <ActionBanner
        action={(
          <Button
            onClick={() => setRetryKey((current) => current + 1)}
            size="sm"
            variant="secondary"
          >
            Retry
          </Button>
        )}
        className={className}
        title={(
          <span className="flex items-center gap-2 text-warning">
            <WarningCircle aria-hidden className="size-5 shrink-0" weight="fill" />
            Proof-of-work unavailable
          </span>
        )}
        subtitle={error}
      />
    );
  }

  if (verified) {
    return (
      <ActionBanner
        className={className}
        title={(
          <span className="flex items-center gap-2 text-success">
            <CheckCircle aria-hidden className="size-5 shrink-0" weight="fill" />
            Proof-of-work complete
          </span>
        )}
        subtitle="Continue to finish this action."
      />
    );
  }

  return (
    <div className={cn("pirate-altcha-widget", className)}>
      <altcha-widget ref={widgetRef} />
    </div>
  );
}
