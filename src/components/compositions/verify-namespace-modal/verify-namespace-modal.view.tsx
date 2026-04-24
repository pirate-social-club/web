"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/modal/modal";
import {
  NamespaceVerificationHnsPanel,
  getHnsVerificationMode,
} from "@/components/compositions/namespace-verification/namespace-verification-hns-ui";
import {
  NamespaceVerificationSpacesPanel,
} from "@/components/compositions/namespace-verification/namespace-verification-shared";
import { OptionCard } from "@/components/primitives/option-card";
import { PrefixInput } from "@/components/primitives/prefix-input";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";
import handshakeLogoUrl from "../../../../handshake-logo.png";
import spacesLogoUrl from "../../../../spaces-protocol-logo.jpeg";

import type {
  NamespaceFamily,
  SpacesChallengePayload,
} from "./verify-namespace-modal.types";
import { Type } from "@/components/primitives/type";

const namespaceFamilyMeta: Record<
  NamespaceFamily,
  {
    externalExample: string;
    rootInputPrefix?: string;
    icon: React.ReactNode;
  }
> = {
  hns: {
    externalExample: "kanye",
    icon: <img alt="" className="size-full object-cover" src={handshakeLogoUrl} />,
  },
  spaces: {
    externalExample: "kanye",
    rootInputPrefix: "@",
    icon: <img alt="" className="size-full object-cover" src={spacesLogoUrl} />,
  },
};

function getFailureMessage({
  copy,
  failureReason,
  hnsMode,
  isExpired,
  isHns,
}: {
  copy: ReturnType<typeof useRouteMessages>["copy"]["moderation"]["namespaceVerification"]["failure"];
  failureReason: string | null;
  hnsMode: ReturnType<typeof getHnsVerificationMode> | null;
  isExpired: boolean;
  isHns: boolean;
}) {
  if (isExpired) {
    return copy.expired;
  }

  if (failureReason) {
    return failureReason.replace(/_/g, " ");
  }

  if (isHns && hnsMode === "dns_setup_required") {
    return copy.dnsSetupRequired;
  }

  if (isHns) {
    return copy.hnsDefault;
  }

  return copy.spacesDefault;
}

