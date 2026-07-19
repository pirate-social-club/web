"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";
import { typeVariants } from "@/components/primitives/type";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";
import {
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/primitives/sheet";

const ModalResponsiveContext = React.createContext<boolean | null>(null);

function useModalIsMobile() {
  const contextValue = React.use(ModalResponsiveContext);

  if (contextValue === null) {
    throw new Error("Modal components must be rendered within <Modal>.");
  }

  return contextValue;
}

interface ModalProps extends React.ComponentProps<typeof Dialog> {
  forceMobile?: boolean;
}

function Modal({ forceMobile, ...props }: ModalProps) {
  const detectedMobile = useIsMobile();
  const isMobile = forceMobile ?? detectedMobile;

  return (
    <ModalResponsiveContext.Provider value={isMobile}>
      <Dialog {...props} />
    </ModalResponsiveContext.Provider>
  );
}

interface ModalContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content> {
  hideCloseButton?: boolean;
  hideCloseButtonOnMobile?: boolean;
  mobileSide?: "top" | "bottom" | "left" | "right";
}

function ModalContent({ className, hideCloseButton = false, hideCloseButtonOnMobile = false, mobileSide = "bottom", ref, ...props }: ModalContentProps) {
  const isMobile = useModalIsMobile();
  const shouldHideCloseButton = hideCloseButton || (isMobile && hideCloseButtonOnMobile);

  if (isMobile) {
    return <SheetContent className={className} hideCloseButton={shouldHideCloseButton} ref={ref} side={mobileSide} {...props} />;
  }

  return <DialogContent className={className} hideCloseButton={shouldHideCloseButton} ref={ref} {...props} />;
}

const ModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useModalIsMobile();
  const Comp = isMobile ? SheetHeader : DialogHeader;

  return <Comp className={className} {...props} />;
};
ModalHeader.displayName = "ModalHeader";

const ModalFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useModalIsMobile();
  const Comp = isMobile ? SheetFooter : DialogFooter;

  return <Comp className={className} {...props} />;
};
ModalFooter.displayName = "ModalFooter";

function ModalTitle({ className, ref, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  const isMobile = useModalIsMobile();
  const Comp = isMobile ? SheetTitle : DialogTitle;

  return <Comp className={cn(typeVariants({ variant: "h3" }), className)} ref={ref} {...props} />;
}

function ModalDescription({ className, ref, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  const isMobile = useModalIsMobile();
  const Comp = isMobile ? SheetDescription : DialogDescription;

  return <Comp className={cn(className)} ref={ref} {...props} />;
}

export {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
};
