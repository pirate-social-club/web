"use client";

import { AndroidLogo, AppleLogo, HandPalm } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { VERIFICATION_MOBILE_APP_DOWNLOADS } from "@/lib/verification/mobile-app-downloads";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

import type { OnboardingVerificationGateProps } from "./onboarding-verification-gate.types";

const VERY_DOWNLOADS = VERIFICATION_MOBILE_APP_DOWNLOADS.very;

export function OnboardingVerificationGate({
  verificationState,
  verificationLoading,
  verificationError,
  onVerify,
}: OnboardingVerificationGateProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").onboarding;
  const isPending = verificationState === "pending";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="space-y-7 py-2 text-center sm:rounded-lg sm:border sm:border-border sm:bg-card sm:p-8">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full border border-border bg-muted/40 text-foreground">
          <HandPalm className="size-12" weight="regular" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {copy.verifyStartTitle}
          </h2>
          <p className="mx-auto max-w-xl text-base leading-7 text-muted-foreground">
            {isPending
              ? copy.verifyPendingDescription
              : copy.verifyStartDescription}
          </p>
        </div>

        {verificationError ? (
          <FormNote tone="warning">{verificationError}</FormNote>
        ) : null}

        <Button
          className="mx-auto w-full max-w-sm"
          loading={verificationLoading}
          onClick={onVerify}
          size="lg"
        >
          {isPending ? copy.reopenVerification : copy.verifyAction}
        </Button>

        <div className="space-y-3">
          <p className="text-base text-muted-foreground">{copy.downloadPrompt}</p>
          <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-3 sm:max-w-xl">
            <Button asChild className="w-full" variant="secondary">
              <a href={VERY_DOWNLOADS.iosUrl} rel="noopener noreferrer" target="_blank">
                <AppleLogo className="size-6" weight="fill" />
                <span>{copy.downloadIos}</span>
              </a>
            </Button>
            <Button asChild className="w-full" variant="secondary">
              <a href={VERY_DOWNLOADS.androidUrl} rel="noopener noreferrer" target="_blank">
                <AndroidLogo className="size-6" weight="fill" />
                <span>{copy.downloadAndroid}</span>
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
