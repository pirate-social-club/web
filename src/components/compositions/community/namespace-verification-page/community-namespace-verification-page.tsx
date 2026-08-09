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
import {
  getHnsImportActionLabel,
  HnsImportGuidance,
  hnsImportHasUnsupportedRecords,
  hnsImportNeedsPublishAcknowledgement,
} from "@/components/compositions/verification/namespace-verification/hns-import-guidance";
import {
  getHnsStatusMessage,
  getNamespaceVerificationFailureMessage,
} from "@/components/compositions/verification/namespace-verification/namespace-verification-failure-message";
import { useNamespaceVerificationFlow } from "@/components/compositions/verification/namespace-verification/use-namespace-verification-flow";
import handshakeLogoUrl from "@/assets/namespace-icons/handshake-logo.png";
import spacesLogoUrl from "@/assets/namespace-icons/spaces-protocol-logo.jpeg";

import type {
  NamespaceFamily,
} from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";
import { Type } from "@/components/primitives/type";
import type { ApiCommunityNamespaceAttachment } from "@/lib/api/client-api-types";

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
  namespaceAttachments?: ApiCommunityNamespaceAttachment[];
  callbacks: import("@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types").NamespaceVerificationCallbacks;
  initialFamily?: NamespaceFamily;
  initialRootLabel?: string;
  onBackClick?: () => void;
  onClearPendingSession?: () => Promise<void> | void;
  onRestorePrimary?: (namespaceVerificationId: string) => Promise<void> | void;
  onSessionCleared?: () => void;
  onSessionStarted?: (sessionId: string) => void;
  onVerified?: (namespaceVerificationId: string) => void;
}

