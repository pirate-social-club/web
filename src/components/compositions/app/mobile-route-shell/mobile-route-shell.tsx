"use client";

import * as React from "react";
import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { cn } from "@/lib/utils";

export function MobileRouteShell({
  children,
  className,
  footer,
  onBackClick,
  onCloseClick,
  title,
  trailingAction,
}: {
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  onBackClick?: () => void;
  onCloseClick?: () => void;
  title: string;
  trailingAction?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <MobilePageHeader
        onBackClick={onBackClick}
        onCloseClick={onCloseClick}
        title={title}
        trailingAction={trailingAction}
      />
      <section
        className={cn(
          "flex min-w-0 flex-1 flex-col px-4 pt-[calc(env(safe-area-inset-top)+5rem)]",
          className,
        )}
      >
        {children}
      </section>
      {footer}
    </div>
  );
}
