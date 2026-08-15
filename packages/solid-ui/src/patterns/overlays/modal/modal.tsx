import { Dynamic } from "@solidjs/web";
import type { JSX } from "@solidjs/web";
import {
  createContext,
  useContext,
  type Accessor,
  type ParentProps,
} from "solid-js";

import { createClientHydrated } from "@/lib/hydration";
import { createIsMobile } from "@/lib/media-query";
import { cn } from "@/lib/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/overlays/dialog/dialog";
import {
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/overlays/sheet/sheet";
import { typeVariants } from "@/components/data-display/type/type";

const ModalResponsiveContext = createContext<Accessor<boolean>>();

function useModalIsMobile(): Accessor<boolean> {
  const contextValue = useContext(ModalResponsiveContext);
  if (!contextValue) {
    throw new Error("Modal components must be rendered within <Modal>.");
  }
  return contextValue;
}

export interface ModalProps {
  children?: JSX.Element;
  forceMobile?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
}

/**
 * Responsive modal root: renders its content as a centered Dialog on desktop
 * and a Sheet (bottom sheet by default) on mobile. Mobile detection is
 * hydration-gated so SSR always renders the desktop branch; forceMobile
 * overrides detection for stories and tests.
 */
export function Modal(props: ParentProps<ModalProps>) {
  const detectedMobile = createIsMobile();
  const hydrated = createClientHydrated();
  const isMobile = () => props.forceMobile ?? (hydrated() ? detectedMobile() : false);

  const rootProps = () =>
    ({
      open: props.open,
      defaultOpen: props.defaultOpen,
      onOpenChange: props.onOpenChange,
      modal: props.modal,
    }) as const;

  return (
    <ModalResponsiveContext value={isMobile}>
      <Dialog {...rootProps()}>{props.children}</Dialog>
    </ModalResponsiveContext>
  );
}

export interface ModalContentProps {
  children?: JSX.Element;
  class?: string;
  hideCloseButton?: boolean;
  hideCloseButtonOnMobile?: boolean;
  mobileSide?: "top" | "bottom" | "left" | "right";
}

export function ModalContent(props: ParentProps<ModalContentProps>) {
  const isMobile = useModalIsMobile();
  const shouldHideCloseButton = () =>
    props.hideCloseButton || (isMobile() && (props.hideCloseButtonOnMobile ?? false));

  return (
    <Dynamic
      component={isMobile() ? SheetContent : DialogContent}
      class={props.class}
      hideCloseButton={shouldHideCloseButton()}
      {...(isMobile() ? { side: props.mobileSide ?? "bottom" } : {})}
    >
      {props.children}
    </Dynamic>
  );
}

export function ModalHeader(props: ParentProps<{ class?: string }>) {
  const isMobile = useModalIsMobile();
  return (
    <Dynamic component={isMobile() ? SheetHeader : DialogHeader} class={props.class}>
      {props.children}
    </Dynamic>
  );
}

export function ModalFooter(props: ParentProps<{ class?: string }>) {
  const isMobile = useModalIsMobile();
  return (
    <Dynamic component={isMobile() ? SheetFooter : DialogFooter} class={props.class}>
      {props.children}
    </Dynamic>
  );
}

export function ModalTitle(props: ParentProps<{ class?: string }>) {
  const isMobile = useModalIsMobile();
  return (
    <Dynamic
      component={isMobile() ? SheetTitle : DialogTitle}
      class={cn(typeVariants({ variant: "h3" }), props.class)}
    >
      {props.children}
    </Dynamic>
  );
}

export function ModalDescription(props: ParentProps<{ class?: string }>) {
  const isMobile = useModalIsMobile();
  return (
    <Dynamic component={isMobile() ? SheetDescription : DialogDescription} class={props.class}>
      {props.children}
    </Dynamic>
  );
}
