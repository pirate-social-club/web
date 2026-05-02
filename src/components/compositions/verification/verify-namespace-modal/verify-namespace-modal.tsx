"use client";

import * as React from "react";

import { useNamespaceVerificationFlow } from "@/components/compositions/verification/namespace-verification/use-namespace-verification-flow";

import type { VerifyNamespaceModalProps } from "./verify-namespace-modal.types";
import { VerifyNamespaceModalView } from "./verify-namespace-modal.view";

export function VerifyNamespaceModal({
  open,
  onOpenChange,
  onVerified,
  callbacks,
  initialRootLabel = "",
  initialFamily,
  forceMobile,
  activeSessionId,
  onSessionStarted,
  onSessionCleared,
}: VerifyNamespaceModalProps) {
  const flow = useNamespaceVerificationFlow({
    callbacks,
    initialRootLabel,
    initialFamily,
    activeSessionId,
    enabled: open,
    onSessionStarted,
    onSessionCleared,
    onVerified,
  });

  return (
    <VerifyNamespaceModalView
      activeFamily={flow.activeFamily}
      busy={flow.busy}
      canStart={flow.canStart}
      canSubmitSignature={flow.canSubmitSignature}
      challengePayload={flow.challengePayload}
      challengeTxtValue={flow.challengeTxtValue}
      failureReason={flow.failureReason}
      forceMobile={forceMobile}
      hnsMode={flow.hnsMode}
      isChallengePending={flow.isChallengePending}
      isChallengeReady={flow.isChallengeReady}
      isDnsSetupRequired={flow.isDnsSetupRequired}
      isExpired={flow.isExpired}
      isFailed={flow.isFailed}
      isHns={flow.isHns}
      isIdle={flow.isIdle}
      isSpaces={flow.isSpaces}
      isStarting={flow.isStarting}
      isVerified={flow.isVerified}
      isVerifying={flow.isVerifying}
      onAbandon={flow.actions.reset}
      onFamilyChange={flow.actions.setActiveFamily}
      onOpenChange={onOpenChange}
      onRestart={flow.actions.restart}
      onRootLabelChange={flow.actions.setRootLabel}
      onSignatureChange={flow.actions.setSignature}
      onStart={flow.actions.start}
      onVerify={flow.actions.verify}
      open={open}
      resuming={flow.resuming}
      rootLabel={flow.rootLabel}
      rootLabelError={flow.rootLabelError}
      routePreviewPath={flow.routePreviewPath}
      setupNameservers={flow.setupNameservers}
      signature={flow.signature}
    />
  );
}