export function CommunityNamespaceVerificationPage({
  activeSessionId,
  attachedNamespaceVerificationId,
  attachedRouteSlug,
  namespaceAttachments = [],
  callbacks,
  initialFamily,
  initialRootLabel = "",
  onBackClick,
  onClearPendingSession,
  onRestorePrimary,
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
  const [restoringPrimary, setRestoringPrimary] = React.useState(false);
  const attachedPrimary = namespaceAttachments.find(
    (namespace) => namespace.namespace_role === "primary" && namespace.namespace_verification === attachedNamespaceVerificationId,
  );
  const hasAttachedNamespace = Boolean(
    attachedNamespaceVerificationId && attachedPrimary?.verification_status === "verified",
  );
  const recoverableNamespace = findRecoverableNamespace({
    attachedNamespaceVerificationId,
    namespaceAttachments,
  });
  const needsPrimaryRecovery = recoverableNamespace !== null;
  const needsHnsImportUpgrade = attachedPrimary?.family === "hns"
    && attachedPrimary.hns_setup_status === "legacy_import_required";
  const [addingMirror, setAddingMirror] = React.useState(
    Boolean(attachedNamespaceVerificationId && activeSessionId),
  );

  React.useEffect(() => {
    if (hasAttachedNamespace && activeSessionId) setAddingMirror(true);
  }, [activeSessionId, hasAttachedNamespace]);

  const handleClearPendingSession = React.useCallback(async () => {
    if (!onClearPendingSession || clearingPending) return;
    setClearingPending(true);
    try {
      await onClearPendingSession();
    } finally {
      setClearingPending(false);
    }
  }, [clearingPending, onClearPendingSession]);

  const handleRestorePrimary = React.useCallback(async () => {
    if (!onRestorePrimary || !recoverableNamespace || restoringPrimary) return;
    setRestoringPrimary(true);
    try {
      await onRestorePrimary(recoverableNamespace.namespace_verification);
    } finally {
      setRestoringPrimary(false);
    }
  }, [onRestorePrimary, recoverableNamespace, restoringPrimary]);

  const flow = useNamespaceVerificationFlow({
    callbacks,
    initialRootLabel,
    initialFamily,
    activeSessionId,
    enabled: true,
    onSessionStarted,
    onSessionCleared,
    onVerified: (namespaceVerificationId) => {
      setAddingMirror(false);
      onVerified?.(namespaceVerificationId);
    },
  });

  const handleHnsImportUpgrade = React.useCallback(() => {
    if (!attachedPrimary || attachedPrimary.family !== "hns") return;
    flow.actions.reset();
    flow.actions.setActiveFamily("hns");
    flow.actions.setRootLabel(attachedPrimary.root_label);
    setAddingMirror(true);
  }, [attachedPrimary, flow.actions]);

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
  const hnsImportActionLabel = flow.hnsImportPayload
    ? getHnsImportActionLabel(flow.hnsImportPayload)
    : null;
  const runHnsImportAction = flow.hnsImportPayload
    && hnsImportNeedsPublishAcknowledgement(flow.hnsImportPayload)
    ? flow.actions.verifyPublishedUpdate
    : flow.actions.verify;
  // Unsupported records would be dropped by self-service publishing, so the
  // publish action is hidden entirely until support intervenes.
  const hnsImportBlocked = Boolean(flow.hnsImportPayload
    && hnsImportNeedsPublishAcknowledgement(flow.hnsImportPayload)
    && hnsImportHasUnsupportedRecords(flow.hnsImportPayload));
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
      {flow.isDnsSetupRequired && !hnsImportBlocked ? (
        <Button
          className={primaryButtonClassName}
          loading={flow.isVerifying}
          onClick={flow.hnsImportPayload ? runHnsImportAction : flow.actions.restart}
        >
          {hnsImportActionLabel ?? mc.checkSetup}
        </Button>
      ) : null}
      {flow.isChallengePending && !hnsImportBlocked ? (
        <Button className={primaryButtonClassName} loading={flow.isVerifying} onClick={flow.hnsImportPayload ? runHnsImportAction : flow.actions.verify}>{hnsImportActionLabel ?? (flow.isSpaces ? mc.checkSetup : mc.verifyAction)}</Button>
      ) : null}
      {(flow.isFailed || flow.isExpired) ? (
        <>
          {flow.isExpired && flow.isHns ? (
            <Button className={primaryButtonClassName} loading={flow.isVerifying} onClick={flow.actions.restart}>
              Get a new record list
            </Button>
          ) : null}
          {flow.isFailed && flow.isHns && !hnsImportBlocked ? (
            <Button className={primaryButtonClassName} loading={flow.isVerifying} onClick={flow.hnsImportPayload ? runHnsImportAction : flow.actions.verify}>{hnsImportActionLabel ?? mc.checkAgain}</Button>
          ) : null}
          {flow.isHns ? null : (
            <Button className={primaryButtonClassName} onClick={flow.actions.restart}>{flow.isHns ? mc.getChallenge : mc.newChallenge}</Button>
          )}
        </>
      ) : null}
      {(flow.isIdle || flow.isStarting) ? (
        <Button className={primaryButtonClassName} disabled={!flow.canStart} loading={flow.isStarting} onClick={flow.actions.start}>
          {flow.isHns ? mc.continueLabel : mc.getChallenge}
        </Button>
      ) : null}
      {(flow.isChallengeReady || flow.isVerifying) && !flow.isExpired && !hnsImportBlocked ? (
        <Button className={primaryButtonClassName} disabled={!flow.canSubmitSignature} loading={flow.isVerifying} onClick={flow.hnsImportPayload ? runHnsImportAction : flow.actions.verify}>
          {hnsImportActionLabel ?? (flow.isSpaces ? mc.checkSetup : mc.verifyAction)}
        </Button>
      ) : null}
    </>
  );
  const hnsStatusMessage = getHnsStatusMessage({
    copy: mc.failure,
    failureReason: flow.failureReason,
    hnsMode: flow.hnsMode,
    isChallengePending: flow.isChallengePending,
    isDnsSetupRequired: flow.isDnsSetupRequired,
    isExpired: flow.isExpired,
    isFailed: flow.isFailed,
    isVerifying: flow.isVerifying,
  });
  const hnsStatusBusy = flow.isVerifying;
  const hnsStatusTone = flow.isFailed || flow.isExpired || flow.isDnsSetupRequired || flow.isChallengePending
    ? "warning"
    : "muted";

  if (needsPrimaryRecovery && recoverableNamespace && onRestorePrimary) {
    const label = recoverableNamespace.family === "spaces"
      ? `@${recoverableNamespace.root_label}`
      : `.${recoverableNamespace.root_label}`;

    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8">
        <Type as="h1" variant="h1" className="md:text-4xl">Restore namespace</Type>
        <div className="space-y-4 rounded-[var(--radius-2xl)] border border-border-soft bg-card p-4 md:p-5">
          <FormNote tone="warning">
            {label} is already verified and its signed DNS zone is serving. Restore this existing verification as the community&apos;s primary route; no DNS or wallet update is required.
          </FormNote>
          <Button loading={restoringPrimary} onClick={handleRestorePrimary}>
            Restore as primary
          </Button>
        </div>
      </section>
    );
  }

  if (hasAttachedNamespace && !addingMirror) {
    const publicCommunityUrl = attachedRouteSlug ? `https://pirate.sc/c/${attachedRouteSlug}` : null;
    const handshakeUrl = attachedRouteSlug
      && isHnsNativeRoutingLive(attachedPrimary)
      ? `https://${attachedRouteSlug}/`
      : null;

    if (attachedPrimary?.family === "hns") {
      const recordsComplete = attachedPrimary.hns_setup_status === "setup_complete"
        || attachedPrimary.hns_setup_status === "import_complete";
      const delegationSecure = attachedPrimary.delegation?.delegation_security === "secure";
      const delegationSecurity = attachedPrimary.delegation?.delegation_security;
      const delegationNeedsAttention = attachedPrimary.delegation?.observation_fresh === false
        || delegationSecurity === "bogus"
        || delegationSecurity === "drifted"
        || attachedPrimary.delegation?.routing_hard_denied === true;
      const state = needsHnsImportUpgrade
        ? "recovery"
        : handshakeUrl
          ? "live"
          : delegationNeedsAttention
            ? "attention"
            : "pending";
      const title = state === "recovery"
        ? "HNS setup incomplete"
        : state === "attention"
          ? "HNS delegation needs attention"
        : state === "pending"
          ? "HNS setup pending"
          : "HNS route live";
      const attentionMessage = attachedPrimary.delegation?.routing_hard_denied === true
        ? "Pirate has blocked native routing for this root. Contact Pirate support before publishing another HNS update."
        : attachedPrimary.delegation?.observation_fresh === false
          ? "Pirate's latest delegation check is stale, so native routing cannot advance. Check again later; if this persists, contact Pirate support."
          : delegationSecurity === "drifted"
            ? "The live HNS delegation no longer matches Pirate's expected nameserver or DNSSEC records. Review the complete record set and contact Pirate support before publishing another update."
            : "Pirate cannot validate the published DNSSEC chain. Review the complete HNS record set and contact Pirate support before publishing another update.";

      return (
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
            <Type as="h1" variant="h1" className="md:text-4xl">{title}</Type>
            {onBackClick ? <Button onClick={onBackClick} variant="outline">Back to moderation</Button> : null}
          </div>

          <HnsSetupProgress
            delegationSecure={state === "live" || delegationSecure}
            nativeRouteLive={state === "live"}
            recordsComplete={state === "live" || recordsComplete}
          />

          <div aria-label="HNS setup details" className="space-y-5 rounded-[var(--radius-2xl)] border border-border-soft bg-card p-4 md:p-5">
            {state === "recovery" ? (
              <>
                <div className="space-y-2">
                  <Type as="h2" variant="body-strong">Secure routing still needs an HNS update</Type>
                  <Type as="p" variant="body">
                    You proved ownership, but this root still needs Pirate&apos;s nameserver and DNSSEC records before its native route can be enabled. Your existing community route stays available during setup.
                  </Type>
                </div>
                <Button onClick={handleHnsImportUpgrade}>Generate HNS records</Button>
              </>
            ) : state === "attention" ? (
              <div className="space-y-3">
                <Type as="h2" variant="body-strong">Secure routing cannot advance</Type>
                <FormNote tone="warning">{attentionMessage}</FormNote>
              </div>
            ) : state === "pending" ? (
              <>
                <div className="space-y-2">
                  <Type as="h2" variant="body-strong">Waiting for secure native routing</Type>
                  <Type as="p" variant="body">
                    {delegationSecure
                      ? "The secure delegation is visible. Pirate is completing its routing checks."
                      : "Pirate is waiting for the published HNS records and secure delegation to become visible on-chain."}
                  </Type>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Type as="h2" variant="body-strong">Your HNS route is ready</Type>
                  <Type as="p" variant="body">
                    This community is available at{" "}
                    {publicCommunityUrl ? <a className="text-primary underline-offset-4 hover:underline" href={publicCommunityUrl}>{publicCommunityUrl}</a> : "its Pirate route"}
                    {handshakeUrl ? <>{" "}and{" "}<a className="text-primary underline-offset-4 hover:underline" href={handshakeUrl}>{handshakeUrl}</a></> : null}.
                  </Type>
                </div>

                {namespaceAttachments.length ? (
                  <div className="space-y-2 border-t border-border-soft pt-4">
                    <Type as="h2" variant="body-strong">Attached name namespaces</Type>
                    {namespaceAttachments.map((namespace) => (
                      <div className="flex items-center justify-between gap-3" key={namespace.namespace_verification}>
                        <Type as="span" variant="body">{namespace.family === "spaces" ? `@${namespace.root_label}` : `.${namespace.root_label}`}</Type>
                        <Type as="span" variant="caption">
                          {namespace.namespace_role === "primary" ? "Primary · community route" : "Mirror · names only"}
                        </Type>
                      </div>
                    ))}
                  </div>
                ) : null}

                {activeSessionId ? (
                  <div className="space-y-3 border-t border-border-soft pt-4">
                    <FormNote tone="warning">
                      There is also a pending namespace verification for this community. Clear it before attaching another namespace.
                    </FormNote>
                    <Button loading={clearingPending} onClick={handleClearPendingSession} variant="outline">
                      Clear pending verification
                    </Button>
                  </div>
                ) : (
                  <div className="border-t border-border-soft pt-4">
                    <Button
                      onClick={() => {
                        flow.actions.reset();
                        flow.actions.setRootLabel("");
                        setAddingMirror(true);
                      }}
                      variant="outline"
                    >
                      Attach another namespace
                    </Button>
                    <FormNote className="mt-2">
                      Additional namespaces provide member names only. They do not change this community&apos;s route.
                    </FormNote>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      );
    }

    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <Type as="h1" variant="h1" className="md:text-4xl">
            Success!
          </Type>
          {onBackClick ? <Button onClick={onBackClick} variant="outline">Finish verification</Button> : null}
        </div>

        <div className="space-y-4 rounded-[var(--radius-2xl)] border border-border-soft bg-card p-4 md:p-5">
          <div className="space-y-2">
            {publicCommunityUrl ? (
              <div className="space-y-3">
                <Type as="p" variant="body">
                  Your namespace is now available at{" "}
                  <a className="text-primary underline-offset-4 hover:underline" href={publicCommunityUrl}>
                    {publicCommunityUrl}
                  </a>
                  .
                </Type>
              </div>
            ) : (
              <FormNote>This community namespace is connected. There is nothing else to set up here.</FormNote>
            )}
          </div>

          {namespaceAttachments.length ? (
            <div className="space-y-2 border-t border-border-soft pt-4">
              <Type as="h2" variant="body-strong">Attached name namespaces</Type>
              {namespaceAttachments.map((namespace) => {
                const label = namespace.family === "spaces"
                  ? `@${namespace.root_label}`
                  : `.${namespace.root_label}`;
                return (
                  <div className="flex items-center justify-between gap-3" key={namespace.namespace_verification}>
                    <Type as="span" variant="body">{label}</Type>
                    <Type as="span" variant="caption">
                      {namespace.namespace_role === "primary" ? "Primary · community route" : "Mirror · names only"}
                    </Type>
                  </div>
                );
              })}
            </div>
          ) : null}

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

          {!activeSessionId ? (
            <div className="border-t border-border-soft pt-4">
              <Button
                onClick={() => {
                  flow.actions.reset();
                  flow.actions.setRootLabel("");
                  setAddingMirror(true);
                }}
                variant="outline"
              >
                Attach another namespace
              </Button>
              <FormNote className="mt-2">
                Additional namespaces provide member names only. They do not change this community&apos;s route.
              </FormNote>
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
          <Type as="h1" variant="h1" className="md:text-4xl">Connect Name</Type>
        </div>
        {flow.isVerified ? <Button onClick={() => onBackClick?.()}>{mc.doneLabel}</Button> : null}
      </div>

      <div className="space-y-6">
        {needsPrimaryRecovery ? (
          <FormNote tone="warning">
            This community has a previous namespace attachment, but it is no longer verified for routing. Verify the same name again to restore its signed DNS zone and public route.
          </FormNote>
        ) : null}
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

        {(flow.isDnsSetupRequired || flow.isChallengeReady || flow.isChallengePending || flow.isVerifying || flow.isFailed || flow.isExpired) && flow.isHns && flow.hnsImportPayload ? (
          <HnsImportGuidance
            expired={flow.isExpired}
            failureReason={flow.failureReason}
            payload={flow.hnsImportPayload}
            restartError={flow.restartError}
          />
        ) : null}

        {(flow.isDnsSetupRequired || flow.isChallengeReady || flow.isChallengePending || flow.isVerifying || flow.isFailed || flow.isExpired) && flow.isHns && flow.hnsMode && !flow.hnsImportPayload ? (
          <NamespaceVerificationHnsPanel
            challengePending={flow.isChallengePending}
            challengeTxtValue={flow.challengeTxtValue}
            mode={flow.hnsMode}
            onAbandon={flow.actions.reset}
            rootLabel={flow.rootLabel}
            showAbandonAction={false}
            setupNameservers={flow.setupNameservers}
            statusBusy={hnsStatusBusy}
            statusMessage={hnsStatusMessage}
            statusTone={hnsStatusTone}
          />
        ) : null}

        {(flow.isChallengeReady || flow.isChallengePending || flow.isVerifying) && flow.isSpaces && flow.challengePayload ? (
          <NamespaceVerificationSpacesPanel
            busy={flow.busy}
            challengePayload={flow.challengePayload}
            className="rounded-[var(--radius-2xl)] border border-border-soft bg-card p-4 md:p-5"
            onAbandon={flow.actions.reset}
            showAbandonAction={false}
          />
        ) : null}

        {flow.isVerified ? (
          <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card p-4 md:px-5">
            <Type as="div" variant="body-strong">{mc.rootVerified}</Type>
          </div>
        ) : null}

        {(flow.isFailed || flow.isExpired) && !flow.isHns ? (
          <FormNote tone="warning">
            {getNamespaceVerificationFailureMessage({
              copy: mc.failure,
              failureReason: flow.failureReason,
              hnsMode: flow.hnsMode,
              isExpired: flow.isExpired,
              isHns: flow.isHns,
            })}
          </FormNote>
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

function HnsSetupProgress({
  delegationSecure,
  nativeRouteLive,
  recordsComplete,
}: {
  delegationSecure: boolean;
  nativeRouteLive: boolean;
  recordsComplete: boolean;
}) {
  const steps = [
    { label: "Ownership verified", complete: true },
    { label: "Publish Pirate HNS records", complete: recordsComplete },
    { label: "Confirm secure delegation", complete: delegationSecure },
    { label: "Enable native route", complete: nativeRouteLive },
  ];
  const firstIncomplete = steps.findIndex((step) => !step.complete);

  return (
    <div aria-label="HNS setup progress" className="overflow-hidden rounded-xl border border-border-soft">
      {steps.map((step, index) => {
        const status = step.complete ? "Done" : index === firstIncomplete ? "Next" : "Waiting";
        return (
          <div className="flex items-center justify-between gap-4 border-b border-border-soft px-3 py-3 last:border-b-0" key={step.label}>
            <Type as="span" variant="body">{step.label}</Type>
            <Type as="span" className={cn(step.complete && "text-success", index === firstIncomplete && "text-warning")} variant="caption">
              {status}
            </Type>
          </div>
        );
      })}
    </div>
  );
}

export function findRecoverableNamespace(input: {
  attachedNamespaceVerificationId?: string | null;
  namespaceAttachments: ApiCommunityNamespaceAttachment[];
}): ApiCommunityNamespaceAttachment | null {
  if (!input.attachedNamespaceVerificationId) return null;
  const stalePrimary = input.namespaceAttachments.find(
    (namespace) => namespace.namespace_role === "primary"
      && namespace.namespace_verification === input.attachedNamespaceVerificationId
      && namespace.verification_status !== "verified",
  );
  if (!stalePrimary) return null;

  return input.namespaceAttachments.find(
    (namespace) => namespace.namespace_role === "mirror"
      && namespace.verification_status === "verified"
      && namespace.family === stalePrimary.family
      && namespace.root_label === stalePrimary.root_label,
  ) ?? null;
}

export function isHnsNativeRoutingLive(
  namespace: ApiCommunityNamespaceAttachment | undefined,
): boolean {
  return namespace?.family === "hns"
    && namespace.delegation?.pirate_web_routing_allowed === true
    && namespace.delegation?.canonical_routing_eligible === true
    && namespace.delegation?.routing_hard_denied !== true;
}
