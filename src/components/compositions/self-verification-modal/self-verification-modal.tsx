"use client";

import * as React from "react";
import QRCode from "qrcode";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/modal/modal";
import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { Spinner } from "@/components/primitives/spinner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";

function VerificationQr({ value }: { value: string }) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    void QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
    })
      .then((nextSrc: string) => {
        if (cancelled) return;
        setSrc(nextSrc);
        setError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSrc(null);
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (error) {
    return <FormNote tone="warning">Could not render the verification QR code.</FormNote>;
  }

  if (!src) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-[var(--radius-lg)] border border-border-soft bg-card">
        <Spinner className="size-5" />
      </div>
    );
  }

  return (
    <div className="flex justify-center rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
      <img
        alt="Self verification QR code"
        className="size-72 max-w-full rounded-[var(--radius-md)]"
        height={288}
        src={src}
        width={288}
      />
    </div>
  );
}

export interface SelfVerificationModalProps {
  actionLabel: string;
  description: string;
  error?: string | null;
  href?: string | null;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  qrValue?: string | null;
  title: string;
}

export function SelfVerificationModal({
  actionLabel,
  description,
  error,
  href,
  loading,
  onOpenChange,
  open,
  qrValue,
  title,
}: SelfVerificationModalProps) {
  const isMobile = useIsMobile();
  const { dir } = useUiLocale();

  return (
    <Modal onOpenChange={onOpenChange} open={open}>
      <ModalContent className="max-h-[90vh] overflow-y-auto gap-5 px-5 py-5 sm:max-w-lg sm:gap-6 sm:px-6" dir={dir} mobileSide="bottom">
        <ModalHeader className="gap-3 text-start">
          <ModalTitle dir="auto">{title}</ModalTitle>
          <ModalDescription dir="auto">{description}</ModalDescription>
        </ModalHeader>

        <div className="space-y-4">
          {!isMobile && qrValue ? <VerificationQr value={qrValue} /> : null}
          {loading ? (
            <div className="flex items-center gap-2">
              <Spinner className="size-4" />
              <span className="text-base text-muted-foreground">Processing verification...</span>
            </div>
          ) : null}
          {error ? <FormNote tone="warning">{error}</FormNote> : null}
        </div>

        <ModalFooter className="mt-1 gap-3">
          {isMobile && href ? (
            <Button asChild className="w-full">
              <a href={href} rel="noopener noreferrer" target="_blank">
                {actionLabel}
              </a>
            </Button>
          ) : null}
          <Button className={isMobile ? "w-full" : undefined} onClick={() => onOpenChange(false)} variant="ghost">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
