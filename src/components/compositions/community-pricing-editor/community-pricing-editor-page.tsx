"use client";

import * as React from "react";
import { Plus, Trash, X } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { CommunityModerationSaveFooter } from "@/components/compositions/community-moderation-shell/community-moderation-save-footer";
import { Checkbox } from "@/components/primitives/checkbox";
import {
  FormFieldLabel,
  FormNote,
  FormSectionHeading,
} from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/primitives/combobox";
import { cn } from "@/lib/utils";
import { COUNTRIES, getCountryName } from "@/lib/countries";
import { formatUsdLabel, parseUsdInput, useRouteMessages } from "@/app/authenticated-routes/route-core";
import { Type } from "@/components/primitives/type";

export type PricingTier = {
  id: string;
  tier_key: string;
  display_name: string;
  adjustment_type: "multiplier";
  adjustment_value: number;
};

export type CountryAssignment = {
  country_code: string;
  tier_key: string;
};

export interface CommunityPricingEditorPageProps {
  className?: string;
  regionalPricingEnabled: boolean;
  defaultTierKey: string | null;
  tiers: PricingTier[];
  countryAssignments: CountryAssignment[];
  onRegionalPricingEnabledChange?: (value: boolean) => void;
  onDefaultTierKeyChange?: (value: string) => void;
  onTiersChange?: (value: PricingTier[]) => void;
  onCountryAssignmentsChange?: (value: CountryAssignment[]) => void;
  onSave?: () => void;
  onUseStarterTemplate?: () => void;
  saveNote?: string | null;
  saveDisabled?: boolean;
  saveLoading?: boolean;
}

function formatTierLabel(tier: PricingTier, fallback: string): string {
  return tier.display_name.trim() || fallback;
}

function adjustmentToPercent(value: number): number {
  return Math.round((value - 1) * 100);
}

function percentToAdjustment(value: number): number {
  return 1 + value / 100;
}

function formatPreviewPrice(
  basePriceUsd: number | null,
  adjustmentValue: number,
  localeTag: string,
): string | undefined {
  if (basePriceUsd == null) {
    return undefined;
  }
  return formatUsdLabel(basePriceUsd * adjustmentValue, localeTag);
}

function generateTierKey(name: string, existingKeys: string[]): string {
  let base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!base) base = "group";
  let key = base;
  let counter = 1;
  while (existingKeys.includes(key)) {
    key = `${base}_${counter}`;
    counter++;
  }
  return key;
}

function getCountryCodeFromComboboxValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "code" in value) {
    const code = (value as { code?: unknown }).code;
    return typeof code === "string" ? code : "";
  }
  return "";
}

