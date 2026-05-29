"use client";

import * as React from "react";
import type {
  CommunityPreview as ApiCommunityPreview,
  JoinEligibility as ApiJoinEligibility,
} from "@pirate/api-contracts";

import { useCommunityJoinVerification } from "@/app/authenticated-state/use-community-join-verification";
import {
  AuthRequiredRouteState,
  FullPageSpinner,
  RouteLoadFailureState,
  StackPageShell,
  StatusCard,
} from "@/app/authenticated-helpers/route-shell";
import { buildCommunityPath } from "@/lib/community-routing";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { getErrorMessage } from "@/lib/error-utils";
import { getGateFailureMessage } from "@/lib/identity-gates";
import { useUiLocale } from "@/lib/ui-locale";
import { CommunityProofOfWorkModal } from "@/components/compositions/community/proof-of-work-modal/community-proof-of-work-modal";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { Button } from "@/components/primitives/button";
import { PageContainer } from "@/components/primitives/layout-shell";
import { toast } from "@/components/primitives/sonner";

function communityPath(preview: ApiCommunityPreview | null, fallbackCommunityId: string): string {
  if (!preview) {
    return `/c/${encodeURIComponent(fallbackCommunityId)}`;
  }
  return buildCommunityPath(preview.id, preview.route_slug ?? fallbackCommunityId);
}

function verificationDescription(
  eligibility: ApiJoinEligibility | null,
  communityName: string,
  locale: string,
): string {
  if (!eligibility) {
    return `Sign in with Telegram or Pirate to check whether you can join ${communityName}.`;
  }
  switch (eligibility.status) {
    case "already_joined":
      return `You are already a member of ${communityName}.`;
    case "joinable":
      return `Your account can join ${communityName}.`;
    case "requestable":
      return `Your account can request access to ${communityName}.`;
    case "pending_request":
      return `Your request to join ${communityName} is pending.`;
    case "verification_required":
      return `${communityName} requires identity verification before you can join.`;
    case "gate_failed":
      return getGateFailureMessage(eligibility, { locale })
        ?? `Your account does not currently meet ${communityName}'s requirements.`;
    default:
      return `Check your eligibility for ${communityName}.`;
  }
}

function primaryActionLabel(eligibility: ApiJoinEligibility | null): string {
  if (!eligibility) return "Check eligibility";
  switch (eligibility.status) {
    case "already_joined":
      return "Joined";
    case "joinable":
      return "Join community";
    case "requestable":
      return "Request access";
    case "pending_request":
      return "Request pending";
    case "verification_required":
    case "gate_failed":
      return "Start verification";
    default:
      return "Continue";
  }
}

