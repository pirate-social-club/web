"use client";

import * as React from "react";
import { At, Handshake } from "@phosphor-icons/react";

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
  NamespaceVerificationChallengeMessage,
} from "@/components/compositions/namespace-verification/namespace-verification-shared";
import { OptionCard } from "@/components/primitives/option-card";
import { PrefixInput } from "@/components/primitives/prefix-input";

import type {
  NamespaceFamily,
  SpacesChallengePayload,
} from "./verify-namespace-modal.types";

export const namespaceFamilyMeta: Record<
  NamespaceFamily,
  {
    label: string;
    externalExample: string;
    detail: string;
    rootInputLabel: string;
    rootInputPrefix?: string;
    icon: React.ReactNode;
  }
> = {
  hns: {
    label: "Handshake",
    externalExample: "kanye",
    detail: "Set up DNS first, then verify root ownership.",
    rootInputLabel: "Handshake root",
    rootInputPrefix: ".",
    icon: <Handshake className="size-5" />,
  },
  spaces: {
    label: "Spaces",
    externalExample: "kanye",
    detail: "Verify root ownership by signing a challenge.",
    rootInputLabel: "Spaces root",
    rootInputPrefix: "@",
    icon: <At className="size-5" />,
  },
};

function getFailureMessage({
  failureReason,
  hnsMode,
  isExpired,
  isHns,
}: {
  failureReason: string | null;
  hnsMode: ReturnType<typeof getHnsVerificationMode> | null;
  isExpired: boolean;
  isHns: boolean;
}) {
  if (isExpired) {
    return "Verification expired. Generate a new challenge.";
  }

  if (failureReason) {
    return failureReason.replace(/_/g, " ");
  }

  if (isHns && hnsMode === "dns_setup_required") {
    return "Set nameservers first, then refresh the session.";
  }

  if (isHns) {
    return "Could not verify this root. Check the TXT record and try again.";
  }

  return "Could not verify this root. Check the signature and try again.";
}

export function VerifyNamespaceModalView({
  activeFamily,
  busy,
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
  setupNameservers,
  signature,
}: {
  activeFamily: NamespaceFamily;
  busy: boolean;
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
  setupNameservers: string[] | null;
  signature: string;
}) {
  const meta = namespaceFamilyMeta[activeFamily];
  const hasRootInput = rootLabel.trim().replace(/^[@.]/, "").length > 0;
  const verifyActionLabel = "Verify";

  return (
    <Modal forceMobile={forceMobile} onOpenChange={onOpenChange} open={open}>
      <ModalContent className="border-border bg-background p-6 sm:w-[min(100%-2rem,34rem)] sm:max-w-[34rem]">
        <ModalHeader className="pr-10 text-left">
          <ModalTitle className="text-[1.6rem] leading-tight tracking-tight sm:text-[1.85rem]">
            Verify namespace
          </ModalTitle>
          <ModalDescription className="max-w-[34ch] text-base leading-7">
            Verify control of a namespace so it can be attached to this community.
          </ModalDescription>
        </ModalHeader>

        <div className="mt-6 space-y-5">
          {(isIdle || isStarting) && !resuming ? (
            <>
              <div className="space-y-2">
                {(Object.keys(namespaceFamilyMeta) as NamespaceFamily[]).map((family) => {
                  const option = namespaceFamilyMeta[family];
                  return (
                    <OptionCard
                      key={family}
                      description={option.detail}
                      icon={option.icon}
                      selected={family === activeFamily}
                      title={option.label}
                      onClick={() => onFamilyChange(family)}
                    />
                  );
                })}
              </div>

              <div>
                <FormFieldLabel className="mb-1.5" label={meta.rootInputLabel} />
                <PrefixInput
                  disabled={busy}
                  onChange={(event) => onRootLabelChange(event.target.value)}
                  placeholder={meta.externalExample}
                  prefix={meta.rootInputPrefix ?? ""}
                  value={rootLabel}
                />
              </div>

              {isHns ? (
                <FormNote>
                  Start with nameserver setup when the root does not already have authoritative DNS. Only add TXT after that path is live.
                </FormNote>
              ) : null}
            </>
          ) : null}

          {resuming ? (
            <div className="flex items-center justify-center py-8 text-base text-muted-foreground">
              Resuming verification...
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

          {(isChallengeReady || isVerifying) && isSpaces && challengePayload ? (
            <div className="space-y-4">
              <FormNote>Copy the digest, sign it with your root key, then paste the signature.</FormNote>
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-base text-muted-foreground">Digest</p>
                  <CopyField value={challengePayload.digest} />
                </div>
                <div>
                  <FormFieldLabel className="mb-1.5" label="Signature" />
                  <Input
                    disabled={busy}
                    onChange={(event) => onSignatureChange(event.target.value)}
                    placeholder="Paste your schnorr signature here"
                    value={signature}
                  />
                </div>
              </div>
              <Accordion collapsible type="single">
                <AccordionItem className="border-b-0" value="details">
                  <AccordionTrigger className="py-1 text-base text-muted-foreground hover:no-underline">
                    Challenge details
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <NamespaceVerificationChallengeMessage value={challengePayload.message} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <button
                className="text-base text-muted-foreground hover:text-foreground"
                type="button"
                onClick={onAbandon}
              >
                Verify a different namespace
              </button>
            </div>
          ) : null}

          {isVerified ? (
            <div className="rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3">
              <p className="text-base font-medium text-foreground">Root verified.</p>
            </div>
          ) : null}

          {isFailed || isExpired ? (
            <div className="space-y-3">
              <FormNote tone="warning">
                {getFailureMessage({ failureReason, hnsMode, isExpired, isHns })}
              </FormNote>
            </div>
          ) : null}
        </div>

        <ModalFooter className="mt-6 border-t border-border/70 pt-4 sm:pt-5">
          <div className="flex w-full justify-end gap-3">
            {isVerified ? <Button onClick={() => onOpenChange(false)}>Done</Button> : null}
            {isDnsSetupRequired ? (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
                <Button loading={isStarting} onClick={onRestart}>Check setup</Button>
              </>
            ) : null}
            {isChallengePending ? (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
                <Button loading={isVerifying} onClick={onVerify}>{verifyActionLabel}</Button>
              </>
            ) : null}
            {(isFailed || isExpired) ? (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">Cancel</Button>
                {isFailed && isHns ? (
                  <Button loading={isVerifying} onClick={onVerify}>{verifyActionLabel}</Button>
                ) : null}
                <Button onClick={onRestart}>{isHns ? "Continue" : "New challenge"}</Button>
              </>
            ) : null}
            {isIdle || isStarting ? (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">Cancel</Button>
                <Button
                  disabled={!hasRootInput}
                  loading={isStarting}
                  onClick={onStart}
                >
                  {isHns ? "Continue" : "Get challenge"}
                </Button>
              </>
            ) : null}
            {(isChallengeReady || isVerifying) ? (
              <Button disabled={!canSubmitSignature} loading={isVerifying} onClick={onVerify}>
                {verifyActionLabel}
              </Button>
            ) : null}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
