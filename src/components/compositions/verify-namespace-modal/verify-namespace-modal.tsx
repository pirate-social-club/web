"use client";

import * as React from "react";
import { At } from "@phosphor-icons/react";
import { Handshake } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { CopyField } from "@/components/primitives/copy-field";
import {
  FormFieldLabel,
  FormNote,
} from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/modal/modal";
import { OptionCard } from "@/components/primitives/option-card";
import { PrefixInput } from "@/components/primitives/prefix-input";
import { toast } from "@/components/primitives/sonner";

import type {
  NamespaceFamily,
  NamespaceVerificationModalState,
  NamespaceVerificationCallbacks,
  VerifyNamespaceModalProps,
} from "./verify-namespace-modal.types";

const namespaceFamilyMeta: Record<NamespaceFamily, {
  label: string;
  externalExample: string;
  detail?: string;
  icon: React.ReactNode;
  disabledHint?: string;
}> = {
  hns: {
    label: "Handshake",
    externalExample: "kanye",
    detail: "Verify root ownership via TXT record.",
    icon: <Handshake className="size-5" />,
  },
  spaces: {
    label: "Spaces",
    externalExample: "kanye",
    detail: "Subspaces are stabilizing before launch.",
    icon: <At className="size-5" />,
    disabledHint: "Coming soon. Namespace verification launches on HNS first.",
  },
};

