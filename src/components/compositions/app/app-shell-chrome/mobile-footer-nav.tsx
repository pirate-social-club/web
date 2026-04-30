"use client";

import * as React from "react";
import {
  Bell,
  ChatCircle,
  House,
  Wallet,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useIsMobile } from "@/hooks/use-mobile";
import { triggerNavigationTapHaptic } from "@/lib/haptics";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";

type FooterNavItemId = "home" | "wallet" | "chat" | "inbox" | "profile";

const FOOTER_ITEMS = [
  { id: "home", icon: House },
  { id: "wallet", icon: Wallet },
  { id: "chat", icon: ChatCircle },
  { id: "inbox", icon: Bell },
] as const;

function formatUnreadCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

function normalizeUnreadCount(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.floor(count));
}

export interface MobileFooterNavLabels {
  chat?: string;
  chatAriaLabel?: string;
  create?: string;
  home?: string;
  inbox?: string;
  inboxAriaLabel?: string;
  primaryNavAriaLabel?: string;
  profile?: string;
  profileAriaLabel?: string;
  wallet?: string;
  walletAriaLabel?: string;
}

export interface MobileFooterNavProps {
  activeItem?: FooterNavItemId;
  avatarFallback?: string;
  className?: string;
  createActionTitle?: string;
  disableCreateAction?: boolean;
  forceMobile?: boolean;
  labels?: MobileFooterNavLabels;
  onCreateClick?: () => void;
  onChatClick?: () => void;
  onHomeClick?: () => void;
  onInboxClick?: () => void;
  onProfileClick?: () => void;
  onWalletClick?: () => void;
  unreadChatCount?: number;
  unreadInboxCount?: number;
  userAvatarSeed?: string | null;
  userAvatarSrc?: string | null;
}

export function MobileFooterNav({
  activeItem = "home",
  avatarFallback = "Pirate User",
  className,
  forceMobile,
  labels,
  onChatClick,
  onHomeClick,
  onInboxClick,
  onProfileClick,
  onWalletClick,
  unreadChatCount = 0,
  unreadInboxCount = 0,
  userAvatarSeed,
  userAvatarSrc,
}: MobileFooterNavProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "shell");
  const {
    chat = copy.mobileFooter.chatLabel,
    chatAriaLabel = chat,
    home = copy.mobileFooter.homeLabel,
    inbox = copy.mobileFooter.inboxLabel,
    inboxAriaLabel = inbox,
    primaryNavAriaLabel = copy.mobileFooter.primaryNavAriaLabel,
    profile = copy.mobileFooter.profileLabel,
    profileAriaLabel = profile,
    wallet = copy.mobileFooter.walletLabel,
    walletAriaLabel = wallet,
  } = labels ?? {};
  const detectedMobile = useIsMobile();
  const hydrated = useClientHydrated();
  const isMobile = forceMobile ?? (hydrated ? detectedMobile : false);
  const normalizedUnreadChatCount = normalizeUnreadCount(unreadChatCount);
  const normalizedUnreadInboxCount = normalizeUnreadCount(unreadInboxCount);
  const chatAccessibleLabel = normalizedUnreadChatCount > 0
    ? `${chatAriaLabel}, ${normalizedUnreadChatCount}`
    : chatAriaLabel;
  const inboxAccessibleLabel = normalizedUnreadInboxCount > 0
    ? `${inboxAriaLabel}, ${normalizedUnreadInboxCount}`
    : inboxAriaLabel;
  const handleTap = React.useCallback((action?: () => void) => {
    if (!action) return;

    triggerNavigationTapHaptic();
    action();
  }, []);

  if (!isMobile) return null;

  const clickById: Record<Exclude<FooterNavItemId, "profile">, (() => void) | undefined> = {
    chat: onChatClick,
    home: onHomeClick,
    wallet: onWalletClick,
    inbox: onInboxClick,
  };
  const labelById: Record<Exclude<FooterNavItemId, "profile">, string> = {
    chat,
    home,
    inbox,
    wallet,
  };
  const ariaLabelById: Record<Exclude<FooterNavItemId, "profile">, string> = {
    chat: chatAccessibleLabel,
    home,
    inbox: inboxAccessibleLabel,
    wallet: walletAriaLabel,
  };

  return (
    <nav
      aria-label={primaryNavAriaLabel}
      className={cn("fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md", className)}
    >
      <div className="grid h-[var(--header-height)] grid-cols-5 items-center px-2">
        {FOOTER_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeItem === item.id;

          return (
            <button
              aria-current={active ? "page" : undefined}
              aria-label={ariaLabelById[item.id]}
              className={cn(
                "relative mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                active ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              key={item.id}
              onClick={() => handleTap(clickById[item.id])}
              type="button"
            >
              <Icon className="size-6" weight={active ? "fill" : "regular"} />
              {item.id === "inbox" && normalizedUnreadInboxCount > 0 ? (
                <span
                  aria-hidden="true"
                  className="notification-count-badge absolute end-1.5 top-1.5"
                >
                  {formatUnreadCount(normalizedUnreadInboxCount)}
                </span>
              ) : null}
              {item.id === "chat" && normalizedUnreadChatCount > 0 ? (
                <span
                  aria-hidden="true"
                  className="notification-count-badge absolute end-1.5 top-1.5"
                >
                  {formatUnreadCount(normalizedUnreadChatCount)}
                </span>
              ) : null}
              <span className="sr-only">{labelById[item.id]}</span>
            </button>
          );
        })}

        <button
          aria-current={activeItem === "profile" ? "page" : undefined}
          aria-label={profileAriaLabel}
          className={cn(
            "mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full transition-colors",
            activeItem === "profile" ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          onClick={() => handleTap(onProfileClick)}
          type="button"
          >
          <Avatar
            className="h-9 w-9 bg-card text-base"
            fallback={avatarFallback}
            fallbackSeed={userAvatarSeed ?? undefined}
            size="sm"
            src={userAvatarSrc ?? undefined}
          />
          <span className="sr-only">{profile}</span>
        </button>
      </div>
    </nav>
  );
}
