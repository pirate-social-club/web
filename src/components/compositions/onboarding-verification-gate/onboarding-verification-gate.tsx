"use client";

import { AndroidLogo, AppleLogo, HandPalm } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

import type { OnboardingVerificationGateProps } from "./onboarding-verification-gate.types";

const VERY_ANDROID_DOWNLOAD_URL = "https://play.google.com/store/apps/details?id=xyz.veros.app&pli=1";
const VERY_IOS_DOWNLOAD_URL = "https://apps.apple.com/us/app/veryai-proof-of-reality/id6746761869";

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
        <div className="mx-auto flex size-20 items-center justify-center rounded-full border border-red-500/35 bg-red-500/5 text-red-500">
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
              <a href={VERY_IOS_DOWNLOAD_URL} rel="noopener noreferrer" target="_blank">
                <AppleLogo className="size-6" weight="fill" />
                <span>{copy.downloadIos}</span>
              </a>
            </Button>
            <Button asChild className="w-full" variant="secondary">
              <a href={VERY_ANDROID_DOWNLOAD_URL} rel="noopener noreferrer" target="_blank">
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
