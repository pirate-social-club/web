import * as React from "react";

import { AppHeader } from "@/components/compositions/app/app-shell-chrome/app-header";
import { Type } from "@/components/primitives/type";

export interface MobileThreadScreenProps {
  children: React.ReactNode;
  title: string;
  trailingAction?: React.ReactNode;
  onBackClick?: () => void;
}

export function MobileThreadScreen({
  children,
  title,
  trailingAction,
  onBackClick,
}: MobileThreadScreenProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
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
