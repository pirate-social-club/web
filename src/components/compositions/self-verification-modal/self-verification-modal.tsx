"use client";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/modal/modal";
import { VerificationIconBadge } from "@/components/compositions/verification-modal-header/verification-modal-header";
import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";
import { Type, typeVariants } from "@/components/primitives/type";
import { FormNote } from "@/components/primitives/form-layout";
import { VerificationAppDownloadLinks } from "@/components/compositions/verification-app-download-links/verification-app-download-links";
import { useUiLocale } from "@/lib/ui-locale";

export interface SelfVerificationModalProps {
  actionLabel: string;
  description: string;
  error?: string | null;
  forceMobile?: boolean;
  href?: string | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

export function SelfVerificationModal({
  actionLabel,
  description,
  error,
  forceMobile,
  href,
  onOpenChange,
  open,
  title,
}: SelfVerificationModalProps) {
  const { dir } = useUiLocale();
  const hasPrimaryAction = Boolean(href);

  return (
    <Modal forceMobile={forceMobile} onOpenChange={onOpenChange} open={open}>
      <ModalContent
        className="flex max-h-[90vh] flex-col overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:max-w-2xl sm:px-8 sm:pb-8 sm:pt-8"
        dir={dir}
        mobileSide="bottom"
      >
        <ModalHeader className="space-y-5 pr-10 text-start">
          <div className="flex items-center gap-4">
            <VerificationIconBadge className="size-16" icon="self" iconClassName="size-8" />
            <ModalTitle className={cn(typeVariants({ variant: "h1" }), "min-w-0 leading-tight")} dir="auto">
              {title}
            </ModalTitle>
          </div>
          <ModalDescription className={cn(typeVariants({ variant: "body" }), "w-full leading-8 text-foreground")} dir="auto">
            {description}
          </ModalDescription>
        </ModalHeader>

        <div className="mt-8 space-y-6">
          {error ? <FormNote tone="warning">{error}</FormNote> : null}
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
      </ModalContent>
    </Modal>
  );
}
