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
  onVerified,
  scope,
}: {
  action: string;
  className?: string;
  challengeLoader?: (input: { action: string; scope: AltchaScope }) => Promise<Record<string, unknown>>;
  locale?: string | null;
  onPayloadChange: (payload: string | null) => void;
  onVerified?: (payload: string) => void | Promise<void>;
  scope: AltchaScope;
}) {
  const api = useApi();
  const widgetRef = React.useRef<AltchaWidgetElement | null>(null);
  const onPayloadChangeRef = React.useRef(onPayloadChange);
  const onVerifiedRef = React.useRef(onVerified);
  const verifiedPayloadRef = React.useRef<string | null>(null);
  const [challenge, setChallenge] = React.useState<Record<string, unknown> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [retryKey, setRetryKey] = React.useState(0);
  const [verified, setVerified] = React.useState(false);

  React.useEffect(() => {
    onPayloadChangeRef.current = onPayloadChange;
  }, [onPayloadChange]);

  React.useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setChallenge(null);
    setVerified(false);
    verifiedPayloadRef.current = null;
    onPayloadChangeRef.current(null);

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
  }, [action, api.verification.createAltchaChallenge, challengeLoader, retryKey, scope]);

  React.useEffect(() => {
    const widget = widgetRef.current;
    if (!widget || !challenge) {
      return;
    }

    const acceptVerifiedPayload = (rawPayload: string | null | undefined) => {
      const payload = rawPayload?.trim() ?? "";
      if (!payload) {
        verifiedPayloadRef.current = null;
        onPayloadChangeRef.current(null);
        setVerified(false);
        return;
      }

      if (verifiedPayloadRef.current === payload) {
        return;
      }

      verifiedPayloadRef.current = payload;
      onPayloadChangeRef.current(payload);
      setVerified(true);
      void onVerifiedRef.current?.(payload);
    };

    const handleVerified = (event: Event) => {
      acceptVerifiedPayload((event as AltchaVerifiedEvent).detail?.payload);
    };
    const handleStateChange = (event: Event) => {
      const detail = (event as AltchaStateChangeEvent).detail;
      if (detail?.state === "verified" && detail.payload?.trim()) {
        acceptVerifiedPayload(detail.payload);
        return;
      }
      if (detail?.state === "expired" || detail?.state === "error" || detail?.state === "unverified") {
        verifiedPayloadRef.current = null;
        onPayloadChangeRef.current(null);
        setVerified(false);
      }
    };

    widget.addEventListener("verified", handleVerified);
    widget.addEventListener("statechange", handleStateChange);
    return () => {
      widget.removeEventListener("verified", handleVerified);
      widget.removeEventListener("statechange", handleStateChange);
    };
  }, [challenge]);

  React.useEffect(() => {
    const widget = widgetRef.current;
    if (!widget || !challenge) {
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
        type: "checkbox",
        workers: 1,
      });
      widget.reset?.();
    };

    configureWidget();
    widget.addEventListener("load", configureWidget);
    return () => {
      widget.removeEventListener("load", configureWidget);
    };
  }, [challenge, locale]);

  if (loading) {
    return (
      <Type as="div" className={cn("flex items-center gap-3 text-muted-foreground", className)} variant="body">
        <Spinner className="size-5" />
        <span>Checking your browser&hellip;</span>
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
        subtitle={onVerified ? "Finishing this action..." : "Proof accepted."}
      />
    );
  }

  return (
    <div className={cn("pirate-altcha-widget", className)}>
      <altcha-widget
        auto="off"
        display="standard"
        ref={widgetRef}
        type="checkbox"
      />
    </div>
  );
}
