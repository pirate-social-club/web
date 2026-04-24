"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout";
import { OptionCard } from "@/components/primitives/option-card";
import { PrefixInput } from "@/components/primitives/prefix-input";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  NamespaceVerificationHnsPanel,
} from "@/components/compositions/namespace-verification/namespace-verification-hns-ui";
import {
  NamespaceVerificationSpacesPanel,
} from "@/components/compositions/namespace-verification/namespace-verification-shared";
import { useNamespaceVerificationFlow } from "@/components/compositions/namespace-verification/use-namespace-verification-flow";
import handshakeLogoUrl from "../../../../handshake-logo.png";
import spacesLogoUrl from "../../../../spaces-protocol-logo.jpeg";

import type {
  NamespaceFamily,
} from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";
import { Type } from "@/components/primitives/type";

const namespaceFamilyMeta: Record<NamespaceFamily, {
  externalExample: string;
  rootInputPrefix?: string;
  icon: React.ReactNode;
}> = {
  hns: {
    externalExample: "infinity",
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
  callbacks: import("@/components/compositions/verify-namespace-modal/verify-namespace-modal.types").NamespaceVerificationCallbacks;
  initialFamily?: NamespaceFamily;
  initialRootLabel?: string;
  onBackClick?: () => void;
  onSessionCleared?: () => void;
  onSessionStarted?: (sessionId: string) => void;
  onVerified?: (namespaceVerificationId: string) => void;
}

export function CommunityNamespaceVerificationPage({
  activeSessionId,
  callbacks,
  initialFamily,
  initialRootLabel = "",
  onBackClick,
  onSessionCleared,
  onSessionStarted,
  onVerified,
}: CommunityNamespaceVerificationPageProps) {
  const { copy } = useRouteMessages();
  const isMobile = useIsMobile();
  const mc = copy.moderation.namespaceVerification;
  const family = copy.moderation.namespaceVerification.family;
  const familyLabels: Record<NamespaceFamily, { label: string; rootInputLabel: string }> = {
    hns: { label: family.handshakeLabel, rootInputLabel: family.handshakeRootLabel },
    spaces: { label: family.spacesLabel, rootInputLabel: family.spacesRootLabel },
  };

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
  const footerActions = (
    <>
      {flow.isDnsSetupRequired ? (
        <Button className={primaryButtonClassName} loading={flow.isStarting} onClick={flow.actions.restart}>{mc.checkSetup}</Button>
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

  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", isMobile && hasFooterActions && "pb-28")}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="min-w-0 space-y-2">
            <Type as="h1" variant="h1" className=" md:text-4xl">{mc.title}</Type>
            <p className="text-base text-muted-foreground">
              {mc.description}
            </p>
          </div>
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
            setupNameservers={flow.setupNameservers}
          />
        ) : null}

        {(flow.isChallengeReady || flow.isChallengePending || flow.isVerifying) && flow.isSpaces && flow.challengePayload ? (
          <NamespaceVerificationSpacesPanel
            busy={flow.busy}
            challengePayload={flow.challengePayload}
            className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-4 py-4 md:px-5 md:py-5"
            onAbandon={flow.actions.reset}
          />
        ) : null}

        {flow.isVerified ? (
          <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-4 py-4 md:px-5">
            <Type as="div" variant="body-strong" className="">{mc.rootVerified}</Type>
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
      </div>

      {hasFooterActions && isMobile ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-soft bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
          <div className="flex items-center justify-end gap-3 px-4">
            {footerActions}
          </div>
        </div>
      ) : null}

      {hasFooterActions && !isMobile ? (
        <div className="flex flex-col-reverse gap-3 border-t border-border-soft pt-6 sm:flex-row sm:justify-end">
          {footerActions}
        </div>
      ) : null}
    </section>
  );
}
