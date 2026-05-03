"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { PageContainer } from "@/components/primitives/layout-shell";
import { useApi } from "@/lib/api";
import { updateSessionOnboarding, updateSessionUser, useSession } from "@/lib/api/session-store";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { OnboardingVerificationGate } from "@/components/compositions/verification/onboarding-verification-gate/onboarding-verification-gate";
import { useIsMobile } from "@/hooks/use-mobile";

import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { getErrorMessage } from "@/lib/error-utils";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState } from "@/app/authenticated-helpers/route-shell";

function isHumanVerificationRequest(): boolean {
  return typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("verify") === "human";
}

function getOnboardingExitPath(): string {
  if (typeof window === "undefined") return "/";

  const returnTo = new URLSearchParams(window.location.search).get("return_to");
  if (!returnTo) return "/";

  try {
    const url = new URL(returnTo, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    const href = `${url.pathname}${url.search}${url.hash}`;
    return href.startsWith("/") && !href.startsWith("//") ? href : "/";
  } catch {
    return "/";
  }
}

export function OnboardingPage() {
  const { copy } = useRouteMessages();
  const api = useApi();
  const hydrated = useClientHydrated();
  const isMobile = useIsMobile();
  const session = useSession();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const [onboardingStatus, setOnboardingStatus] = React.useState(session?.onboarding ?? null);

  const {
    startVerification: startHumanVerification,
    verificationError: humanVerificationError,
    verificationLoading: humanVerificationLoading,
    verificationState: humanVerificationState,
  } = useVeryVerification({
    onVerified: async (status) => {
      updateSessionOnboarding(status);
      setOnboardingStatus(status);
      const refreshedUser = await api.users.getMe();
      updateSessionUser(refreshedUser);
    },
    verified: onboardingStatus?.unique_human_verification_status === "verified",
    verificationIntent: "profile_verification",
  });

  React.useEffect(() => {
    let cancelled = false;
    if (!hydrated) return () => { cancelled = true; };
    if (!session) {
      setOnboardingStatus(null);
      setError(null);
      setLoading(false);
      return () => { cancelled = true; };
    }

    setOnboardingStatus(session.onboarding);
    setLoading(false);
    void api.onboarding.getStatus()
      .then((status) => {
        if (cancelled) return;
        updateSessionOnboarding(status);
        setOnboardingStatus(status);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, hydrated, session]);

  const verificationTaskRequested = hydrated && isHumanVerificationRequest();

  if (loading) {
    if (isMobile) {
      return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
          <MobilePageHeader onCloseClick={() => navigate(getOnboardingExitPath())} title="" />
          <section className="flex min-w-0 flex-1 flex-col items-center justify-center px-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
            <FullPageSpinner />
          </section>
        </div>
      );
    }
    return <FullPageSpinner />;
  }

  if (error && !onboardingStatus) {
    if ((error as { status?: number; code?: string }).status === 401 || (error as { code?: string }).code === "auth_error") {
      return <AuthRequiredRouteState description={copy.routeStatus.onboarding.auth} title={copy.onboarding.title} />;
    }
    return <RouteLoadFailureState description={getErrorMessage(error, copy.routeStatus.onboarding.failure)} title={copy.onboarding.title} />;
  }

  if (!session) {
    if (isMobile) {
      return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
          <MobilePageHeader onCloseClick={() => navigate(getOnboardingExitPath())} title="" />
          <section className="flex min-w-0 flex-1 flex-col px-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
            <AuthRequiredRouteState description={copy.routeStatus.onboarding.auth} title="" />
          </section>
        </div>
      );
    }
    return <AuthRequiredRouteState description={copy.routeStatus.onboarding.auth} title={copy.onboarding.title} />;
  }

  const verificationGate = verificationTaskRequested && onboardingStatus?.unique_human_verification_status !== "verified" ? (
    <OnboardingVerificationGate
      onVerify={() => void startHumanVerification()}
      verificationError={humanVerificationError}
      verificationLoading={humanVerificationLoading}
      verificationState={humanVerificationState === "pending" ? "pending" : "not_started"}
    />
  ) : null;

  if (!verificationGate) {
    navigate(getOnboardingExitPath());
    return null;
  }

  if (isMobile) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
        <MobilePageHeader
          onCloseClick={() => navigate(getOnboardingExitPath())}
          title=""
          trailingAction={null}
        />
        <section className="flex min-w-0 flex-1 flex-col justify-start px-4 pb-32 pt-[calc(env(safe-area-inset-top)+5rem)]">
          {verificationGate}
        </section>
      </div>
    );
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <PageContainer>
        {verificationGate}
      </PageContainer>
    </section>
  );
}