function CountryPicker({
  excludedCodes,
  onSelect,
  addCountryLabel,
  searchPlaceholder,
  emptyLabel,
}: {
  excludedCodes: string[];
  onSelect: (code: string) => void;
  addCountryLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
}) {
  const available = React.useMemo(() => {
    const excluded = new Set(excludedCodes.map((c) => c.trim().toUpperCase()));
    return COUNTRIES.filter((c) => !excluded.has(c.code));
  }, [excludedCodes]);

  return (
    <Combobox
      items={available}
      onValueChange={(value) => onSelect(getCountryCodeFromComboboxValue(value))}
    >
      <ComboboxTrigger className="h-10 w-full sm:max-w-xs">
        <span className="text-muted-foreground">{addCountryLabel}</span>
      </ComboboxTrigger>
      <ComboboxContent
        className="rounded-[var(--radius-xl)] border-border-soft bg-card p-1 shadow-[var(--shadow-lg)]"
        collisionAvoidance={{ side: "none", align: "shift", fallbackAxisSide: "none" }}
        side="bottom"
        sideOffset={4}
      >
        <ComboboxInput
          className="h-10 rounded-[var(--radius-md)] border-0 bg-muted/45 px-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder={searchPlaceholder}
        />
        <ComboboxEmpty className="px-3 py-3">{emptyLabel}</ComboboxEmpty>
        <ComboboxList className="max-h-52 py-1 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
          {(country) => (
            <ComboboxItem
              className="rounded-[var(--radius-md)] px-3 py-2.5 data-[highlighted]:bg-muted/80 [&>div]:pl-0"
              key={country.code}
              value={country.code}
            >
              {country.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function TierRow({
  tier,
  isDefault,
  assignedCountries,
  excludedCountryCodes,
  onRemove,
  onUpdate,
  onAddCountry,
  onRemoveCountry,
  previewPriceLabel,
}: {
  tier: PricingTier;
  isDefault: boolean;
  assignedCountries: { code: string; name: string }[];
  excludedCountryCodes: string[];
  onRemove?: () => void;
  onUpdate?: (patch: Partial<PricingTier>) => void;
  onAddCountry?: (countryCode: string) => void;
  onRemoveCountry?: (countryCode: string) => void;
  previewPriceLabel?: string;
}) {
  const { copy } = useRouteMessages();
  const mc = copy.moderation.pricing;

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
      <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(10rem,auto)]">
        <div>
          <FormFieldLabel label={mc.groupNameLabel} />
          <Input
            className="h-10"
            onChange={(event) => onUpdate?.({ display_name: event.target.value })}
            placeholder={mc.groupNamePlaceholder}
            value={tier.display_name}
          />
        </div>
        <div>
          <FormFieldLabel label={mc.priceAdjustmentLabel} />
          <div className="relative">
            <Input
              className="h-10 pr-8"
              inputMode="numeric"
              onChange={(event) => {
                const parsed = parseInt(event.target.value, 10);
                if (!Number.isNaN(parsed)) {
                  onUpdate?.({ adjustment_value: percentToAdjustment(parsed) });
                }
              }}
              placeholder={mc.priceAdjustmentPlaceholder}
              type="number"
              value={adjustmentToPercent(tier.adjustment_value)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          </div>
        </div>
        <div>
          <FormFieldLabel label={mc.previewPriceLabel} />
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-10 min-w-0 flex-1 items-center rounded-[var(--radius-md)] border border-border-soft bg-background px-3 font-medium">
              {previewPriceLabel ?? "-"}
            </div>
            <Button
              className="size-10 shrink-0"
              disabled={isDefault}
              onClick={onRemove}
              size="icon"
              variant="secondary"
            >
              <Trash className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div>
        <FormFieldLabel label={mc.countriesLabel} />
        {assignedCountries.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {assignedCountries.map((country) => (
              <span
                key={country.code}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-muted px-3 py-1.5 text-base"
              >
                {country.name}
                <button
                  className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  onClick={() => onRemoveCountry?.(country.code)}
                  type="button"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <CountryPicker
          addCountryLabel={mc.addCountry}
          emptyLabel={mc.noCountriesFound}
          excludedCodes={excludedCountryCodes}
          onSelect={(code) => onAddCountry?.(code)}
          searchPlaceholder={mc.searchCountryPlaceholder}
        />
      </div>
    </div>
  );
}

export function CommunityPricingEditorPage({
  className,
  regionalPricingEnabled,
  defaultTierKey,
  tiers,
  countryAssignments,
  onRegionalPricingEnabledChange,
  onDefaultTierKeyChange,
  onTiersChange,
  onCountryAssignmentsChange,
  onSave,
  onUseStarterTemplate,
  saveNote = null,
  saveDisabled = false,
  saveLoading = false,
}: CommunityPricingEditorPageProps) {
  const { copy, localeTag } = useRouteMessages();
  const mc = copy.moderation.pricing;
  const [basePricePreviewInput, setBasePricePreviewInput] = React.useState("10.00");
  const basePricePreviewUsd = React.useMemo(
    () => parseUsdInput(basePricePreviewInput),
    [basePricePreviewInput],
  );

  const assignedByTier = React.useMemo(() => {
    const map = new Map<string, { code: string; name: string }[]>();
    for (const tier of tiers) {
      map.set(tier.tier_key, []);
    }
    for (const assignment of countryAssignments) {
      const list = map.get(assignment.tier_key) ?? [];
      const countryCode = assignment.country_code.trim().toUpperCase();
      const name = getCountryName(countryCode);
      if (name) {
        list.push({ code: countryCode, name });
      }
      map.set(assignment.tier_key, list);
    }
    return map;
  }, [tiers, countryAssignments]);
  const assignedCountryCodes = React.useMemo(
    () => countryAssignments.map((assignment) => assignment.country_code.trim().toUpperCase()),
    [countryAssignments],
  );

  function handleAddCountry(tierKey: string, countryCode: string) {
    const normalizedCountryCode = countryCode.trim().toUpperCase();
    if (
      !normalizedCountryCode
      || countryAssignments.some(
        (assignment) => assignment.country_code.trim().toUpperCase() === normalizedCountryCode,
      )
    ) {
      return;
    }
    onCountryAssignmentsChange?.([
      ...countryAssignments,
      { country_code: normalizedCountryCode, tier_key: tierKey },
    ]);
  }

  function handleRemoveCountry(tierKey: string, countryCode: string) {
    const normalizedCountryCode = countryCode.trim().toUpperCase();
    onCountryAssignmentsChange?.(
      countryAssignments.filter(
        (a) =>
          !(
            a.tier_key === tierKey
            && a.country_code.trim().toUpperCase() === normalizedCountryCode
          ),
      ),
    );
  }

  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8",
        className,
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0">
          <Type as="h1" variant="h1" className="md:text-4xl">
            {mc.title}
          </Type>
        </div>
        {onUseStarterTemplate ? (
          <Button
            className="w-full sm:w-auto"
            onClick={onUseStarterTemplate}
            variant="secondary"
          >
            {mc.loadStarterTemplate}
          </Button>
        ) : null}
      </div>

      {saveNote ? <FormNote tone="warning">{saveNote}</FormNote> : null}

      <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3">
        <Checkbox
          checked={regionalPricingEnabled}
          className="mt-0.5"
          id="regional-pricing-enabled"
          onCheckedChange={(next) =>
            onRegionalPricingEnabledChange?.(next === true)
          }
        />
        <div className="space-y-1">
          <Label htmlFor="regional-pricing-enabled">
            {mc.regionalPricingLabel}
          </Label>
          <Type as="div" variant="caption" className="">
            {mc.regionalPricingDescription}
          </Type>
        </div>
      </div>

      {regionalPricingEnabled ? (
        <>
          <div className="grid gap-2 sm:max-w-xs">
            <FormFieldLabel label={mc.basePricePreviewLabel} />
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                className="h-10 pl-7"
                inputMode="decimal"
                onChange={(event) => setBasePricePreviewInput(event.target.value)}
                value={basePricePreviewInput}
              />
            </div>
          </div>

          <div className="space-y-4">
            <FormSectionHeading title={mc.priceGroupsTitle} />
            {tiers.map((tier) => (
              <TierRow
                assignedCountries={assignedByTier.get(tier.tier_key) ?? []}
                excludedCountryCodes={assignedCountryCodes}
                isDefault={tier.tier_key === defaultTierKey}
                key={tier.id}
                onAddCountry={(code) => handleAddCountry(tier.tier_key, code)}
                onRemove={() =>
                  onTiersChange?.(tiers.filter((t) => t.id !== tier.id))
                }
                onRemoveCountry={(code) =>
                  handleRemoveCountry(tier.tier_key, code)
                }
                onUpdate={(patch) =>
                  onTiersChange?.(
                    tiers.map((t) =>
                      t.id === tier.id ? { ...t, ...patch } : t,
                    ),
                  )
                }
                previewPriceLabel={formatPreviewPrice(
                  basePricePreviewUsd,
                  tier.adjustment_value,
                  localeTag,
                )}
                tier={tier}
              />
            ))}
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                const existingKeys = tiers.map((t) => t.tier_key);
                const newTier: PricingTier = {
                  id: Math.random().toString(36).slice(2),
                  tier_key: generateTierKey(mc.newGroup, existingKeys),
                  display_name: "",
                  adjustment_type: "multiplier",
                  adjustment_value: 1,
                };
                onTiersChange?.([...tiers, newTier]);
              }}
              variant="secondary"
            >
              <Plus className="me-2 size-4" />
              {mc.addPriceGroup}
            </Button>
          </div>

          <div className="space-y-4">
            <FormSectionHeading title={mc.defaultTierTitle} />
            <Select
              onValueChange={onDefaultTierKeyChange}
              value={defaultTierKey ?? undefined}
            >
              <SelectTrigger className="h-12 w-full sm:max-w-xs">
                <SelectValue placeholder={mc.selectDefaultTierPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((tier) => (
                  <SelectItem key={tier.id} value={tier.tier_key}>
                    {formatTierLabel(tier, mc.untitledGroup)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FormNote tone="muted">{mc.starterTemplateNote}</FormNote>
          <FormNote tone="muted">{mc.existingListingsNote}</FormNote>
        </>
      ) : null}

      <CommunityModerationSaveFooter
        disabled={saveDisabled}
        loading={saveLoading}
        onSave={onSave}
      />
    </section>
  );
}