export function VerifyNamespaceModalView({
  activeFamily,
  busy,
  canStart,
  canSubmitSignature,
  challengeHost,
  challengePayload,
  challengeTxtValue,
  failureReason,
  forceMobile,
  hnsMode,
  isChallengePending,
  isChallengeReady,
  isDnsSetupRequired,
  isExpired,
  isFailed,
  isHns,
  isIdle,
  isSpaces,
  isStarting,
  isVerified,
  isVerifying,
  onAbandon,
  onFamilyChange,
  onOpenChange,
  onRestart,
  onRootLabelChange,
  onSignatureChange,
  onStart,
  onVerify,
  open,
  resuming,
  rootLabel,
  rootLabelError,
  routePreviewPath,
  setupNameservers,
  signature,
}: {
  activeFamily: NamespaceFamily;
  busy: boolean;
  canStart: boolean;
  canSubmitSignature: boolean;
  challengeHost: string | null;
  challengePayload: SpacesChallengePayload | null;
  challengeTxtValue: string | null;
  failureReason: string | null;
  forceMobile?: boolean;
  hnsMode: ReturnType<typeof getHnsVerificationMode> | null;
  isChallengePending: boolean;
  isChallengeReady: boolean;
  isDnsSetupRequired: boolean;
  isExpired: boolean;
  isFailed: boolean;
  isHns: boolean;
  isIdle: boolean;
  isSpaces: boolean;
  isStarting: boolean;
  isVerified: boolean;
  isVerifying: boolean;
  onAbandon: () => void;
  onFamilyChange: (family: NamespaceFamily) => void;
  onOpenChange: (open: boolean) => void;
  onRestart: () => void;
  onRootLabelChange: (value: string) => void;
  onSignatureChange: (value: string) => void;
  onStart: () => void;
  onVerify: () => void;
  open: boolean;
  resuming: boolean;
  rootLabel: string;
  rootLabelError: string | null;
  routePreviewPath: string | null;
  setupNameservers: string[] | null;
  signature: string;
}) {
  const { copy } = useRouteMessages();
  const mc = copy.moderation.namespaceVerification;
  const family = copy.moderation.namespaceVerification.family;
  const meta = namespaceFamilyMeta[activeFamily];
  const familyLabels: Record<NamespaceFamily, { label: string; rootInputLabel: string }> = {
    hns: { label: family.handshakeLabel, rootInputLabel: family.handshakeRootLabel },
    spaces: { label: family.spacesLabel, rootInputLabel: family.spacesRootLabel },
  };
  return (
    <Modal forceMobile={forceMobile} onOpenChange={onOpenChange} open={open}>
      <ModalContent className="border-border bg-background p-6 sm:w-[min(100%-2rem,34rem)] sm:max-w-[34rem]">
        <ModalHeader className="pe-10 text-start">
          <ModalTitle className="text-2xl leading-tight tracking-tight sm:text-3xl">
            {mc.title}
          </ModalTitle>
          <ModalDescription className="max-w-[34ch] text-base leading-7">
            {mc.description}
          </ModalDescription>
        </ModalHeader>

        <div className="mt-6 space-y-5">
          {(isIdle || isStarting) && !resuming ? (
            <>
              <div className="space-y-2">
                {(Object.keys(namespaceFamilyMeta) as NamespaceFamily[]).map((f) => {
                  const option = namespaceFamilyMeta[f];
                  const labels = familyLabels[f];
                  return (
                    <OptionCard
                      key={f}
                      icon={option.icon}
                      selected={f === activeFamily}
                      title={labels.label}
                      onClick={() => onFamilyChange(f)}
                    />
                  );
                })}
              </div>

              <div>
                <FormFieldLabel className="mb-1.5" label={familyLabels[activeFamily].rootInputLabel} />
                <PrefixInput
                  disabled={busy}
                  onChange={(event) => onRootLabelChange(event.target.value)}
                  placeholder={meta.externalExample}
                  prefix={meta.rootInputPrefix ?? ""}
                  value={rootLabel}
                />
                {rootLabelError ? (
                  <FormNote className="mt-2" tone="warning">{mc.invalidRootLabel}</FormNote>
                ) : routePreviewPath ? (
                  <FormNote className="mt-2">{mc.routePreviewLabel}: {routePreviewPath}</FormNote>
                ) : null}
              </div>

            </>
          ) : null}

          {resuming ? (
            <div className="flex items-center justify-center py-8 text-base text-muted-foreground">
              {mc.resuming}
            </div>
          ) : null}

          {(isDnsSetupRequired || isChallengeReady || isChallengePending || isVerifying) &&
          isHns &&
          hnsMode ? (
            <NamespaceVerificationHnsPanel
              challengeHost={challengeHost}
              challengePending={isChallengePending}
              challengeTxtValue={challengeTxtValue}
              mode={hnsMode}
              onAbandon={onAbandon}
              rootLabel={rootLabel}
              setupNameservers={setupNameservers}
            />
          ) : null}

          {(isChallengeReady || isChallengePending || isVerifying) && isSpaces && challengePayload ? (
            <NamespaceVerificationSpacesPanel
              busy={busy}
              challengePayload={challengePayload}
              onAbandon={onAbandon}
            />
          ) : null}

          {isVerified ? (
            <div className="rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3">
              <Type as="p" variant="label" className="">{mc.rootVerified}</Type>
            </div>
          ) : null}

          {isFailed || isExpired ? (
            <div className="space-y-3">
              <FormNote tone="warning">
                {getFailureMessage({ copy: mc.failure, failureReason, hnsMode, isExpired, isHns })}
              </FormNote>
            </div>
          ) : null}
        </div>

        <ModalFooter className="mt-6 border-t border-border/70 pt-4 sm:pt-5">
          <div className="flex w-full justify-end gap-3">
            {isVerified ? <Button onClick={() => onOpenChange(false)}>{mc.doneLabel}</Button> : null}
            {isDnsSetupRequired ? (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">{mc.closeLabel}</Button>
                <Button loading={isStarting} onClick={onRestart}>{mc.checkSetup}</Button>
              </>
            ) : null}
            {isChallengePending ? (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">{mc.closeLabel}</Button>
                <Button loading={isVerifying} onClick={onVerify}>{isSpaces ? mc.checkSetup : mc.verifyAction}</Button>
              </>
            ) : null}
            {(isFailed || isExpired) ? (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">{mc.cancelLabel}</Button>
                {isFailed && isHns ? (
                  <Button loading={isVerifying} onClick={onVerify}>{mc.verifyAction}</Button>
                ) : null}
                <Button onClick={onRestart}>{isHns ? mc.continueLabel : mc.newChallenge}</Button>
              </>
            ) : null}
            {isIdle || isStarting ? (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">{mc.cancelLabel}</Button>
                <Button
                  disabled={!canStart}
                  loading={isStarting}
                  onClick={onStart}
                >
                  {isHns ? mc.continueLabel : mc.getChallenge}
                </Button>
              </>
            ) : null}
            {(isChallengeReady || isVerifying) ? (
              <Button disabled={!canSubmitSignature} loading={isVerifying} onClick={onVerify}>
                {isSpaces ? mc.checkSetup : mc.verifyAction}
              </Button>
            ) : null}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
