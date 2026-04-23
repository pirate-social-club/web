"use client";

import * as React from "react";
import {
  ArrowLeft,
  Bell,
  List,
  Plus,
  Square,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { IconButton } from "@/components/primitives/icon-button";
import { PirateBrandMark } from "@/components/primitives/pirate-brand-mark";
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
  backAriaLabel?: string;
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
  hideBrand?: boolean;
  hideDesktopBrand?: boolean;
  hideMobileBrand?: boolean;
  labels?: AppHeaderLabels;
  mobileLeadingContent?: React.ReactNode;
  mobileCenterContent?: React.ReactNode;
  mobileTrailingContent?: React.ReactNode;
  onBackClick?: () => void;
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
  hideBrand = false,
  hideDesktopBrand = false,
  hideMobileBrand = false,
  labels,
  mobileLeadingContent,
  mobileCenterContent,
  mobileTrailingContent,
  onBackClick,
  onConnectClick,
  onCreateClick,
  onHomeClick,
  onMenuClick,
  onNotificationsClick,
  onProfileClick,
  showCreateAction = true,
  showNotificationsDot = false,
  showNotificationsAction = true,
  showConnectAction = false,
  showProfileAction = true,
  useSidebarTrigger = false,
  userAvatarSrc,
}: AppHeaderProps) {
  const {
    backAriaLabel = "Go back",
    connectLabel = "Connect",
    createLabel = "Create",
    homeAriaLabel = "Go to home",
    notificationsAriaLabel = "Notifications",
    openNavigationAriaLabel = "Open navigation",
    profileAriaLabel = "Open profile",
  } = labels ?? {};
  const detectedMobile = useIsMobile();
  const isMobile = forceMobile ?? detectedMobile;
  const actions: React.ReactNode[] = [];
  if (showCreateAction) {
    actions.push(
      <IconButton
        aria-label={createLabel}
        className="relative"
        disabled={disableCreateAction}
        onClick={onCreateClick}
        title={createActionTitle}
        variant="ghost"
        key="create"
      >
        <CreatePostGlyph />
      </IconButton>,
    );
  }
  if (showNotificationsAction) {
    actions.push(
      <IconButton
        aria-label={notificationsAriaLabel}
        className="relative"
        onClick={onNotificationsClick}
        variant="ghost"
        key="notifications"
      >
        <Bell className="size-6" weight="regular" />
        {showNotificationsDot ? (
          <span className="absolute end-2 top-2 h-2.5 w-2.5 rounded-full bg-primary" />
        ) : null}
      </IconButton>,
    );
  }
  if (showProfileAction && !showConnectAction) {
    actions.push(
      <IconButton
        aria-label={profileAriaLabel}
        className="p-0"
        onClick={onProfileClick}
        variant="ghost"
        key="profile"
      >
        <Avatar
          className="h-11 w-11 bg-card text-base"
          fallback={avatarFallback}
          size="sm"
          src={userAvatarSrc ?? undefined}
        />
      </IconButton>,
    );
  }
  const brand = (
    <button
      aria-label={homeAriaLabel}
      className="inline-flex max-w-full items-center gap-3 rounded-full px-1 py-1 text-start align-middle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onHomeClick}
      type="button"
    >
      <PirateBrandMark className="h-9 w-9 shrink-0" decorative={false} />
      <span className="truncate text-lg font-semibold leading-none tracking-[0.18em] text-foreground">PIRATE</span>
    </button>
  );

  if (isMobile) {
    return (
      <header className={cn("fixed inset-x-0 top-0 z-40 border-b border-border-soft bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md", className)}>
        <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3">
          {mobileLeadingContent ?? (
            useSidebarTrigger ? (
              <SidebarMenuToggleButton ariaLabel={openNavigationAriaLabel} />
            ) : onBackClick ? (
              <IconButton aria-label={backAriaLabel} onClick={onBackClick} variant="ghost">
                <ArrowLeft className="size-6" weight="bold" />
              </IconButton>
            ) : (
              <IconButton aria-label={openNavigationAriaLabel} onClick={onMenuClick} variant="ghost">
                <List className="size-6" weight="bold" />
              </IconButton>
            )
          )}
          <div className="min-w-0 justify-self-start">
            {mobileCenterContent ?? (hideBrand || hideMobileBrand ? null : brand)}
          </div>
          <div className="justify-self-end">
            {mobileTrailingContent ?? (showConnectAction ? (
              <Button className="h-11 px-4" onClick={onConnectClick}>
                {connectLabel}
              </Button>
            ) : <div className="h-11 w-11" aria-hidden="true" />)}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={cn("sticky top-0 z-30 border-b border-border-soft bg-background/95 backdrop-blur-xl", className)}>
      <div className="grid h-[4.5rem] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 lg:px-8">
        <div className="min-w-0 text-start">
          {hideBrand || hideDesktopBrand ? null : brand}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1.5">
          {showConnectAction ? (
            <Button className="h-12 px-5" onClick={onConnectClick}>
              {connectLabel}
            </Button>
          ) : null}
          {actions}
        </div>
      </div>
    </header>
  );
}