export function CommunityVerificationPage({ communityId }: { communityId: string }) {
  const api = useApi();
  const session = useSession();
  const { locale } = useUiLocale();
  const [preview, setPreview] = React.useState<ApiCommunityPreview | null>(null);
  const [eligibility, setEligibility] = React.useState<ApiJoinEligibility | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const [proofOfWorkModalOpen, setProofOfWorkModalOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEligibility(null);

    void api.publicCommunities.get(communityId, { locale })
      .then(async (nextPreview) => {
        if (cancelled) return;
        setPreview(nextPreview);
        if (!session) return;
        const nextEligibility = await api.communities.getJoinEligibility(nextPreview.id);
        if (!cancelled) setEligibility(nextEligibility);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(nextError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api.communities, api.publicCommunities, communityId, locale, session]);

  const resolvedCommunityId = preview?.id ?? communityId;
  const refetchEligibility = React.useCallback(async () => {
    const nextEligibility = await api.communities.getJoinEligibility(resolvedCommunityId);
    setEligibility(nextEligibility);
    return nextEligibility;
  }, [api.communities, resolvedCommunityId]);

  const openPath = communityPath(preview, communityId);
  const communityName = preview?.display_name ?? "this community";
  const {
    altchaAction,
    altchaPayload,
    altchaRequired,
    altchaScope,
    handleJoin,
    handleSelfModalOpenChange,
    handleSelfQrError,
    handleSelfQrSuccess,
    joinError,
    joinLoading,
    passportLoading,
    selfError,
    selfLoading,
    selfModalOpen,
    selfPrompt,
    setAltchaPayload,
    veryLoading,
    zkPassportHref,
    zkPassportLoading,
  } = useCommunityJoinVerification({
    communityId: resolvedCommunityId,
    eligibility,
    locale,
    onJoined: async () => {
      toast.success("Joined community.");
      await refetchEligibility();
    },
    refetchEligibility,
  });

  React.useEffect(() => {
    if (joinError) toast.error(joinError);
  }, [joinError]);

  const handlePrimaryAction = React.useCallback(async () => {
    if (altchaRequired && !altchaPayload) {
      setProofOfWorkModalOpen(true);
      return;
    }
    await handleJoin();
  }, [altchaPayload, altchaRequired, handleJoin]);

  if (loading) {
    return <FullPageSpinner />;
  }

  if (error) {
    return (
      <RouteLoadFailureState
        title="Community verification"
        description={getErrorMessage(error, "Could not load this community.")}
      />
    );
  }

  if (!session) {
    return (
      <AuthRequiredRouteState
        title="Verify to join"
        description={`Sign in with Telegram or Pirate to verify eligibility for ${communityName}.`}
        ctaLabel="Sign in"
      />
    );
  }

  const busy = joinLoading || passportLoading || selfLoading || veryLoading || zkPassportLoading;
  const primaryDisabled = eligibility?.status === "already_joined" || eligibility?.status === "pending_request";

  return (
    <PageContainer className="min-w-0 flex-1">
      <StackPageShell headerVariant="plain" title="Verify to join">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <StatusCard
            title={communityName}
            description={verificationDescription(eligibility, communityName, locale)}
            flatOnMobile
            tone={eligibility?.status === "already_joined" ? "success" : "default"}
            actions={(
              <>
                <Button disabled={primaryDisabled} loading={busy} onClick={handlePrimaryAction}>
                  {primaryActionLabel(eligibility)}
                </Button>
                <Button asChild variant="secondary">
                  <a href={openPath}>Open community</a>
                </Button>
              </>
            )}
          />
          {zkPassportHref ? (
            <StatusCard
              title="Verification opened"
              description="If the verification page did not open, use the link below. Return here after finishing and press Start verification again to refresh your status."
              flatOnMobile
              actions={(
                <Button asChild variant="secondary">
                  <a href={zkPassportHref} rel="noreferrer" target="_blank">Open verification</a>
                </Button>
              )}
            />
          ) : null}
        </div>
      </StackPageShell>

      {altchaRequired ? (
        <CommunityProofOfWorkModal
          action={altchaAction}
          continueDisabled={!altchaPayload}
          continueLoading={joinLoading}
          description="This usually takes a few seconds and runs only on this device."
          locale={locale}
          onContinue={async () => {
            setProofOfWorkModalOpen(false);
            await handleJoin({ altchaPayload });
          }}
          onOpenChange={setProofOfWorkModalOpen}
          onPayloadChange={setAltchaPayload}
          open={proofOfWorkModalOpen}
          requirements={eligibility?.membership_gate_summaries}
          scope={altchaScope}
        />
      ) : null}
      {selfPrompt ? (
        <SelfVerificationModal
          actionLabel={selfPrompt.actionLabel}
          description={selfPrompt.description}
          error={selfError}
          href={selfPrompt.href}
          onOpenChange={handleSelfModalOpenChange}
          onQrError={handleSelfQrError}
          onQrSuccess={handleSelfQrSuccess}
          open={selfModalOpen}
          selfApp={selfPrompt.selfApp}
          title={selfPrompt.title}
        />
      ) : null}
    </PageContainer>
  );
}
