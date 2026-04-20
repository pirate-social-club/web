"use client";

import * as React from "react";
import { Minus, Plus, Trash } from "@phosphor-icons/react";

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
import { cn } from "@/lib/utils";

export type PricingTier = {
  tier_key: string;
  display_name?: string | null;
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
  verificationProviderRequirement: "self" | null;
  defaultTierKey: string | null;
  tiers: PricingTier[];
  countryAssignments: CountryAssignment[];
  onRegionalPricingEnabledChange?: (value: boolean) => void;
  onVerificationProviderRequirementChange?: (value: "self" | null) => void;
  onDefaultTierKeyChange?: (value: string) => void;
  onTiersChange?: (value: PricingTier[]) => void;
  onCountryAssignmentsChange?: (value: CountryAssignment[]) => void;
  onSave?: () => void;
  onUseStarterTemplate?: () => void;
  saveNote?: string | null;
  saveDisabled?: boolean;
  saveLoading?: boolean;
}

function formatTierLabel(tier: PricingTier): string {
  return tier.display_name?.trim() || tier.tier_key;
}

function TierRow({
  tier,
  isDefault,
  onRemove,
  onUpdate,
}: {
  tier: PricingTier;
  isDefault: boolean;
  onRemove?: () => void;
  onUpdate?: (patch: Partial<PricingTier>) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3 md:flex-row md:items-start">
      <div className="grid flex-1 gap-3 md:grid-cols-4">
        <div>
          <FormFieldLabel label="Name" />
          <Input
            className="h-10"
            onChange={(event) => onUpdate?.({ display_name: event.target.value })}
            placeholder="Tier 1"
            value={tier.display_name ?? ""}
          />
        </div>
        <div>
          <FormFieldLabel label="Internal key" />
          <Input
            className="h-10"
            disabled={isDefault}
            onChange={(event) => onUpdate?.({ tier_key: event.target.value })}
            placeholder="tier_1"
            value={tier.tier_key}
          />
        </div>
        <div>
          <FormFieldLabel label="Multiplier" />
          <Input
            className="h-10"
            inputMode="decimal"
            onChange={(event) => {
              const parsed = parseFloat(event.target.value);
              if (!Number.isNaN(parsed)) {
                onUpdate?.({ adjustment_value: parsed });
              }
            }}
            placeholder="1.00"
            value={tier.adjustment_value || ""}
          />
        </div>
        <div />
      </div>
      <Button
        className="size-10 shrink-0 self-end md:mt-5"
        disabled={isDefault}
        onClick={onRemove}
        size="icon"
        variant="secondary"
      >
        <Trash className="size-4" />
      </Button>
    </div>
  );
}

