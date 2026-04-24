"use client";

import * as React from "react";
import { X } from "@phosphor-icons/react";

import { IconButton } from "@/components/primitives/icon-button";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { AppHeader } from "./app-header";
import { Type } from "@/components/primitives/type";

export interface MobilePageHeaderProps {
  title: string;
  className?: string;
  onBackClick?: () => void;
  onCloseClick?: () => void;
  trailingAction?: React.ReactNode;
}

export function MobilePageHeader({
  title,
  className,
  onBackClick,
  onCloseClick,
  trailingAction,
}: MobilePageHeaderProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;

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
      mobileCenterContent={<Type as="div" variant="h4" className="truncate ">{title}</Type>}
      mobileTrailingContent={trailingAction}
      onBackClick={onBackClick}
      showNotificationsAction={false}
      showProfileAction={false}
    />
  );
}
