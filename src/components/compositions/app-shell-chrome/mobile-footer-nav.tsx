"use client";

import * as React from "react";
import {
  Bell,
  House,
  Plus,
  Wallet,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { triggerNavigationTapHaptic } from "@/lib/haptics";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";

type FooterNavItemId = "home" | "wallet" | "create" | "inbox" | "profile";

const FOOTER_ITEMS = [
  { id: "home", icon: House },
  { id: "wallet", icon: Wallet },
  { id: "create", icon: Plus },
  { id: "inbox", icon: Bell },
] as const;

export interface MobileFooterNavLabels {
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
  onHomeClick?: () => void;
  onInboxClick?: () => void;
  onProfileClick?: () => void;
  onWalletClick?: () => void;
  showInboxDot?: boolean;
  userAvatarSrc?: string | null;
}

export function MobileFooterNav({
  activeItem = "home",
  avatarFallback = "Pirate User",
  className,
  createActionTitle,
  disableCreateAction = false,
  forceMobile,
  labels,
  onCreateClick,
  onHomeClick,
  onInboxClick,
  onProfileClick,
  onWalletClick,
  showInboxDot = false,
  userAvatarSrc,
}: MobileFooterNavProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "shell");
  const {
    create = copy.mobileFooter.createLabel,
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
  const isMobile = forceMobile ?? detectedMobile;
  const handleTap = React.useCallback((action?: () => void) => {
    if (!action) return;

    triggerNavigationTapHaptic();
    action();
  }, []);

  if (!isMobile) return null;

  const clickById: Record<Exclude<FooterNavItemId, "profile">, (() => void) | undefined> = {
    home: onHomeClick,
    wallet: onWalletClick,
    create: onCreateClick,
    inbox: onInboxClick,
  };
  const labelById: Record<Exclude<FooterNavItemId, "profile">, string> = {
    create,
    home,
    inbox,
    wallet,
  };
  const ariaLabelById: Record<Exclude<FooterNavItemId, "profile">, string> = {
    create,
    home,
    inbox: inboxAriaLabel,
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
                item.id === "create" && disableCreateAction ? "cursor-not-allowed opacity-50" : null,
                active ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              disabled={item.id === "create" && disableCreateAction}
              key={item.id}
              onClick={() => handleTap(clickById[item.id])}
              title={item.id === "create" ? createActionTitle : undefined}
              type="button"
            >
              <Icon className="size-6" weight={active ? "fill" : "regular"} />
              {item.id === "inbox" && showInboxDot ? (
                <span className="absolute end-2 top-2 h-2.5 w-2.5 rounded-full bg-primary" />
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
            size="sm"
            src={userAvatarSrc ?? undefined}
          />
          <span className="sr-only">{profile}</span>
        </button>
      </div>
    </nav>
  );
}