function CountryRow({
  assignment,
  tiers,
  onUpdate,
  onRemove,
}: {
  assignment: CountryAssignment;
  tiers: PricingTier[];
  onUpdate?: (patch: Partial<CountryAssignment>) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="w-full sm:w-20">
        <Input
          className="h-10 uppercase"
          maxLength={2}
          onChange={(event) =>
            onUpdate?.({ country_code: event.target.value.toUpperCase() })
          }
          placeholder="US"
          value={assignment.country_code}
        />
      </div>
      <Select
        onValueChange={(value) => onUpdate?.({ tier_key: value })}
        value={assignment.tier_key}
      >
        <SelectTrigger className="h-10 w-full flex-1">
          <SelectValue placeholder="Select tier" />
        </SelectTrigger>
        <SelectContent>
          {tiers.map((tier) => (
            <SelectItem key={tier.tier_key} value={tier.tier_key}>
              {formatTierLabel(tier)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        className="size-10 shrink-0 self-end sm:self-auto"
        onClick={onRemove}
        size="icon"
        variant="secondary"
      >
        <Minus className="size-4" />
      </Button>
    </div>
  );
}

export function CommunityPricingEditorPage({
  className,
  regionalPricingEnabled,
  verificationProviderRequirement,
  defaultTierKey,
  tiers,
  countryAssignments,
  onRegionalPricingEnabledChange,
  onVerificationProviderRequirementChange,
  onDefaultTierKeyChange,
  onTiersChange,
  onCountryAssignmentsChange,
  onSave,
  onUseStarterTemplate,
  saveNote = null,
  saveDisabled = false,
  saveLoading = false,
}: CommunityPricingEditorPageProps) {
  const tierKeys = tiers.map((t) => t.tier_key);

  return (
    <section className={cn("mx-auto flex w-full max-w-[64rem] flex-col gap-6 md:gap-8", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0">
          <h1 className="text-[1.875rem] font-semibold tracking-tight md:text-[2.25rem]">Pricing</h1>
        </div>
        {onUseStarterTemplate ? (
          <Button className="w-full sm:w-auto" onClick={onUseStarterTemplate} variant="secondary">
            Load starter template
          </Button>
        ) : null}
      </div>

      {saveNote ? <FormNote tone="warning">{saveNote}</FormNote> : null}

      <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3">
        <Checkbox
          checked={regionalPricingEnabled}
          className="mt-0.5"
          id="regional-pricing-enabled"
          onCheckedChange={(next) => onRegionalPricingEnabledChange?.(next === true)}
        />
        <div className="space-y-1">
          <Label htmlFor="regional-pricing-enabled">Regional pricing</Label>
          <div className="text-base text-muted-foreground">
            Buyers without verified nationality pay the default price.
          </div>
        </div>
      </div>

      {regionalPricingEnabled ? (
        <>
          <div className="space-y-4">
            <FormSectionHeading title="Verification" />
            <Select
              onValueChange={(value) =>
                onVerificationProviderRequirementChange?.(value === "self" ? "self" : null)
              }
              value={verificationProviderRequirement ?? "self"}
            >
              <SelectTrigger className="h-12 w-full sm:max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">self.xyz</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <FormSectionHeading
              title="Tiers"
            />
            {tiers.map((tier, index) => (
              <TierRow
                isDefault={tier.tier_key === defaultTierKey}
                key={tier.tier_key || index}
                onRemove={() =>
                  onTiersChange?.(tiers.filter((_, i) => i !== index))
                }
                onUpdate={(patch) =>
                  onTiersChange?.(
                    tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)),
                  )
                }
                tier={tier}
              />
            ))}
            <Button
              className="w-full sm:w-auto"
              onClick={() =>
                onTiersChange?.([
                  ...tiers,
                  {
                    tier_key: `tier_${tiers.length + 1}`,
                    display_name: `Tier ${tiers.length + 1}`,
                    adjustment_type: "multiplier",
                    adjustment_value: 0.5,
                  },
                ])
              }
              variant="secondary"
            >
              <Plus className="mr-2 size-4" />
              Add tier
            </Button>
          </div>

          <div className="space-y-4">
            <FormSectionHeading
              title="Default tier"
            />
            <Select
              onValueChange={onDefaultTierKeyChange}
              value={defaultTierKey ?? undefined}
            >
              <SelectTrigger className="h-12 w-full sm:max-w-xs">
                <SelectValue placeholder="Select default tier" />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((tier) => (
                  <SelectItem key={tier.tier_key} value={tier.tier_key}>
                    {formatTierLabel(tier)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <FormSectionHeading
              title="Country assignments"
            />
            {countryAssignments.map((assignment, index) => (
              <CountryRow
                assignment={assignment}
                key={`${assignment.country_code}-${index}`}
                onRemove={() =>
                  onCountryAssignmentsChange?.(
                    countryAssignments.filter((_, i) => i !== index),
                  )
                }
                onUpdate={(patch) =>
                  onCountryAssignmentsChange?.(
                    countryAssignments.map((a, i) =>
                      i === index ? { ...a, ...patch } : a,
                    ),
                  )
                }
                tiers={tiers}
              />
            ))}
            <Button
              className="w-full sm:w-auto"
              onClick={() =>
                onCountryAssignmentsChange?.([
                  ...countryAssignments,
                  { country_code: "", tier_key: defaultTierKey || tierKeys[0] || "" },
                ])
              }
              variant="secondary"
            >
              <Plus className="mr-2 size-4" />
              Add country
            </Button>
          </div>

          <FormNote tone="muted">
            The starter template uses broad regional bands with Denmark in the highest tier. Review every tier before saving.
          </FormNote>
          <FormNote tone="muted">
            Enabling regional pricing affects new listings only. Existing listings keep their current setting.
          </FormNote>
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
