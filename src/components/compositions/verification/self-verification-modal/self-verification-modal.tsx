"use client";

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
  title,
}: SelfVerificationModalProps) {
  const hasPrimaryAction = Boolean(href);
  const isMobile = useIsMobile();
  const shouldShowQr = Boolean(selfApp) && !forceMobile && !isMobile;

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
          {hasPrimaryAction ? (
            <Button asChild className="h-14 w-full">
              <a href={href ?? undefined}>
                {actionLabel}
              </a>
            </Button>
          ) : (
            <Button className="h-12 w-full" onClick={() => onOpenChange(false)} variant="secondary">
              Cancel
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
