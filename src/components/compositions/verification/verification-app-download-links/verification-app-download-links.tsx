"use client";

import { AndroidLogo, AppleLogo } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { defaultRouteCopy } from "../../system/route-copy-defaults";
import {
  VERIFICATION_MOBILE_APP_DOWNLOADS,
  type VerificationMobileApp,
} from "@/lib/verification/mobile-app-downloads";

export function VerificationAppDownloadLinks({
  app,
  className,
  variant = "buttons",
}: {
  app: VerificationMobileApp;
  className?: string;
  variant?: "buttons" | "full" | "inline";
}) {
  const config = VERIFICATION_MOBILE_APP_DOWNLOADS[app];
  const copy = defaultRouteCopy;
  const cc = copy.common;

  if (variant === "inline") {
    return (
      <div className={className ?? "flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-muted-foreground"}>
        <span>{cc.downloadAppPrompt.replace("{appName}", config.appName)}</span>
        <a className="font-medium text-foreground underline-offset-4 hover:underline" href={config.iosUrl} rel="noopener noreferrer" target="_blank">
          {cc.appStore}
        </a>
        <a className="font-medium text-foreground underline-offset-4 hover:underline" href={config.androidUrl} rel="noopener noreferrer" target="_blank">
          {cc.googlePlay}
        </a>
      </div>
    );
  }

  return (
    <div className={className ?? ""}>
      <div className={variant === "full" ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "grid grid-cols-2 gap-3"}>
        <Button asChild className={variant === "full" ? "h-14 w-full px-5" : "w-full"} variant={variant === "full" ? "outline" : "secondary"}>
          <a aria-label={cc.downloadFor.replace("{appName}", config.appName).replace("{platform}", "iOS")} href={config.iosUrl} rel="noopener noreferrer" target="_blank">
            <AppleLogo className={variant === "full" ? "size-6" : "size-5"} weight="fill" />
            <span>{variant === "full" ? cc.appStore : "iOS"}</span>
          </a>
        </Button>
        <Button asChild className={variant === "full" ? "h-14 w-full px-5" : "w-full"} variant={variant === "full" ? "outline" : "secondary"}>
          <a aria-label={cc.downloadFor.replace("{appName}", config.appName).replace("{platform}", "Android")} href={config.androidUrl} rel="noopener noreferrer" target="_blank">
            <AndroidLogo className={variant === "full" ? "size-6" : "size-5"} weight="fill" />
            <span>{variant === "full" ? cc.googlePlay : "Android"}</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
