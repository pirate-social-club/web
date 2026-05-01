"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout";
import { OptionCard } from "@/components/primitives/option-card";
import { PrefixInput } from "@/components/primitives/prefix-input";
import { defaultRouteCopy } from "../../system/route-copy-defaults";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  NamespaceVerificationHnsPanel,
} from "@/components/compositions/verification/namespace-verification/namespace-verification-hns-ui";
import {
  NamespaceVerificationSpacesPanel,
} from "@/components/compositions/verification/namespace-verification/namespace-verification-shared";
import { useNamespaceVerificationFlow } from "@/components/compositions/verification/namespace-verification/use-namespace-verification-flow";
import handshakeLogoUrl from "@/assets/namespace-icons/handshake-logo.png";
import spacesLogoUrl from "@/assets/namespace-icons/spaces-protocol-logo.jpeg";

import type {
  NamespaceFamily,
} from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";
import { Type } from "@/components/primitives/type";

const namespaceFamilyMeta: Record<NamespaceFamily, {
  externalExample: string;
  rootInputPrefix?: string;
  icon: React.ReactNode;
}> = {
  hns: {
    externalExample: "infinity",
    rootInputPrefix: ".",
    icon: <img alt="" className="size-full object-cover" src={handshakeLogoUrl} />,
  },
  spaces: {
    externalExample: "infinity",
    rootInputPrefix: "@",
    icon: <img alt="" className="size-full object-cover" src={spacesLogoUrl} />,
  },
};

export interface CommunityNamespaceVerificationPageProps {
  activeSessionId?: string | null;
  attachedNamespaceVerificationId?: string | null;
  attachedRouteSlug?: string | null;
  callbacks: import("@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types").NamespaceVerificationCallbacks;
  initialFamily?: NamespaceFamily;
  initialRootLabel?: string;
  onBackClick?: () => void;
  onClearPendingSession?: () => Promise<void> | void;
  onSessionCleared?: () => void;
  onSessionStarted?: (sessionId: string) => void;
  onVerified?: (namespaceVerificationId: string) => void;
}

