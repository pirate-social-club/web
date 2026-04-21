"use client";

import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { FormNote } from "@/components/primitives/form-layout";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

import type { OnboardingVerificationGateProps } from "./onboarding-verification-gate.types";

export function OnboardingVerificationGate({
  verificationState,
  verificationLoading,
  verificationError,
  onVerify,
  onBackHome,
}: OnboardingVerificationGateProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").onboarding;
  const common = getLocaleMessages(locale, "routes").common;
  const isPending = verificationState === "pending";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="overflow-hidden border-border shadow-none">
        <CardContent className="space-y-6 p-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              {copy.verifyStartTitle}
            </h2>
            <p className="text-base text-muted-foreground">
              {isPending
                ? copy.verifyPendingDescription
                : copy.verifyStartDescription}
            </p>
          </div>

          {verificationError ? (
            <FormNote tone="warning">{verificationError}</FormNote>
          ) : null}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              className="w-full sm:w-auto"
              onClick={onBackHome}
              variant="outline"
            >
              {common.backHome}
            </Button>
            <Button
              className="w-full sm:max-w-xs sm:flex-1"
              loading={verificationLoading}
              onClick={onVerify}
              size="lg"
            >
              {isPending ? copy.reopenVerification : copy.verifyAction}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
