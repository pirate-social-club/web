"use client";

import * as React from "react";
import { X } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/primitives/dialog";
import { IconButton } from "@/components/primitives/icon-button";
import { Type } from "@/components/primitives/type";
import { countryCodeToFlag, getCountryDisplayName, normalizeCountryCode } from "@/lib/countries";
import { formatUsdLabel, parseUsdInput } from "@/lib/formatting/currency";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";

import type { RegionalPricingPreview, RegionalPricingTierPreview } from "./post-composer.types";

type RegionalPricingPreviewDialogProps = {
  priceUsd: string;
  preview: RegionalPricingPreview | null | undefined;
};

function formatAdjustment(tier: RegionalPricingTierPreview) {
  if (tier.adjustmentType !== "multiplier") return "";
  const percent = Math.round((tier.adjustmentValue - 1) * 100);
  if (percent === 0) return "Base price";
  return percent > 0 ? `+${percent}%` : `${percent}%`;
}

function priceForTier(priceUsd: string, tier: RegionalPricingTierPreview, localeTag: string) {
  const basePrice = parseUsdInput(priceUsd);
  if (basePrice == null) return null;
  return formatUsdLabel(basePrice * tier.adjustmentValue, localeTag) ?? null;
}

function countryLabel(code: string, localeTag: string) {
  const normalized = normalizeCountryCode(code)?.alpha2 ?? code.trim().toUpperCase();
  const name = getCountryDisplayName(normalized, localeTag) ?? normalized;
  const flag = countryCodeToFlag(normalized);
  return flag ? `${flag} ${name}` : name;
}

function RegionalPricingPreviewBody({
  priceUsd,
  preview,
}: {
  priceUsd: string;
  preview: RegionalPricingPreview | null | undefined;
}) {
  const { locale } = useUiLocale();
  const defaultTier = preview?.tiers.find((tier) => tier.tierKey === preview.defaultTierKey) ?? preview?.tiers[0] ?? null;
  const baseLabel = formatUsdLabel(parseUsdInput(priceUsd), locale) ?? "$0.00";
  const defaultPriceLabel = defaultTier ? priceForTier(priceUsd, defaultTier, locale) ?? baseLabel : baseLabel;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 text-base">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Base price</span>
          <span className="font-medium">{baseLabel}</span>
        </div>
        <span className="text-border-soft">·</span>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Default</span>
          <span className="font-medium">{defaultPriceLabel}</span>
        </div>
      </div>

      <div className="space-y-4">
        {(preview?.tiers ?? []).map((tier) => {
          const tierPrice = priceForTier(priceUsd, tier, locale);
          const isDefault = tier.tierKey === preview?.defaultTierKey;
          return (
            <div className="border-b border-border-soft pb-4 last:border-0 last:pb-0" key={tier.tierKey}>
              <div className="mb-2 flex items-center gap-2 text-base">
                <span className="font-medium">{tier.displayName || tier.tierKey}</span>
                <span className="text-muted-foreground">{formatAdjustment(tier)}</span>
                {isDefault ? (
                  <span className="text-muted-foreground">· Default</span>
                ) : null}
                {tierPrice ? (
                  <span className="ml-auto font-medium">{tierPrice}</span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-base text-muted-foreground">
                {tier.countryCodes.map((code) => (
                  <span className="whitespace-nowrap" key={code}>
                    {countryLabel(code, locale)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RegionalPricingPreviewDialog({
  priceUsd,
  preview,
}: RegionalPricingPreviewDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="w-fit text-base font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          type="button"
        >
          View Regional Pricing
        </button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "flex max-h-[min(82vh,760px)] w-[min(100%-2rem,52rem)] grid-rows-none flex-col overflow-hidden p-0",
          "max-sm:inset-0 max-sm:top-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-screen max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0 max-sm:data-[state=closed]:translate-y-0 max-sm:data-[state=open]:translate-y-0",
        )}
        hideCloseButton
      >
        <DialogClose asChild>
          <IconButton
            aria-label="Close regional pricing"
            className="absolute left-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 sm:top-4"
            size="sm"
            variant="ghost"
          >
            <X className="size-5" weight="bold" />
          </IconButton>
        </DialogClose>
        <div className="shrink-0 border-b border-border-soft px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-5 sm:pt-14 max-sm:px-4">
          <DialogHeader className="text-start">
            <DialogTitle>Regional Pricing</DialogTitle>
            <DialogDescription>
              Based on verified Self.xyz nationality. Unverified buyers pay the default.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-sm:px-4">
          <div className="space-y-4">
            <RegionalPricingPreviewBody priceUsd={priceUsd} preview={preview} />
            <DialogFooter className="max-sm:hidden">
              <DialogClose asChild>
                <Button>Close preview</Button>
              </DialogClose>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
