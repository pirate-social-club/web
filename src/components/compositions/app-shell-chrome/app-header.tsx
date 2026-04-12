"use client";

import * as React from "react";
import {
  Bell,
  List,
  Plus,
  UserCircle,
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
  connectLabel?: string;
  createLabel?: string;
  homeAriaLabel?: string;
  notificationsAriaLabel?: string;
  openNavigationAriaLabel?: string;
  profileAriaLabel?: string;
  searchAriaLabel?: string;
  searchPlaceholder?: string;
  verifyLabel?: string;
}

export interface AppHeaderProps {
  avatarFallback?: string;
  className?: string;
  connectLoading?: boolean;
  forceMobile?: boolean;
  hasBrowserAuth?: boolean;
  isAuthenticated?: boolean;
  labels?: AppHeaderLabels;
  onConnectClick?: () => void;
  onCreateClick?: () => void;
  onHomeClick?: () => void;
  onMenuClick?: () => void;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  onSearchClick?: () => void;
  onVerifyClick?: () => void;
  showNotificationsDot?: boolean;
  useSidebarTrigger?: boolean;
  userAvatarSrc?: string | null;
}

export function AppHeader({
  avatarFallback = "Pirate User",
  className,
  connectLoading = false,
  forceMobile,
  hasBrowserAuth = false,
  isAuthenticated = true,
  labels,
  onConnectClick,
  onCreateClick,
  onHomeClick,
  onMenuClick,
  onNotificationsClick,
  onProfileClick,
  onSearchClick,
  onVerifyClick,
  showNotificationsDot = true,
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
    verifyLabel = "Verify",
  } = labels ?? {};
  const detectedMobile = useIsMobile();
  const isMobile = forceMobile ?? detectedMobile;
  const showAvatar = hasBrowserAuth || isAuthenticated;
  const avatarAction = onProfileClick ?? onConnectClick;
  const avatarAriaLabel = profileAriaLabel;
  const avatarFallbackLabel = hasBrowserAuth ? avatarFallback : "Pirate";

  if (isMobile) {
    return (
      <header className={cn("fixed inset-x-0 top-0 z-40 border-b border-border-soft bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md", className)}>
        <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3">
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
          {showAvatar ? (
            <IconButton
              aria-label={avatarAriaLabel}
              disabled={!avatarAction}
              onClick={avatarAction}
              variant="ghost"
            >
              <Avatar
                className="h-11 w-11 border-primary/20 bg-card text-base"
                fallback={avatarFallbackLabel}
                fallbackIcon={<UserCircle aria-hidden className="size-6 text-muted-foreground" weight="fill" />}
                size="sm"
                src={hasBrowserAuth ? userAvatarSrc ?? undefined : undefined}
              />
            </IconButton>
          ) : onConnectClick ? (
            <Button className="h-11 px-4" loading={connectLoading} onClick={onConnectClick} variant="secondary">
              {connectLabel}
            </Button>
          ) : (
            <div className="w-11" />
          )}
        </div>
      </header>
    );
  }

  return (
    <header className={cn("sticky top-0 z-30 border-b border-border-soft bg-background/95 backdrop-blur-xl", className)}>
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[96rem] items-center gap-5 px-5 lg:px-8">
        <IconButton
          aria-label={homeAriaLabel}
          size="lg"
          onClick={onHomeClick}
          variant="ghost"
          className="shrink-0"
        >
          <PirateBrandMark className="h-10 w-10" decorative={false} />
        </IconButton>

        <div className="min-w-0 flex-1">
          <SearchTrigger
            ariaLabel={searchAriaLabel}
            onClick={onSearchClick}
            placeholder={searchPlaceholder}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!showAvatar && onConnectClick ? (
            <Button className="h-12 px-5" loading={connectLoading} onClick={onConnectClick} size="lg">
              {connectLabel}
            </Button>
          ) : null}
          {isAuthenticated && onVerifyClick ? (
            <Button className="h-12 px-5" onClick={onVerifyClick} size="lg">
              {verifyLabel}
            </Button>
          ) : null}
          {isAuthenticated ? (
            <>
              <Button className="h-12 px-5" leadingIcon={<Plus className="size-5" weight="bold" />} onClick={onCreateClick} variant="ghost">
                {createLabel}
              </Button>
              <IconButton
                aria-label={notificationsAriaLabel}
                className="relative"
                onClick={onNotificationsClick}
                size="lg"
                variant="ghost"
              >
                <Bell className="size-6" weight="regular" />
                {showNotificationsDot ? (
                  <span className="absolute end-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-primary" />
                ) : null}
              </IconButton>
              {showAvatar ? (
                <IconButton
                  aria-label={avatarAriaLabel}
                  className="p-0"
                  disabled={!avatarAction}
                  onClick={avatarAction}
                  size="lg"
                  variant="ghost"
                >
                  <Avatar
                    className="h-12 w-12 border-primary/20 bg-card text-base"
                    fallback={avatarFallbackLabel}
                    fallbackIcon={<UserCircle aria-hidden className="size-7 text-muted-foreground" weight="fill" />}
                    size="md"
                    src={hasBrowserAuth ? userAvatarSrc ?? undefined : undefined}
                  />
                </IconButton>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
