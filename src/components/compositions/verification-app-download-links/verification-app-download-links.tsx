"use client";

import { AndroidLogo, AppleLogo } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import {
  VERIFICATION_MOBILE_APP_DOWNLOADS,
  type VerificationMobileApp,
} from "@/lib/verification/mobile-app-downloads";

export function VerificationAppDownloadLinks({
  app,
  className,
}: {
  app: VerificationMobileApp;
  className?: string;
}) {
  const config = VERIFICATION_MOBILE_APP_DOWNLOADS[app];

  return (
    <div className={className ?? ""}>
      <div className="grid grid-cols-2 gap-3">
        <Button asChild className="w-full" variant="secondary">
          <a aria-label={`Download ${config.appName} for iOS`} href={config.iosUrl} rel="noopener noreferrer" target="_blank">
            <AppleLogo className="size-5" weight="fill" />
            <span>iOS</span>
          </a>
        </Button>
        <Button asChild className="w-full" variant="secondary">
          <a aria-label={`Download ${config.appName} for Android`} href={config.androidUrl} rel="noopener noreferrer" target="_blank">
            <AndroidLogo className="size-5" weight="fill" />
            <span>Android</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
