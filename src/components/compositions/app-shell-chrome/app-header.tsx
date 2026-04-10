"use client";

import * as React from "react";
import {
  Bell,
  List,
  Plus,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { IconButton } from "@/components/primitives/icon-button";
import { PirateBrandMark } from "@/components/primitives/pirate-brand-mark";
import { SearchTrigger } from "@/components/primitives/search-trigger";
import { useSidebar } from "@/components/primitives/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function SidebarMenuToggleButton({ ariaLabel }: { ariaLabel: string }) {
  const { toggleSidebar } = useSidebar();

  return (
    <IconButton aria-label={ariaLabel} onClick={toggleSidebar} variant="ghost">
      <List className="size-6" weight="bold" />
    </IconButton>
  );
}

export interface AppHeaderLabels {
  createLabel?: string;
  homeAriaLabel?: string;
  notificationsAriaLabel?: string;
  openNavigationAriaLabel?: string;
  profileAriaLabel?: string;
  searchAriaLabel?: string;
  searchPlaceholder?: string;
}

export interface AppHeaderProps {
  avatarFallback?: string;
  className?: string;
  forceMobile?: boolean;
  labels?: AppHeaderLabels;
  onCreateClick?: () => void;
  onHomeClick?: () => void;
  onMenuClick?: () => void;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  onSearchClick?: () => void;
  showNotificationsDot?: boolean;
  useSidebarTrigger?: boolean;
  userAvatarSrc?: string | null;
}

export function AppHeader({
  avatarFallback = "Pirate User",
  className,
  forceMobile,
  labels,
  onCreateClick,
  onHomeClick,
  onMenuClick,
  onNotificationsClick,
  onProfileClick,
  onSearchClick,
  showNotificationsDot = true,
  useSidebarTrigger = false,
  userAvatarSrc,
}: AppHeaderProps) {
  const {
    createLabel = "Create",
    homeAriaLabel = "Go to home",
    notificationsAriaLabel = "Notifications",
    openNavigationAriaLabel = "Open navigation",
    profileAriaLabel = "Open profile",
    searchAriaLabel = "Search",
    searchPlaceholder = "Search Pirate",
  } = labels ?? {};
  const detectedMobile = useIsMobile();
  const isMobile = forceMobile ?? detectedMobile;

  if (isMobile) {
    return (
      <header className={cn("fixed inset-x-0 top-0 z-40 border-b border-border-soft bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md", className)}>
        <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3">
          {useSidebarTrigger ? (
            <SidebarMenuToggleButton ariaLabel={openNavigationAriaLabel} />
          ) : (
            <IconButton aria-label={openNavigationAriaLabel} onClick={onMenuClick} variant="ghost">
              <List className="size-6" weight="bold" />
            </IconButton>
          )}
          <SearchTrigger
            ariaLabel={searchAriaLabel}
            size="compact"
            onClick={onSearchClick}
            placeholder={searchPlaceholder}
          />
        </div>
      </header>
    );
  }

  return (
    <header className={cn("sticky top-0 z-30 border-b border-border-soft bg-background/95 backdrop-blur-xl", className)}>
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[96rem] items-center gap-5 px-5 lg:px-8">
        <IconButton
          aria-label={homeAriaLabel}
          onClick={onHomeClick}
          variant="ghost"
          className="shrink-0"
        >
          <PirateBrandMark className="h-11 w-11" decorative={false} />
        </IconButton>

        <div className="min-w-0 flex-1">
          <SearchTrigger
            ariaLabel={searchAriaLabel}
            onClick={onSearchClick}
            placeholder={searchPlaceholder}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button className="h-12 px-5" leadingIcon={<Plus className="size-5" weight="bold" />} onClick={onCreateClick} variant="ghost">
            {createLabel}
          </Button>
          <IconButton
            aria-label={notificationsAriaLabel}
            className="relative"
            onClick={onNotificationsClick}
            variant="ghost"
          >
            <Bell className="size-6" weight="regular" />
            {showNotificationsDot ? (
              <span className="absolute end-2 top-2 h-2.5 w-2.5 rounded-full bg-primary" />
            ) : null}
          </IconButton>
          <IconButton
            aria-label={profileAriaLabel}
            onClick={onProfileClick}
            variant="ghost"
          >
            <Avatar
              className="h-11 w-11 bg-card text-base"
              fallback={avatarFallback}
              size="sm"
              src={userAvatarSrc ?? undefined}
            />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
