"use client";

import * as React from "react";

import { AppHeader } from "@/components/compositions/app/app-shell-chrome/app-header";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export interface MobileThreadScreenProps {
  children: React.ReactNode;
  className?: string;
  stabilizeForKeyboard?: boolean;
  title: string;
  trailingAction?: React.ReactNode;
  onBackClick?: () => void;
}

function useVisualViewportTopOffset(enabled: boolean) {
  const [offset, setOffset] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) return undefined;

    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const activeViewport: VisualViewport = viewport;

    function updateOffset() {
      setOffset(Math.max(0, activeViewport.offsetTop));
    }

    updateOffset();
    activeViewport.addEventListener("resize", updateOffset);
    activeViewport.addEventListener("scroll", updateOffset);
    return () => {
      activeViewport.removeEventListener("resize", updateOffset);
      activeViewport.removeEventListener("scroll", updateOffset);
    };
  }, [enabled]);

  return offset;
}

export function MobileThreadScreen({
  children,
  className,
  stabilizeForKeyboard = false,
  title,
  trailingAction,
  onBackClick,
}: MobileThreadScreenProps) {
  const viewportTopOffset = useVisualViewportTopOffset(stabilizeForKeyboard);

  return (
    <div
      className={cn(
        "min-h-dvh bg-background text-foreground",
        stabilizeForKeyboard && "overflow-hidden",
        className,
      )}
      style={viewportTopOffset > 0 ? { transform: `translateY(${viewportTopOffset}px)` } : undefined}
    >
      <AppHeader
        forceMobile
        hideBrand
        mobileCenterContent={<Type as="div" variant="h4" className="truncate ">{title}</Type>}
        mobileTrailingContent={trailingAction}
        onBackClick={onBackClick}
        showCreateAction={false}
        showNotificationsAction={false}
        showProfileAction={false}
        showWalletAction={false}
      />
      <main className="flex min-h-dvh w-full flex-col px-4 pb-6 pt-[calc(env(safe-area-inset-top)+5rem)]">
        {children}
      </main>
    </div>
  );
}
