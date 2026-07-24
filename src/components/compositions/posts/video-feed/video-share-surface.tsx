"use client";

import * as React from "react";

import type { PostCardShareAction } from "@/components/compositions/posts/post-card/post-card.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/primitives/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/primitives/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function VideoShareSurface({
  actions,
  children,
  title = "Share post",
}: {
  actions: PostCardShareAction[];
  children: React.ReactElement;
  title?: string;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const actionList = (
    <div className="mt-4">
      {actions.map((action) => (
        <button
          className={cn(
            "grid w-full grid-cols-[1.25rem_1fr] items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 text-start text-base text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
            !action.icon && "grid-cols-[1fr]",
            action.destructive && "text-destructive",
          )}
          disabled={action.disabled}
          key={action.key}
          onClick={() => {
            void action.onSelect?.();
            setOpen(false);
          }}
          type="button"
        >
          {action.icon ? <span className="inline-flex size-5 items-center justify-center">{action.icon}</span> : null}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet onOpenChange={setOpen} open={open}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent className="rounded-t-[var(--radius-xl)] px-4 pb-6 pt-4" side="bottom">
          <SheetHeader className="text-start">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription className="sr-only">Choose how to share this post.</SheetDescription>
          </SheetHeader>
          {actionList}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Choose how to share this post.</DialogDescription>
        </DialogHeader>
        {actionList}
      </DialogContent>
    </Dialog>
  );
}
