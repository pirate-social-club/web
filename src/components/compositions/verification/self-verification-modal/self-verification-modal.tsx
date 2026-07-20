"use client";

import * as React from "react";
import { SelfQRcodeWrapper, type SelfApp } from "@selfxyz/qrcode";

import {
  Modal,
} from "@/components/compositions/system/modal/modal";
import {
  StandardModalContent,
  StandardModalHeader,
} from "@/components/compositions/system/modal/standard-modal-layout";
import { VerificationIconBadge } from "@/components/compositions/verification/verification-modal-header/verification-modal-header";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { FormNote } from "@/components/primitives/form-layout";
import { VerificationAppDownloadLinks } from "@/components/compositions/verification/verification-app-download-links/verification-app-download-links";
import { useIsMobile } from "@/hooks/use-mobile";
import { isAndroidRuntime } from "@/lib/platform-detection";

// The Self SDK only console.errors transport failures — its connect_error
// handler never invokes onError — so a blocked or unreachable relay is
// indistinguishable from "waiting for the phone" forever. After this delay,
// tell the user something may be wrong instead of spinning silently.
const SELF_QR_STALL_NOTICE_MS = 45_000;

export interface SelfVerificationModalProps {
  actionLabel: string;
  description: string;
  error?: string | null;
  forceMobile?: boolean;
  href?: string | null;
  onOpenChange: (open: boolean) => void;
  onQrError?: (error: { error_code?: string; reason?: string }) => void;
  onQrSuccess?: () => void;
  open: boolean;
  selfApp?: SelfApp | null;
  /** Test/story override for SELF_QR_STALL_NOTICE_MS. */
  stallNoticeMs?: number;
  title: string;
}

export function SelfVerificationModal({
  actionLabel,
  description,
  error,
  forceMobile,
  href,
  onOpenChange,
  onQrError,
  onQrSuccess,
  open,
  selfApp,
  stallNoticeMs = SELF_QR_STALL_NOTICE_MS,
  title,
}: SelfVerificationModalProps) {
  const isMobile = useIsMobile();
  const shouldShowQr = Boolean(selfApp) && !forceMobile && !isMobile && !isAndroidRuntime();
  const hasPrimaryAction = Boolean(href) && !shouldShowQr;
  const missingLaunchTarget = !shouldShowQr && !hasPrimaryAction;
  const [stallNoticeVisible, setStallNoticeVisible] = React.useState(false);
  const [cspBlock, setCspBlock] = React.useState<{ blockedUri: string; directive: string } | null>(null);

  // Deeplink/mobile flows intentionally get no stall notice: control passes
  // to the Self app, and the same-device flow polls our API on
  // focus/visibility rather than leaving a spinner running.
  React.useEffect(() => {
    setStallNoticeVisible(false);
    if (!open || !shouldShowQr) {
      return;
    }
    const timer = window.setTimeout(() => setStallNoticeVisible(true), stallNoticeMs);
    return () => window.clearTimeout(timer);
  }, [open, selfApp, shouldShowQr, stallNoticeMs]);

  // The Self SDK swallows transport errors, so the only signal that WE
  // blocked the relay (rather than the phone being slow) is the browser's
  // securitypolicyviolation event. Diagnose it explicitly and immediately —
  // "check your connection" is actively misleading when our own CSP is the
  // blocker, as in the 2026-07 incident.
  React.useEffect(() => {
    setCspBlock(null);
    if (!open || !shouldShowQr || typeof document === "undefined") {
      return;
    }
    const handleViolation = (event: SecurityPolicyViolationEvent) => {
      if (event.disposition && event.disposition !== "enforce") {
        return;
      }
      const directive = event.violatedDirective || event.effectiveDirective || "";
      if (!directive.startsWith("connect-src")) {
        return;
      }
      setCspBlock({ blockedUri: event.blockedURI || "unknown host", directive });
    };
    document.addEventListener("securitypolicyviolation", handleViolation);
    return () => document.removeEventListener("securitypolicyviolation", handleViolation);
  }, [open, shouldShowQr]);

  return (
    <Modal forceMobile={forceMobile} onOpenChange={onOpenChange} open={open}>
      <StandardModalContent>
        <StandardModalHeader
          description={description}
          icon={<VerificationIconBadge className="size-16" icon="self" iconClassName="size-8" />}
          title={title}
        />

        <div className="mt-8 space-y-6">
          {error ? <FormNote tone="warning">{error}</FormNote> : null}
          {!error && missingLaunchTarget ? (
            <FormNote tone="warning">Verification link is unavailable. Please close this and try again.</FormNote>
          ) : null}
          {shouldShowQr && selfApp ? (
            <div className="flex justify-center">
              <SelfQRcodeWrapper
                darkMode={false}
                onError={onQrError ?? (() => undefined)}
                onSuccess={onQrSuccess ?? (() => undefined)}
                selfApp={selfApp}
                showBorder={false}
                showStatusText
                size={240}
                type="websocket"
              />
            </div>
          ) : null}
          {cspBlock && shouldShowQr && !error ? (
            <FormNote tone="warning">
              Your browser blocked the connection to the verification service ({cspBlock.directive}: {cspBlock.blockedUri}). This is a problem on our side, not your connection — please try again later.
            </FormNote>
          ) : null}
          {stallNoticeVisible && shouldShowQr && !error && !cspBlock ? (
            <FormNote tone="warning">
              Still waiting for the Self app. If nothing happens, check your connection, then close this and try again.
            </FormNote>
          ) : null}
          {hasPrimaryAction ? (
            <Button asChild className="h-14 w-full">
              <a href={href ?? undefined}>
                {actionLabel}
              </a>
            </Button>
          ) : shouldShowQr ? null : (
            <Button className="h-12 w-full" onClick={() => onOpenChange(false)} variant="secondary">
              Close
            </Button>
          )}

          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="h-px flex-1 bg-border-soft" />
            <Type as="p" className="shrink-0 text-muted-foreground" variant="caption">
              Don't have the app?
            </Type>
            <span aria-hidden="true" className="h-px flex-1 bg-border-soft" />
          </div>

          <VerificationAppDownloadLinks app="self" variant="full" />
        </div>
      </StandardModalContent>
    </Modal>
  );
}
