"use client";

import * as React from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  Calendar,
  CheckCircle,
  Circle,
  CurrencyEth,
  Gauge,
  Globe,
  HandPalm,
  IdentificationCard,
  Hammer,
  Shield,
  User,
} from "@phosphor-icons/react";

import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import { Type } from "@/components/primitives/type";
import type { CommunitySidebarGateItem } from "./community-sidebar.types";

interface GateIconConfig {
  icon: Icon;
}

function getGateIconConfig(
  gateType: string,
  provider?: string | null,
): GateIconConfig {
  switch (gateType) {
    case "altcha_pow":
      return {
        icon: Hammer,
      };
    case "unique_human":
      return provider === "very"
        ? {
            icon: HandPalm,
          }
        : {
            icon: IdentificationCard,
          };
    case "nationality":
      return {
        icon: Globe,
      };
    case "wallet_score":
      return {
        icon: Gauge,
      };
    case "age_over_18":
    case "minimum_age":
      return {
        icon: Calendar,
      };
    case "gender":
      return {
        icon: User,
      };
    case "erc721_holding":
    case "erc721_inventory_match":
      return {
        icon: CurrencyEth,
      };
    default:
      return {
        icon: Shield,
      };
  }
}

function GateRow({ item }: { item: CommunitySidebarGateItem }) {
  const { icon: IconComponent } = getGateIconConfig(
    item.gateType,
    item.provider,
  );

  return (
    <div className="flex min-h-11 items-center gap-3 border-b border-border-soft/70 py-2.5 last:border-b-0">
      <div className="grid size-9 shrink-0 place-items-center">
        <IconComponent
          className="size-5 text-muted-foreground"
          weight="duotone"
        />
      </div>
      <Type
        as="span"
        className="min-w-0 flex-1"
        variant="body-strong"
      >
        {item.label}
      </Type>
      <div className="grid size-6 shrink-0 place-items-center">
        {item.status === "met" ? (
          <CheckCircle className="size-5 text-success" weight="fill" />
        ) : (
          <Circle className="size-5 text-muted-foreground" weight="regular" />
        )}
      </div>
    </div>
  );
}

function OrDivider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center py-1">
      <div className="flex-1 border-t border-border-soft" />
      <Type as="span" className="mx-3 text-muted-foreground" variant="overline">
        {label}
      </Type>
      <div className="flex-1 border-t border-border-soft" />
    </div>
  );
}

export interface CommunitySidebarGatesProps {
  className?: string;
  items: CommunitySidebarGateItem[];
  mode?: "all" | "any";
}

export function CommunitySidebarGates({
  className,
  items,
  mode,
}: CommunitySidebarGatesProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "gates").sidebar;

  if (items.length === 0) return null;

  const showOrDividers = mode === "any" && items.length > 1;

  const subtext =
    mode === "any"
      ? copy.anyModeSubtext
      : mode === "all"
        ? copy.allModeSubtext
        : null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {subtext && items.length > 1 && (
        <Type
          as="p"
          variant="caption"
        >
          {subtext}
        </Type>
      )}

      <div className="flex flex-col">
        {items.map((item, index) => (
          <React.Fragment key={`${item.gateType}-${item.label}-${index}`}>
            <GateRow item={item} />
            {showOrDividers && index < items.length - 1 && (
              <OrDivider label={copy.orDivider} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
