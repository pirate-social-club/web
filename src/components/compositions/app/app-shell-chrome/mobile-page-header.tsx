"use client";

import * as React from "react";
import { X } from "@phosphor-icons/react";

import { IconButton } from "@/components/primitives/icon-button";
import { Avatar } from "@/components/primitives/avatar";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { AppHeader } from "./app-header";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export interface MobilePageHeaderProps {
  title: string;
  titleAvatarFallback?: string;
  titleAvatarSrc?: string | null;
  className?: string;
  onBackClick?: () => void;
  onCloseClick?: () => void;
  onTitleClick?: () => void;
  trailingAction?: React.ReactNode;
}

export function MobilePageHeader({
  title,
  titleAvatarFallback,
  titleAvatarSrc,
  className,
  onBackClick,
  onCloseClick,
  onTitleClick,
  trailingAction,
}: MobilePageHeaderProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;
  const titleContent = (
    <span className="flex min-w-0 items-center justify-center gap-2 text-start">
      {titleAvatarFallback || titleAvatarSrc ? (
        <Avatar
          className="h-8 w-8 shrink-0"
          fallback={titleAvatarFallback ?? title}
          size="sm"
          src={titleAvatarSrc ?? undefined}
        />
      ) : null}
      <Type as="span" variant="h4" className="truncate">{title}</Type>
    </span>
  );

  return (
    <AppHeader
      className={className}
      forceMobile
      hideBrand
      mobileLeadingContent={onCloseClick ? (
        <IconButton aria-label={copy.close} onClick={onCloseClick} variant="ghost">
          <X className="size-6" weight="bold" />
        </IconButton>
      ) : undefined}
      mobileCenterContent={onTitleClick ? (
        <button
          aria-label={`Open ${title}`}
          className={cn(
            "inline-flex max-w-full items-center justify-center rounded-full px-1 py-1",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          onClick={onTitleClick}
          type="button"
        >
          {titleContent}
        </button>
      ) : (
        <div className="min-w-0 max-w-full">{titleContent}</div>
      )}
      mobileTrailingContent={trailingAction}
      onBackClick={onBackClick}
      showNotificationsAction={false}
      showProfileAction={false}
    />
  );
}
