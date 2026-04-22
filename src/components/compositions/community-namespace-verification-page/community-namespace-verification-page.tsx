"use client";

import * as React from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/primitives/accordion";
import { Button } from "@/components/primitives/button";
import { CopyField } from "@/components/primitives/copy-field";
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { OptionCard } from "@/components/primitives/option-card";
import { PrefixInput } from "@/components/primitives/prefix-input";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";
import {
  NamespaceVerificationHnsPanel,
} from "@/components/compositions/namespace-verification/namespace-verification-hns-ui";
import {
  NamespaceVerificationChallengeMessage,
} from "@/components/compositions/namespace-verification/namespace-verification-shared";
import { useNamespaceVerificationFlow } from "@/components/compositions/namespace-verification/use-namespace-verification-flow";
import handshakeLogoUrl from "../../../../handshake-logo.png";
import spacesLogoUrl from "../../../../spaces-protocol-logo.jpeg";

import type {
  NamespaceFamily,
} from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";

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
  const hasRootInput = flow.rootLabel.trim().replace(/^[@.]/, "").length > 0;

  return (
    <section className="mx-auto flex w-full max-w-[64rem] flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="min-w-0 space-y-2">
            <h1 className="text-[1.875rem] font-semibold tracking-tight md:text-[2.25rem]">{mc.title}</h1>
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

        {(flow.isChallengeReady || flow.isVerifying) && flow.isSpaces && flow.challengePayload ? (
          <section className="space-y-4 rounded-[var(--radius-2xl)] border border-border-soft bg-card px-4 py-4 md:px-5 md:py-5">
            <FormNote>{mc.signatureNote}</FormNote>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="text-base text-muted-foreground">{mc.digestLabel}</div>
                <CopyField value={flow.challengePayload.digest} />
              </div>
              <div className="space-y-1.5">
                <FormFieldLabel label={mc.signatureLabel} />
                <Input
                  disabled={flow.busy}
                  onChange={(event) => {
                    flow.actions.setSignature(event.target.value);
                  }}
                  placeholder={mc.signaturePlaceholder}
                  value={flow.signature}
                />
              </div>
            </div>
            <Accordion collapsible type="single">
              <AccordionItem className="border-b-0" value="details">
                <AccordionTrigger className="py-1 text-base text-muted-foreground hover:no-underline">
                  {mc.challengeDetails}
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                    <NamespaceVerificationChallengeMessage value={flow.challengePayload.message} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            <button
              className="text-base text-muted-foreground transition-colors hover:text-foreground"
              onClick={flow.actions.reset}
              type="button"
            >
              {mc.verifyDifferent}
            </button>
          </section>
        ) : null}

        {flow.isVerified ? (
          <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-4 py-4 md:px-5">
            <div className="text-base font-semibold text-foreground">{mc.rootVerified}</div>
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

      <div className="flex flex-col-reverse gap-3 border-t border-border-soft pt-6 sm:flex-row sm:justify-end">
        {flow.isDnsSetupRequired ? (
          <>
            <Button onClick={flow.actions.reset} variant="outline">{mc.cancelLabel}</Button>
            <Button loading={flow.isStarting} onClick={flow.actions.restart}>{mc.checkSetup}</Button>
          </>
        ) : null}
        {flow.isChallengePending ? (
          <>
            <Button onClick={flow.actions.reset} variant="outline">{mc.cancelLabel}</Button>
            <Button loading={flow.isVerifying} onClick={flow.actions.verify}>{mc.verifyAction}</Button>
          </>
        ) : null}
        {(flow.isFailed || flow.isExpired) ? (
          <>
            <Button onClick={flow.actions.reset} variant="outline">{mc.cancelLabel}</Button>
            {flow.isFailed && flow.isHns ? <Button loading={flow.isVerifying} onClick={flow.actions.verify}>{mc.verifyAction}</Button> : null}
            <Button onClick={flow.actions.restart}>{flow.isHns ? mc.getChallenge : mc.newChallenge}</Button>
          </>
        ) : null}
        {(flow.isIdle || flow.isStarting) ? (
          <>
            <Button onClick={flow.actions.reset} variant="outline">{mc.cancelLabel}</Button>
            <Button disabled={!hasRootInput} loading={flow.isStarting} onClick={flow.actions.start}>
              {flow.isHns ? mc.continueLabel : mc.getChallenge}
            </Button>
          </>
        ) : null}
        {(flow.isChallengeReady || flow.isVerifying) ? (
          <Button disabled={!flow.canSubmitSignature} loading={flow.isVerifying} onClick={flow.actions.verify}>
            {mc.verifyAction}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
