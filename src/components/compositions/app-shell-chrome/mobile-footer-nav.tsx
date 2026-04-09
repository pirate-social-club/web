"use client";

import * as React from "react";
import {
  Bell,
  House,
  Plus,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type FooterNavItemId = "home" | "create" | "inbox" | "profile";

const FOOTER_ITEMS = [
  { id: "home", label: "Home", icon: House },
  { id: "create", label: "Create", icon: Plus },
  { id: "inbox", label: "Inbox", icon: Bell },
] as const;

export interface MobileFooterNavProps {
  activeItem?: FooterNavItemId;
  avatarFallback?: string;
  className?: string;
  forceMobile?: boolean;
  onCreateClick?: () => void;
  onHomeClick?: () => void;
  onInboxClick?: () => void;
  onProfileClick?: () => void;
  showInboxDot?: boolean;
  userAvatarSrc?: string | null;
}

export function MobileFooterNav({
  activeItem = "home",
  avatarFallback = "Pirate User",
  className,
  forceMobile,
  onCreateClick,
  onHomeClick,
  onInboxClick,
  onProfileClick,
  showInboxDot = true,
  userAvatarSrc,
}: MobileFooterNavProps) {
  const detectedMobile = useIsMobile();
  const isMobile = forceMobile ?? detectedMobile;

  if (!isMobile) return null;

  const clickById: Record<Exclude<FooterNavItemId, "profile">, (() => void) | undefined> = {
    home: onHomeClick,
    create: onCreateClick,
    inbox: onInboxClick,
  };

  return (
    <nav
      aria-label="Primary"
      className={cn("fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md", className)}
    >
      <div className="grid h-[4.5rem] grid-cols-4 items-center px-2">
        {FOOTER_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeItem === item.id;

          return (
            <button
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "relative mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                active
                  ? "bg-primary/16 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              key={item.id}
              onClick={clickById[item.id]}
              type="button"
            >
              <Icon className="size-6" weight={active ? "fill" : "regular"} />
              {item.id === "inbox" && showInboxDot ? (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary" />
              ) : null}
              <span className="sr-only">{item.label}</span>
            </button>
          );
        })}

        <button
          aria-current={activeItem === "profile" ? "page" : undefined}
          aria-label="Profile"
          className={cn(
            "mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full transition-colors",
            activeItem === "profile"
              ? "bg-primary/16 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          onClick={onProfileClick}
          type="button"
        >
          <Avatar
            className="h-9 w-9 bg-card text-base"
            fallback={avatarFallback}
            size="sm"
            src={userAvatarSrc ?? undefined}
          />
          <span className="sr-only">Profile</span>
        </button>
      </div>
    </nav>
  );
}
