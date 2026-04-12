"use client";

import * as React from "react";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/modal";

import { SelfVerificationView } from "./self-verification-view";
import type { SelfVerificationProps } from "./self-verification.types";

interface SelfVerificationModalProps extends SelfVerificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forceMobile?: boolean;
  mobileSide?: "top" | "bottom" | "left" | "right";
}

export function SelfVerificationModal({
  open,
  onOpenChange,
  forceMobile,
  mobileSide = "bottom",
  title,
  description,
  actions,
  ...viewProps
}: SelfVerificationModalProps) {
  const isBottomSheet = forceMobile !== false && mobileSide === "bottom";

  return (
    <Modal forceMobile={forceMobile} onOpenChange={onOpenChange} open={open}>
      <ModalContent
        className={
          isBottomSheet
            ? "border-border bg-background px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3"
            : "border-border bg-background p-6 sm:w-[min(100%-2rem,34rem)] sm:max-w-[34rem]"
        }
        mobileSide={mobileSide}
      >
        {isBottomSheet ? (
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
        ) : null}
        <ModalHeader>
          <ModalTitle className="text-[1.6rem] leading-tight tracking-tight sm:text-[1.85rem]">
            {title}
          </ModalTitle>
          {description ? (
            <ModalDescription className="mt-1.5 text-base leading-7">
              {description}
            </ModalDescription>
          ) : null}
        </ModalHeader>
        <SelfVerificationView
          {...viewProps}
          actions={actions}
          description={undefined}
          title={title}
        />
      </ModalContent>
    </Modal>
  );
}
