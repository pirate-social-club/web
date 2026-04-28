"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  ChatCircle,
  List,
  Plus,
  Square,
  Wallet,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { IconButton } from "@/components/primitives/icon-button";
import { PirateBrandMark } from "@/components/primitives/pirate-brand-mark";
import { useSidebar } from "@/components/compositions/system/sidebar/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { Type } from "@/components/primitives/type";

function formatUnreadCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

function normalizeUnreadCount(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.floor(count));
}

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
  chatAriaLabel?: string;
  homeAriaLabel?: string;
  notificationsAriaLabel?: string;
  openNavigationAriaLabel?: string;
  profileAriaLabel?: string;
  searchAriaLabel?: string;
  searchPlaceholder?: string;
  walletAriaLabel?: string;
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
  onChatClick?: () => void;
  onHomeClick?: () => void;
  onMenuClick?: () => void;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  onSearchClick?: () => void;
  onWalletClick?: () => void;
  showCreateAction?: boolean;
  showChatAction?: boolean;
  showMobileCreateAction?: boolean;
  showNotificationsAction?: boolean;
  showConnectAction?: boolean;
  showProfileAction?: boolean;
  showWalletAction?: boolean;
  unreadChatCount?: number;
  unreadNotificationsCount?: number;
  useSidebarTrigger?: boolean;
  userAvatarSeed?: string | null;
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
  onChatClick,
  onHomeClick,
  onMenuClick,
  onNotificationsClick,
  onProfileClick,
  onWalletClick,
  showCreateAction = true,
  showChatAction = false,
  showMobileCreateAction = false,
  showNotificationsAction = true,
  showConnectAction = false,
  showProfileAction = true,
  showWalletAction = false,
  unreadChatCount = 0,
  unreadNotificationsCount = 0,
  useSidebarTrigger = false,
  userAvatarSeed,
  userAvatarSrc,
}: AppHeaderProps) {
  const {
    backAriaLabel = "Go back",
    connectLabel = "Connect",
    chatAriaLabel = "Messages",
    createLabel = "Create",
    homeAriaLabel = "Go to home",
    notificationsAriaLabel = "Notifications",
    openNavigationAriaLabel = "Open navigation",
    profileAriaLabel = "Open profile",
    walletAriaLabel = "Wallet",
  } = labels ?? {};
  const detectedMobile = useIsMobile();
  const isMobile = forceMobile ?? detectedMobile;
  const { isRtl } = useUiLocale();
  const normalizedUnreadChatCount = normalizeUnreadCount(unreadChatCount);
  const normalizedUnreadNotificationsCount = normalizeUnreadCount(unreadNotificationsCount);
  const chatAccessibleLabel = normalizedUnreadChatCount > 0
    ? `${chatAriaLabel}, ${normalizedUnreadChatCount}`
    : chatAriaLabel;
  const unreadNotificationsLabel = normalizedUnreadNotificationsCount > 0
    ? `${notificationsAriaLabel}, ${normalizedUnreadNotificationsCount}`
    : notificationsAriaLabel;
  const createAction = showCreateAction ? (
    <IconButton
      aria-label={createLabel}
      className="relative"
      disabled={disableCreateAction}
      onClick={onCreateClick}
      title={createActionTitle}
      variant="ghost"
      key="create"
    >
      {isMobile ? <Plus className="size-6" weight="bold" /> : <CreatePostGlyph />}
    </IconButton>
  ) : null;
  const notificationsAction = showNotificationsAction ? (
    <IconButton
      aria-label={unreadNotificationsLabel}
      className="relative"
      onClick={onNotificationsClick}
      variant="ghost"
      key="notifications"
    >
      <Bell className="size-6" weight="regular" />
      {normalizedUnreadNotificationsCount > 0 ? (
        <span
          aria-hidden="true"
          className="notification-count-badge absolute end-1.5 top-1.5"
        >
          {formatUnreadCount(normalizedUnreadNotificationsCount)}
        </span>
      ) : null}
    </IconButton>
  ) : null;
  const chatAction = showChatAction ? (
    <IconButton
      aria-label={chatAccessibleLabel}
      className="relative"
      onClick={onChatClick}
      variant="ghost"
      key="chat"
    >
      <ChatCircle className="size-6" weight="regular" />
      {normalizedUnreadChatCount > 0 ? (
        <span
          aria-hidden="true"
          className="notification-count-badge absolute end-1.5 top-1.5"
        >
          {formatUnreadCount(normalizedUnreadChatCount)}
        </span>
      ) : null}
    </IconButton>
  ) : null;
  const walletAction = showWalletAction ? (
    <IconButton
      aria-label={walletAriaLabel}
      className="relative"
      onClick={onWalletClick}
      variant="ghost"
      key="wallet"
    >
      <Wallet className="size-6" weight="regular" />
    </IconButton>
  ) : null;
  const profileAction = showProfileAction && !showConnectAction ? (
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
        fallbackSeed={userAvatarSeed ?? undefined}
        size="sm"
        src={userAvatarSrc ?? undefined}
      />
    </IconButton>
  ) : null;
  const desktopActions = [createAction, notificationsAction, chatAction, walletAction, profileAction].filter(Boolean);
  const mobileActions = showMobileCreateAction
    ? [createAction].filter(Boolean)
    : [notificationsAction, walletAction, profileAction].filter(Boolean);
  const brand = (
    <button
      aria-label={homeAriaLabel}
      className="inline-flex max-w-full items-center gap-3 rounded-full px-1 py-1 text-start align-middle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onHomeClick}
      type="button"
    >
      <PirateBrandMark className="h-11 w-11 shrink-0" decorative={false} />
      <Type as="span" variant="h4" className="truncate font-display tracking-wide">PIRATE</Type>
    </button>
  );

  if (isMobile) {
    return (
      <header className={cn("fixed inset-x-0 top-0 z-40 border-b border-border-soft bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md", className)}>
        <div className="grid h-16 grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] items-center gap-2 px-3">
          <div className="min-w-0 justify-self-start">
            {mobileLeadingContent ?? (
              useSidebarTrigger ? (
                <SidebarMenuToggleButton ariaLabel={openNavigationAriaLabel} />
              ) : onBackClick ? (
                <IconButton aria-label={backAriaLabel} onClick={onBackClick} variant="ghost">
                  {isRtl ? (
                    <ArrowRight className="size-6" weight="bold" />
                  ) : (
                    <ArrowLeft className="size-6" weight="bold" />
                  )}
                </IconButton>
              ) : (
                <IconButton aria-label={openNavigationAriaLabel} onClick={onMenuClick} variant="ghost">
                  <List className="size-6" weight="bold" />
                </IconButton>
              )
            )}
          </div>
          <div className="min-w-0 max-w-56 justify-self-center text-center">
            {mobileCenterContent ?? (hideBrand || hideMobileBrand ? null : brand)}
          </div>
          <div className="min-w-0 justify-self-end">
            {mobileTrailingContent ?? (showConnectAction ? (
              <Button className="h-11 px-4" onClick={onConnectClick}>
                {connectLabel}
              </Button>
            ) : mobileActions.length > 0 ? (
              <div className="flex items-center justify-end gap-1">
                {mobileActions}
              </div>
            ) : <div className="h-11 w-11" aria-hidden="true" />)}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={cn("sticky top-0 z-30 border-b border-border-soft bg-background/95 backdrop-blur-xl", forceMobile === undefined && "hidden md:block", className)}>
      <div className="grid h-[var(--header-height)] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 lg:px-8">
        <div className="min-w-0 text-start">
          {hideBrand || hideDesktopBrand ? null : brand}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1.5">
          {showConnectAction ? (
            <Button className="h-12 px-5" onClick={onConnectClick}>
              {connectLabel}
            </Button>
          ) : null}
          {desktopActions}
        </div>
      </div>
    </header>
  );
}
