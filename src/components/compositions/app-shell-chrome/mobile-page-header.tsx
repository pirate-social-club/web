"use client";

import * as React from "react";
import { X } from "@phosphor-icons/react";

import { IconButton } from "@/components/primitives/icon-button";
import { AppHeader } from "./app-header";

export interface MobilePageHeaderProps {
  title: string;
  onBackClick?: () => void;
  onCloseClick?: () => void;
  trailingAction?: React.ReactNode;
}

export function MobilePageHeader({
  title,
  onBackClick,
  onCloseClick,
  trailingAction,
}: MobilePageHeaderProps) {
  return (
    <AppHeader
      forceMobile
      hideBrand
      mobileLeadingContent={onCloseClick ? (
        <IconButton aria-label="Close" onClick={onCloseClick} variant="ghost">
          <X className="size-6" weight="bold" />
        </IconButton>
      ) : undefined}
      mobileCenterContent={<div className="truncate text-lg font-semibold">{title}</div>}
      mobileTrailingContent={trailingAction}
      onBackClick={onBackClick}
    />
  );
}
