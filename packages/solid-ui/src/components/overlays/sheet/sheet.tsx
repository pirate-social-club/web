import {
  Dialog as KDialog,
  useDialogContext,
  type DialogContentProps as KDialogContentProps,
} from "@kobalte/core/dialog";
import type { JSX } from "@solidjs/web";
import {
  createMemo,
  omit,
  Show,
  type ParentProps,
} from "solid-js";

import {
  DialogCloseButtonLayout,
  DialogFooterLayout,
  DialogHeaderLayout,
  dialogDescriptionClass,
  dialogOverlayClass,
  dialogTitleClass,
} from "@/components/overlays/dialog-presentation";
import { cn } from "@/lib/cn";
import { cva, type VariantProps } from "@/lib/recipe";

const Sheet = KDialog;
const SheetTrigger = KDialog.Trigger;
const SheetClose = KDialog.CloseButton;

const sheetContentVariants = cva(
  "fixed z-50 grid gap-4 border border-border bg-card p-6 shadow-xl",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 rounded-b-[var(--radius-xl)] border-b",
        bottom: "inset-x-0 bottom-0 rounded-t-[var(--radius-xl)] border-t",
        left: "inset-y-0 start-0 h-full w-3/4 border-e sm:max-w-sm",
        right: "inset-y-0 end-0 h-full w-3/4 border-s sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

export interface SheetContentProps
  extends KDialogContentProps,
    VariantProps<typeof sheetContentVariants> {
  class?: string;
  hideCloseButton?: boolean;
}

function SheetContent(props: ParentProps<SheetContentProps>) {
  const className = createMemo(() =>
    cn(sheetContentVariants({ side: props.side }), props.class),
  );
  const rest = omit(props, "class", "side", "hideCloseButton", "children");

  return (
    <KDialog.Portal>
      <KDialog.Overlay class={dialogOverlayClass} />
      <KDialog.Content class={className()} {...rest}>
        {props.children}
        <Show when={!props.hideCloseButton}>
          <DialogCloseButtonLayout part={KDialog.CloseButton} />
        </Show>
      </KDialog.Content>
    </KDialog.Portal>
  );
}

function SheetHeader(props: ParentProps<JSX.HTMLAttributes<HTMLDivElement>>) {
  return <DialogHeaderLayout {...props} class={cn("space-y-2", props.class)} />;
}

function SheetFooter(props: ParentProps<JSX.HTMLAttributes<HTMLDivElement>>) {
  return <DialogFooterLayout {...props} class={cn("mt-auto", props.class)} />;
}

function SheetTitle(props: ParentProps<Parameters<typeof KDialog.Title>[0] & { class?: string }>) {
  const className = createMemo(() => cn(dialogTitleClass, props.class));
  const rest = omit(props, "class", "children");

  return (
    <KDialog.Title class={className()} {...rest}>
      {props.children}
    </KDialog.Title>
  );
}

function SheetDescription(
  props: ParentProps<Parameters<typeof KDialog.Description>[0] & { class?: string }>,
) {
  const className = createMemo(() => cn(dialogDescriptionClass, props.class));
  const rest = omit(props, "class", "children");

  return (
    <KDialog.Description class={className()} {...rest}>
      {props.children}
    </KDialog.Description>
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  useDialogContext,
};
