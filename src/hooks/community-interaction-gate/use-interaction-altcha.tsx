"use client";

import * as React from "react";

import type { AltchaPowWidget } from "@/components/compositions/verification/altcha-pow-widget/altcha-pow-widget";
import { Spinner } from "@/components/primitives/spinner";
import type { AltchaScope } from "@/lib/api/client-groups-core";
import type { InteractionAllowedContext } from "@/hooks/use-community-interaction-gate.helpers";

const LazyAltchaPowWidget = React.lazy(async () => {
  const mod = await import("@/components/compositions/verification/altcha-pow-widget/altcha-pow-widget");
  return { default: mod.AltchaPowWidget };
}) as typeof AltchaPowWidget;

function VerificationWidgetFallback() {
  return (
    <div className="flex min-h-28 items-center justify-center">
      <Spinner className="size-5" />
    </div>
  );
}

export function useInteractionAltcha({
  locale,
  onMissingPayload,
}: {
  locale: string;
  onMissingPayload: () => void;
}) {
  const altchaPayloadRef = React.useRef<string | null>(null);
  const completionLoadingRef = React.useRef(false);
  const [altchaLoading, setAltchaLoading] = React.useState(false);
  const [altchaResetKey, setAltchaResetKey] = React.useState(0);

  const setAltchaPayload = React.useCallback((payload: string | null) => {
    altchaPayloadRef.current = payload;
  }, []);

  const buildAltchaBody = React.useCallback(({
    action,
    onVerified,
    resetKey,
    scope,
    verifiedSubtitle,
  }: {
    action: string;
    onVerified?: (payload: string) => void | Promise<void>;
    resetKey?: React.Key;
    scope: AltchaScope;
    verifiedSubtitle?: string;
  }) => (
    <React.Suspense fallback={<VerificationWidgetFallback />}>
      <LazyAltchaPowWidget
        key={resetKey ?? altchaResetKey}
        action={action}
        locale={locale}
        onPayloadChange={setAltchaPayload}
        onVerified={onVerified}
        scope={scope}
        verifiedSubtitle={verifiedSubtitle}
      />
    </React.Suspense>
  ), [altchaResetKey, locale, setAltchaPayload]);

  const completeAltchaJoin = React.useCallback(async (
    onJoinComplete: (payload: string) => Promise<void> | void,
    onJoinError: (error: unknown, resetKey: number) => void,
    payloadOverride?: string | null,
  ) => {
    if (completionLoadingRef.current) {
      return;
    }

    const payload = payloadOverride ?? altchaPayloadRef.current;
    if (!payload) {
      onMissingPayload();
      return;
    }

    completionLoadingRef.current = true;
    setAltchaLoading(true);
    try {
      await onJoinComplete(payload);
      altchaPayloadRef.current = null;
    } catch (error: unknown) {
      altchaPayloadRef.current = null;
      const nextResetKey = Date.now();
      setAltchaResetKey(nextResetKey);
      onJoinError(error, nextResetKey);
    } finally {
      completionLoadingRef.current = false;
      setAltchaLoading(false);
    }
  }, [onMissingPayload]);

  const completeAltchaAction = React.useCallback(async (
    onActionAllowed: (context: InteractionAllowedContext) => Promise<void> | void,
    onActionError: (error: unknown) => void,
    payloadOverride?: string | null,
  ) => {
    if (completionLoadingRef.current) {
      return;
    }

    const payload = payloadOverride ?? altchaPayloadRef.current;
    if (!payload) {
      onMissingPayload();
      return;
    }

    completionLoadingRef.current = true;
    setAltchaLoading(true);
    try {
      altchaPayloadRef.current = null;
      await onActionAllowed({ altchaPayload: payload });
    } catch (error: unknown) {
      altchaPayloadRef.current = null;
      setAltchaResetKey((current) => current + 1);
      onActionError(error);
    } finally {
      completionLoadingRef.current = false;
      setAltchaLoading(false);
    }
  }, [onMissingPayload]);

  return {
    altchaLoading,
    altchaResetKey,
    buildAltchaBody,
    completeAltchaAction,
    completeAltchaJoin,
    setAltchaPayload,
  };
}
