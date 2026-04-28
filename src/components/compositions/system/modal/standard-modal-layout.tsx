"use client";

import * as React from "react";

import {
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/system/modal/modal";
import { typeVariants } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";

export interface StandardModalContentProps
  extends React.ComponentPropsWithoutRef<typeof ModalContent> {
  width?: "default" | "wide";
}

export function StandardModalContent({
  children,
  className,
  mobileSide = "bottom",
  width = "wide",
  ...props
}: StandardModalContentProps) {
  const { dir } = useUiLocale();

  return (
    <ModalContent
      className={cn(
        "flex max-h-[90vh] flex-col overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:px-8 sm:pb-8 sm:pt-8",
        width === "wide" ? "sm:max-w-2xl" : "sm:max-w-lg",
        className,
      )}
      dir={dir}
      mobileSide={mobileSide}
      {...props}
    >
      {children}
    </ModalContent>
  );
}

export function StandardModalIconBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-14 shrink-0 place-items-center rounded-full border border-border-soft bg-muted/45 text-foreground sm:size-16", className)}
    >
      {children}
    </span>
  );
}

export function StandardModalHeader({
  description,
  icon,
  title,
}: {
  description: React.ReactNode;
  icon: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <ModalHeader className="space-y-5 pr-10 text-start">
      <div className="flex items-center gap-4">
        {icon}
        <ModalTitle className={cn(typeVariants({ variant: "h1" }), "min-w-0 text-2xl leading-8 sm:text-3xl sm:leading-tight")} dir="auto">
          {title}
        </ModalTitle>
      </div>
      <ModalDescription className={cn(typeVariants({ variant: "body" }), "w-full text-lg leading-8 text-foreground")} dir="auto">
        {description}
      </ModalDescription>
    </ModalHeader>
  );
}
