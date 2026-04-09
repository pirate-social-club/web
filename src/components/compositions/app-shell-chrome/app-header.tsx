"use client";

import * as React from "react";
import {
  Bell,
  List,
  MagnifyingGlass,
  Plus,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { PirateBrandMark } from "@/components/primitives/pirate-brand-mark";
import { useSidebar } from "@/components/primitives/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function SearchTrigger({
  compact = false,
  onClick,
  placeholder,
}: {
  compact?: boolean;
  onClick?: () => void;
  placeholder: string;
}) {
  return (
    <button
      aria-label="Search"
      className={cn(
        "flex w-full items-center gap-3 rounded-full border border-input bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary/45 hover:text-foreground",
        compact ? "h-11 px-4" : "h-14 px-5",
      )}
      onClick={onClick}
      type="button"
    >
      <MagnifyingGlass className="size-5 shrink-0" />
      <span className="truncate text-base">{placeholder}</span>
    </button>
  );
}

function SidebarMenuToggleButton() {
  const { toggleSidebar } = useSidebar();

  return (
    <Button aria-label="Open navigation" onClick={toggleSidebar} size="icon" variant="ghost">
      <List className="size-6" weight="bold" />
    </Button>
  );
}

export interface AppHeaderProps {
  avatarFallback?: string;
  className?: string;
  forceMobile?: boolean;
  onCreateClick?: () => void;
  onHomeClick?: () => void;
  onMenuClick?: () => void;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  onSearchClick?: () => void;
  searchPlaceholder?: string;
  showNotificationsDot?: boolean;
  useSidebarTrigger?: boolean;
  userAvatarSrc?: string | null;
}

export function AppHeader({
  avatarFallback = "Pirate User",
  className,
  forceMobile,
  onCreateClick,
  onHomeClick,
  onMenuClick,
  onNotificationsClick,
  onProfileClick,
  onSearchClick,
  searchPlaceholder = "Search Pirate",
  showNotificationsDot = true,
  useSidebarTrigger = false,
  userAvatarSrc,
}: AppHeaderProps) {
  const detectedMobile = useIsMobile();
  const isMobile = forceMobile ?? detectedMobile;

  if (isMobile) {
    return (
      <header className={cn("fixed inset-x-0 top-0 z-40 border-b border-border-soft bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md", className)}>
        <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3">
          {useSidebarTrigger ? (
            <SidebarMenuToggleButton />
          ) : (
            <Button aria-label="Open navigation" onClick={onMenuClick} size="icon" variant="ghost">
              <List className="size-6" weight="bold" />
            </Button>
          )}
          <SearchTrigger compact onClick={onSearchClick} placeholder={searchPlaceholder} />
        </div>
      </header>
    );
  }

  return (
    <header className={cn("sticky top-0 z-30 border-b border-border-soft bg-background/95 backdrop-blur-xl", className)}>
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[96rem] items-center gap-5 px-5 lg:px-8">
        <button
          aria-label="Go to home"
          className="flex shrink-0 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={onHomeClick}
          type="button"
        >
          <PirateBrandMark className="h-11 w-11" decorative={false} />
        </button>

        <div className="min-w-0 flex-1">
          <SearchTrigger onClick={onSearchClick} placeholder={searchPlaceholder} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button className="h-12 px-5" leadingIcon={<Plus className="size-5" weight="bold" />} onClick={onCreateClick} variant="ghost">
            Create
          </Button>
          <Button aria-label="Notifications" className="relative" onClick={onNotificationsClick} size="icon" variant="ghost">
            <Bell className="size-6" weight="regular" />
            {showNotificationsDot ? (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary" />
            ) : null}
          </Button>
          <button
            aria-label="Open profile"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={onProfileClick}
            type="button"
          >
            <Avatar
              className="h-11 w-11 bg-card text-base"
              fallback={avatarFallback}
              size="sm"
              src={userAvatarSrc ?? undefined}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
