"use client";

import { AndroidLogo, AppleLogo, HandPalm } from "@phosphor-icons/react";

import { StandardModalIconBadge } from "@/components/compositions/modal/standard-modal-layout";
import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { Type } from "@/components/primitives/type";
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
      <div className="flex flex-col px-5 pb-5 pt-5 text-start sm:rounded-lg sm:border sm:border-border sm:bg-card sm:px-8 sm:pb-8 sm:pt-8">
        <div className="space-y-5 pr-10 text-start">
          <div className="flex items-center gap-4">
            <StandardModalIconBadge>
              <HandPalm className="size-8" weight="duotone" />
            </StandardModalIconBadge>
            <Type as="h2" className="min-w-0 leading-tight" dir="auto" variant="h1">
              {copy.verifyStartTitle}
            </Type>
          </div>
          <Type as="p" className="w-full leading-8 text-foreground" dir="auto" variant="body">
            {isPending
              ? copy.verifyPendingDescription
              : copy.verifyStartDescription}
          </Type>
        </div>

        <div className="mt-8 space-y-6">
          {verificationError ? (
            <FormNote tone="warning">{verificationError}</FormNote>
          ) : null}

          <Button
            className="h-14 w-full"
            loading={verificationLoading}
            onClick={onVerify}
          >
            {isPending ? copy.reopenVerification : copy.verifyAction}
          </Button>

          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="h-px flex-1 bg-border-soft" />
            <Type as="p" className="shrink-0 text-muted-foreground" variant="caption">
              {copy.downloadPrompt}
            </Type>
            <span aria-hidden="true" className="h-px flex-1 bg-border-soft" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button asChild className="h-14 w-full px-5" variant="outline">
              <a aria-label={copy.downloadIos} href={VERY_DOWNLOADS.iosUrl} rel="noopener noreferrer" target="_blank">
                <AppleLogo className="size-6" weight="fill" />
                <span>{copy.downloadIos}</span>
              </a>
            </Button>
            <Button asChild className="h-14 w-full px-5" variant="outline">
              <a aria-label={copy.downloadAndroid} href={VERY_DOWNLOADS.androidUrl} rel="noopener noreferrer" target="_blank">
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
