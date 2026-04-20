import * as React from "react";

import { AppHeader } from "@/components/compositions/app-shell-chrome/app-header";

export interface MobileThreadScreenProps {
  children: React.ReactNode;
  title: string;
  trailingAction?: React.ReactNode;
}

export function MobileThreadScreen({
  children,
  title,
  trailingAction,
}: MobileThreadScreenProps) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <AppHeader
        forceMobile
        hideBrand
        mobileCenterContent={<div className="truncate text-lg font-semibold">{title}</div>}
        mobileTrailingContent={trailingAction}
        onBackClick={() => undefined}
      />
      <main className="flex min-h-[100dvh] w-full flex-col px-4 pb-6 pt-[calc(env(safe-area-inset-top)+5rem)]">
        {children}
      </main>
    </div>
  );
}