export function VerifyNamespaceModal({
  open,
  onOpenChange,
  onVerified,
  callbacks,
  initialRootLabel = "",
  forceMobile,
}: VerifyNamespaceModalProps) {
  const [rootLabel, setRootLabel] = React.useState(initialRootLabel);
  const rootLabelRef = React.useRef(rootLabel);
  rootLabelRef.current = rootLabel;
  const [activeFamily, setActiveFamily] = React.useState<NamespaceFamily>("hns");
  const [state, setState] = React.useState<NamespaceVerificationModalState>("idle");
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [challengeHost, setChallengeHost] = React.useState<string | null>(null);
  const [challengeTxtValue, setChallengeTxtValue] = React.useState<string | null>(null);
  const [namespaceVerificationId, setNamespaceVerificationId] = React.useState<string | null>(null);
  const [failureReason, setFailureReason] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setRootLabel(initialRootLabel);
      setActiveFamily("hns");
      setState("idle");
      setSessionId(null);
      setChallengeHost(null);
      setChallengeTxtValue(null);
      setNamespaceVerificationId(null);
      setFailureReason(null);
    }
  }, [open, initialRootLabel]);

  const handleGetRecord = React.useCallback(() => {
    const trimmed = rootLabel.trim().replace(/^[@.]/, "");
    if (!trimmed) return;

    setState("starting");
    setFailureReason(null);

    void callbacks.onStartSession({ rootLabel: trimmed })
      .then((result) => {
        setSessionId(result.namespaceVerificationSessionId);
        setChallengeHost(result.challengeHost);
        setChallengeTxtValue(result.challengeTxtValue);
        setState("record_ready");
      })
      .catch((error: unknown) => {
        setState("idle");
        toast.error(error instanceof Error ? error.message : "Could not start verification");
      });
  }, [callbacks, rootLabel]);

  const handleVerify = React.useCallback(() => {
    if (!sessionId) return;

    setState("verifying");
    setFailureReason(null);

    void callbacks.onCompleteSession({ namespaceVerificationSessionId: sessionId })
      .then((result) => {
        if (result.status === "verified" && result.namespaceVerificationId) {
          setState("verified");
          setNamespaceVerificationId(result.namespaceVerificationId);
          onVerified?.(result.namespaceVerificationId);
        } else if (result.status === "expired") {
          setState("expired");
        } else {
          setState("failed");
          setFailureReason(result.failureReason);
        }
      })
      .catch((error: unknown) => {
        setState("failed");
        toast.error(error instanceof Error ? error.message : "Could not verify namespace");
      });
  }, [callbacks, sessionId, onVerified]);

  const handleRestart = React.useCallback(() => {
    const trimmed = rootLabelRef.current.trim().replace(/^[@.]/, "");
    if (!trimmed) {
      setState("idle");
      setSessionId(null);
      setChallengeHost(null);
      setChallengeTxtValue(null);
      return;
    }

    setState("starting");
    setFailureReason(null);

    void callbacks.onStartSession({ rootLabel: trimmed })
      .then((result) => {
        setSessionId(result.namespaceVerificationSessionId);
        setChallengeHost(result.challengeHost);
        setChallengeTxtValue(result.challengeTxtValue);
        setState("record_ready");
      })
      .catch((error: unknown) => {
        setState("idle");
        setSessionId(null);
        setChallengeHost(null);
        setChallengeTxtValue(null);
        toast.error(error instanceof Error ? error.message : "Could not start verification");
      });
  }, [callbacks]);

  const isIdle = state === "idle";
  const isStarting = state === "starting";
  const isRecordReady = state === "record_ready";
  const isVerifying = state === "verifying";
  const isVerified = state === "verified";
  const isFailed = state === "failed";
  const isExpired = state === "expired";
  const busy = isStarting || isVerifying;
  const hasRootInput = rootLabel.trim().replace(/^[@.]/, "").length > 0;
  const isHns = activeFamily === "hns";

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
          {(isIdle || isStarting) ? (
            <>
              <div className="space-y-2">
                {(Object.keys(namespaceFamilyMeta) as NamespaceFamily[]).map((family) => {
                  const option = namespaceFamilyMeta[family];
                  const disabled = family === "spaces";

                  return (
                    <OptionCard
                      key={family}
                      description={option.detail}
                      disabled={disabled}
                      disabledHint={option.disabledHint}
                      icon={option.icon}
                      selected={family === activeFamily}
                      title={option.label}
                      onClick={() => !disabled && setActiveFamily(family)}
                    />
                  );
                })}
              </div>

              {isHns ? (
                <div>
                  <FormFieldLabel className="mb-1.5" label="Handshake root" />
                  <PrefixInput
                    disabled={busy}
                    onChange={(e) => {
                      setRootLabel(e.target.value);
                    }}
                    placeholder={namespaceFamilyMeta.hns.externalExample}
                    prefix="."
                    value={rootLabel}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {(isRecordReady || isVerifying) && challengeHost && challengeTxtValue ? (
            <div className="space-y-4">
              <FormNote>Add this TXT record, then verify.</FormNote>
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-base text-muted-foreground">Host</p>
                  <CopyField value={challengeHost} />
                </div>
                <div>
                  <p className="mb-1.5 text-base text-muted-foreground">Value</p>
                  <CopyField value={challengeTxtValue} />
                </div>
              </div>
            </div>
          ) : null}

          {isVerified ? (
            <div className="rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3">
              <p className="text-base font-medium text-foreground">Root verified.</p>
            </div>
          ) : null}

          {(isFailed || isExpired) ? (
            <div className="space-y-3">
              <FormNote tone="warning">
                {isExpired
                  ? "Verification expired. Generate a new record."
                  : failureReason
                    ? failureReason.replace(/_/g, " ")
                    : "Could not verify this root. Check the TXT record and try again."}
              </FormNote>
            </div>
          ) : null}
        </div>

        <ModalFooter className="mt-6 border-t border-border/70 pt-4 sm:pt-5">
          <div className="flex w-full justify-end gap-3">
            {isVerified ? (
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            ) : null}
            {(isFailed || isExpired) ? (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">Cancel</Button>
                <Button onClick={handleRestart}>Get new record</Button>
              </>
            ) : null}
            {isIdle || isStarting ? (
              <>
                <Button onClick={() => onOpenChange(false)} variant="outline">Cancel</Button>
                <Button disabled={!hasRootInput || !isHns} loading={isStarting} onClick={handleGetRecord}>Get record</Button>
              </>
            ) : null}
            {(isRecordReady || isVerifying) ? (
              <Button loading={isVerifying} onClick={handleVerify}>Verify</Button>
            ) : null}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