export function CommunityNamespaceVerificationPage({
  activeSessionId,
  attachedNamespaceVerificationId,
  attachedRouteSlug,
  callbacks,
  initialFamily,
  initialRootLabel = "",
  onBackClick,
  onClearPendingSession,
  onSessionCleared,
  onSessionStarted,
  onVerified,
}: CommunityNamespaceVerificationPageProps) {
  const copy = defaultRouteCopy;
  const isMobile = useIsMobile();
  const mc = copy.moderation.namespaceVerification;
  const family = copy.moderation.namespaceVerification.family;
  const familyLabels: Record<NamespaceFamily, { label: string; rootInputLabel: string }> = {
    hns: { label: family.handshakeLabel, rootInputLabel: family.handshakeRootLabel },
    spaces: { label: family.spacesLabel, rootInputLabel: family.spacesRootLabel },
  };
  const [clearingPending, setClearingPending] = React.useState(false);
  const hasAttachedNamespace = Boolean(attachedNamespaceVerificationId);

  const handleClearPendingSession = React.useCallback(async () => {
    if (!onClearPendingSession || clearingPending) return;
    setClearingPending(true);
    try {
      await onClearPendingSession();
    } finally {
      setClearingPending(false);
    }
  }, [clearingPending, onClearPendingSession]);

  const flow = useNamespaceVerificationFlow({
    callbacks,
    initialRootLabel,
    initialFamily,
    activeSessionId,
    enabled: true,
    onSessionStarted,
    onSessionCleared,
    onVerified,
  });

  const meta = namespaceFamilyMeta[flow.activeFamily];
  const hasFooterActions = (
    flow.isDnsSetupRequired ||
    flow.isChallengePending ||
    flow.isFailed ||
    flow.isExpired ||
    flow.isIdle ||
    flow.isStarting ||
    flow.isChallengeReady ||
    flow.isVerifying
  ) && !flow.isVerified;
  const primaryButtonClassName = cn(isMobile && "w-full");
  const secondaryButtonClassName = cn(isMobile && "w-full");
  const canChooseDifferentNamespace = (
    flow.isDnsSetupRequired ||
    flow.isChallengePending ||
    flow.isFailed ||
    flow.isExpired ||
    flow.isChallengeReady ||
    flow.isVerifying
  ) && !flow.isVerified;
  const chooseDifferentNamespaceAction = canChooseDifferentNamespace ? (
    <Button
      className={secondaryButtonClassName}
      disabled={flow.busy}
      onClick={flow.actions.reset}
      variant="secondary"
    >
      {mc.verifyDifferent}
    </Button>
  ) : null;
  const primaryFooterActions = (
    <>
      {flow.isDnsSetupRequired ? (
        <Button className={primaryButtonClassName} loading={flow.isVerifying} onClick={flow.actions.restart}>{mc.checkSetup}</Button>
      ) : null}
      {flow.isChallengePending ? (
        <Button className={primaryButtonClassName} loading={flow.isVerifying} onClick={flow.actions.verify}>{flow.isSpaces ? mc.checkSetup : mc.verifyAction}</Button>
      ) : null}
      {(flow.isFailed || flow.isExpired) ? (
        <>
          {flow.isFailed && flow.isHns ? (
            <Button className={primaryButtonClassName} loading={flow.isVerifying} onClick={flow.actions.verify}>{mc.verifyAction}</Button>
          ) : null}
          <Button className={primaryButtonClassName} onClick={flow.actions.restart}>{flow.isHns ? mc.getChallenge : mc.newChallenge}</Button>
        </>
      ) : null}
      {(flow.isIdle || flow.isStarting) ? (
        <Button className={primaryButtonClassName} disabled={!flow.canStart} loading={flow.isStarting} onClick={flow.actions.start}>
          {flow.isHns ? mc.continueLabel : mc.getChallenge}
        </Button>
      ) : null}
      {(flow.isChallengeReady || flow.isVerifying) ? (
        <Button className={primaryButtonClassName} disabled={!flow.canSubmitSignature} loading={flow.isVerifying} onClick={flow.actions.verify}>
          {flow.isSpaces ? mc.checkSetup : mc.verifyAction}
        </Button>
      ) : null}
    </>
  );

  if (hasAttachedNamespace) {
    const publicCommunityUrl = attachedRouteSlug ? `https://pirate.sc/c/${attachedRouteSlug}` : null;
    const handshakeUrl = attachedRouteSlug ? `https://${attachedRouteSlug}/` : null;

    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <Type as="h1" variant="h1" className="md:text-4xl">Success!</Type>
          {onBackClick ? <Button onClick={onBackClick} variant="outline">Done</Button> : null}
        </div>

        <div className="space-y-4 rounded-[var(--radius-2xl)] border border-border-soft bg-card px-4 py-4 md:px-5 md:py-5">
          <Type as="h2" variant="body-strong">Success!</Type>
          <div className="space-y-2">
            {publicCommunityUrl && handshakeUrl ? (
              <div className="space-y-3">
                <Type as="p" variant="body">
                  Your namespace is now available at{" "}
                  <a className="text-primary underline-offset-4 hover:underline" href={publicCommunityUrl}>
                    {publicCommunityUrl}
                  </a>{" "}
                  and{" "}
                  <a className="text-primary underline-offset-4 hover:underline" href={handshakeUrl}>
                    {handshakeUrl}
                  </a>
                  .
                </Type>
                <Type as="p" variant="body">
                  To access your site on Handshake DNS, use{" "}
                  <a
                    className="text-primary underline-offset-4 hover:underline"
                    href="https://github.com/pirate-social-club/freedom-browser/releases"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Freedom Browser
                  </a>
                  .
                </Type>
              </div>
            ) : (
              <FormNote>This community namespace is connected. There is nothing else to set up here.</FormNote>
            )}
          </div>

          {activeSessionId ? (
            <div className="space-y-3 border-t border-border-soft pt-4">
              <FormNote tone="warning">
                There is also a pending namespace verification for this community. Replacing an attached namespace is not supported, so clear the pending verification before continuing.
              </FormNote>
              <Button loading={clearingPending} onClick={handleClearPendingSession} variant="outline">
                Clear pending verification
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", isMobile && hasFooterActions && "pb-28")}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <Type as="h1" variant="h1" className="md:text-4xl">Import Namespace</Type>
        </div>
        {flow.isVerified ? <Button onClick={() => onBackClick?.()}>{mc.doneLabel}</Button> : null}
      </div>

      <div className="space-y-6">
        {(flow.isIdle || flow.isStarting) && !flow.shouldShowResumeState ? (
          <>
            <div className="space-y-2">
              {(Object.keys(namespaceFamilyMeta) as NamespaceFamily[]).map((f) => {
                const option = namespaceFamilyMeta[f];
                const labels = familyLabels[f];
                return (
                  <OptionCard
                    icon={option.icon}
                    key={f}
                    onClick={() => flow.actions.setActiveFamily(f)}
                    selected={f === flow.activeFamily}
                    title={labels.label}
                  />
                );
              })}
            </div>

            <div className="space-y-2">
              <FormFieldLabel label={familyLabels[flow.activeFamily].rootInputLabel} />
              <PrefixInput
                disabled={flow.busy}
                onChange={(event) => {
                  flow.actions.setRootLabel(event.target.value);
                }}
                placeholder={meta.externalExample}
                prefix={meta.rootInputPrefix ?? ""}
                prefixClassName={flow.isHns ? "pb-1 text-3xl font-bold" : undefined}
                value={flow.rootLabel}
              />
              {flow.rootLabelError ? (
                <FormNote tone="warning">{mc.invalidRootLabel}</FormNote>
              ) : flow.routePreviewPath ? (
                <FormNote>{mc.routePreviewLabel}: {flow.routePreviewPath}</FormNote>
              ) : null}
            </div>

          </>
        ) : null}

        {flow.shouldShowResumeState ? (
          <div className="flex items-center justify-center py-12 text-base text-muted-foreground">
            {mc.resuming}
          </div>
        ) : null}

        {(flow.isDnsSetupRequired || flow.isChallengeReady || flow.isChallengePending || flow.isVerifying) && flow.isHns && flow.hnsMode ? (
          <NamespaceVerificationHnsPanel
            challengeHost={flow.challengeHost}
            challengePending={flow.isChallengePending}
            challengeTxtValue={flow.challengeTxtValue}
            mode={flow.hnsMode}
            onAbandon={flow.actions.reset}
            rootLabel={flow.rootLabel}
            showAbandonAction={false}
            setupNameservers={flow.setupNameservers}
          />
        ) : null}

        {(flow.isChallengeReady || flow.isChallengePending || flow.isVerifying) && flow.isSpaces && flow.challengePayload ? (
          <NamespaceVerificationSpacesPanel
            busy={flow.busy}
            challengePayload={flow.challengePayload}
            className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-4 py-4 md:px-5 md:py-5"
            onAbandon={flow.actions.reset}
            showAbandonAction={false}
          />
        ) : null}

        {flow.isVerified ? (
          <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-4 py-4 md:px-5">
            <Type as="div" variant="body-strong">{mc.rootVerified}</Type>
          </div>
        ) : null}

        {(flow.isFailed || flow.isExpired) ? (
          <FormNote tone="warning">
            {flow.isExpired
              ? mc.failure.expired
              : flow.failureReason
                ? flow.failureReason.replace(/_/g, " ")
                : flow.isHns && flow.hnsMode === "dns_setup_required"
                  ? mc.failure.dnsSetupRequired
                  : flow.isHns
                  ? mc.failure.hnsDefault
                  : mc.failure.spacesDefault}
          </FormNote>
        ) : null}

        {flow.isDnsSetupRequired && flow.lastCheckStatus === "dns_setup_required" ? (
          <FormNote tone="warning">{mc.hns.dnsSetupPendingNote}</FormNote>
        ) : null}
      </div>

      {hasFooterActions && isMobile ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-soft bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
          <div className="flex flex-col items-stretch gap-3 px-4">
            <div className="flex flex-col items-stretch gap-3">
              {primaryFooterActions}
            </div>
            {chooseDifferentNamespaceAction}
          </div>
        </div>
      ) : null}

      {hasFooterActions && !isMobile ? (
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center justify-start">
            {chooseDifferentNamespaceAction}
          </div>
          <div className="flex items-center justify-end gap-3">
            {primaryFooterActions}
          </div>
        </div>
      ) : null}
    </section>
  );
}
