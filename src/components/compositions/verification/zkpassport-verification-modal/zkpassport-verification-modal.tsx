"use client";

import { QRCodeSVG } from "qrcode.react";

import {
  Modal,
} from "@/components/compositions/system/modal/modal";
import {
  StandardModalContent,
  StandardModalHeader,
} from "@/components/compositions/system/modal/standard-modal-layout";
import { VerificationIconBadge } from "@/components/compositions/verification/verification-modal-header/verification-modal-header";
import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { isAndroidRuntime } from "@/lib/platform-detection";

export interface ZkPassportVerificationModalProps {
  actionLabel: string;
  checkLoading?: boolean;
  description: string;
  error?: string | null;
  href?: string | null;
  onCheckPending?: () => Promise<unknown> | void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

export function ZkPassportVerificationModal({
  actionLabel,
  checkLoading = false,
  description,
  error,
  href,
  onCheckPending,
  onOpenChange,
  open,
  title,
}: ZkPassportVerificationModalProps) {
  const isMobile = useIsMobile();
  const shouldShowQr = Boolean(href) && !isMobile && !isAndroidRuntime();
  const hasPrimaryAction = Boolean(href) && !shouldShowQr;
  const missingLaunchTarget = !shouldShowQr && !hasPrimaryAction;

  return (
    <Modal onOpenChange={onOpenChange} open={open}>
      <StandardModalContent>
        <StandardModalHeader
          description={description}
          icon={<VerificationIconBadge className="size-16" icon="zkpassport" iconClassName="size-8" />}
          title={title}
        />

        <div className="mt-8 space-y-6">
          {error ? <FormNote tone="warning">{error}</FormNote> : null}
          {!error && missingLaunchTarget ? (
            <FormNote tone="warning">Verification link is unavailable. Please close this and try again.</FormNote>
          ) : null}
          {shouldShowQr && href ? (
            <div className="flex justify-center">
              <div aria-label="ZKPassport verification QR code" className="rounded-lg border border-border-soft bg-white p-4" role="img">
                <QRCodeSVG
                  bgColor="#ffffff"
                  fgColor="#111111"
                  includeMargin={false}
                  level="M"
                  size={240}
                  value={href}
                />
              </div>
            </div>
          ) : null}
          {hasPrimaryAction ? (
            <Button asChild className="h-14 w-full">
              <a href={href ?? undefined}>
                {actionLabel}
              </a>
            </Button>
          ) : null}
          {onCheckPending ? (
            <Button className="h-12 w-full" loading={checkLoading} onClick={() => void onCheckPending()} variant={shouldShowQr ? "default" : "secondary"}>
              Check verification
            </Button>
          ) : null}
        </div>
      </StandardModalContent>
    </Modal>
  );
}
