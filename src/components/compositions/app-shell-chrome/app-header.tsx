"use client";

import * as React from "react";
import {
  Bell,
  List,
  Plus,
  Square,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { IconButton } from "@/components/primitives/icon-button";
import { PirateBrandMark } from "@/components/primitives/pirate-brand-mark";
import { SearchTrigger } from "@/components/primitives/search-trigger";
import { useSidebar } from "@/components/compositions/sidebar/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function CreatePostGlyph() {
  return (
    <span className="relative inline-flex size-5 items-center justify-center">
      <Square className="size-5" weight="regular" />
      <Plus className="absolute size-3.5" weight="bold" />
    </span>
  );
}

function SidebarMenuToggleButton({ ariaLabel }: { ariaLabel: string }) {
  const { toggleSidebar } = useSidebar();

  return (
    <IconButton aria-label={ariaLabel} onClick={toggleSidebar} variant="ghost">
      <List className="size-6" weight="bold" />
    </IconButton>
  );
}

export interface AppHeaderLabels {
  connectLabel?: string;
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
  createActionTitle?: string;
  disableCreateAction?: boolean;
  forceMobile?: boolean;
  labels?: AppHeaderLabels;
  onConnectClick?: () => void;
  onCreateClick?: () => void;
  onHomeClick?: () => void;
  onMenuClick?: () => void;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  onSearchClick?: () => void;
  showCreateAction?: boolean;
  showNotificationsDot?: boolean;
  showNotificationsAction?: boolean;
  showConnectAction?: boolean;
  showProfileAction?: boolean;
  useSidebarTrigger?: boolean;
  userAvatarSrc?: string | null;
}

export function AppHeader({
  avatarFallback = "Pirate User",
  className,
  createActionTitle,
  disableCreateAction = false,
  forceMobile,
  labels,
  onConnectClick,
  onCreateClick,
  onHomeClick,
  onMenuClick,
  onNotificationsClick,
  onProfileClick,
  onSearchClick,
  showCreateAction = true,
  showNotificationsDot = true,
  showNotificationsAction = true,
  showConnectAction = false,
  showProfileAction = true,
  useSidebarTrigger = false,
  userAvatarSrc,
}: AppHeaderProps) {
  const {
    connectLabel = "Connect",
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
      <div className="grid h-[4.5rem] w-full grid-cols-[minmax(0,1fr)_minmax(18rem,34rem)_minmax(0,1fr)] items-center gap-4 px-5 lg:px-8">
        <div className="min-w-0">
          <button
            aria-label={homeAriaLabel}
            className="inline-flex items-center gap-3 rounded-full px-1 py-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onHomeClick}
            type="button"
          >
            <PirateBrandMark className="h-9 w-9 shrink-0" decorative={false} />
            <span className="text-lg font-semibold tracking-tight text-foreground">Pirate</span>
          </button>
        </div>

        <div className="min-w-0">
          <SearchTrigger
            ariaLabel={searchAriaLabel}
            size="compact"
            onClick={onSearchClick}
            placeholder={searchPlaceholder}
          />
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1.5">
          {showConnectAction ? (
            <Button className="h-12 px-5" onClick={onConnectClick}>
              {connectLabel}
            </Button>
          ) : null}
          {showCreateAction ? (
            <IconButton
              aria-label={createLabel}
              className="relative"
              disabled={disableCreateAction}
              onClick={onCreateClick}
              title={createActionTitle}
              variant="ghost"
            >
              <CreatePostGlyph />
            </IconButton>
          ) : null}
          {showNotificationsAction ? (
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
          ) : null}
          {showProfileAction && !showConnectAction ? (
            <IconButton
              aria-label={profileAriaLabel}
              className="p-0"
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
          ) : null}
        </div>
      </div>
    </header>
  );
}
