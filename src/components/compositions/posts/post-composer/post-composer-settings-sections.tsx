import * as React from "react";
import {
  Globe,
  MaskHappy,
  UsersThree,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Checkbox } from "@/components/primitives/checkbox";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { RadioIndicator } from "@/components/primitives/radio-indicator";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import { normalizePriceInput, normalizeRoyaltyInput } from "./post-composer-utils";
import { RegionalPricingPreviewDialog } from "./regional-pricing-preview";
import type { AssetLicensePresetId, AttachmentState, RegionalPricingPreview } from "./post-composer.types";

export type PostComposerSettingsSectionsCopy = {
  postAsTitle: string;
  publicIdentityDescription: string;
  anonymousIdentityDescription: string;
  visibilityTitle: string;
  publicVisibilityLabel: string;
  communityVisibilityLabel: string;
  paidUnlockTitle: string;
  priceLabel: string;
  pricePlaceholder: string;
  previewStartLabel: string;
  previewStartPlaceholder: string;
  regionalPricingLabel: string;
  licenseLabel: string;
  licenseLabels: Record<AssetLicensePresetId, string>;
  licenseDescriptions: Record<AssetLicensePresetId, string>;
  royaltyLabel: string;
  royaltyPlaceholder: string;
};

export type PostComposerSettingsSectionsProps = {
  access: "free" | "paid";
  attachment: AttachmentState;
  className?: string;
  copy?: Partial<PostComposerSettingsSectionsCopy>;
  agentIdentityDescription?: string;
  agentIdentityLabel?: string;
  agentIdentitySelected?: boolean;
  anonymousIdentityLabel?: string;
  identity: "pseudonym" | "anonymous";
  license: AssetLicensePresetId;
  onIdentityChange: (value: "pseudonym" | "anonymous") => void;
  onLicenseChange: (value: AssetLicensePresetId) => void;
  onPriceChange: (value: string, nextAccess?: "free" | "paid") => void;
  onPreviewStartSecondsChange?: (value: string) => void;
  onRegionalPricingChange?: (value: boolean) => void;
  onRoyaltyPercentChange: (value: string) => void;
  onVisibilityChange: (value: "public" | "community") => void;
  price: string;
  previewStartSeconds?: string;
  publicAvatarSeed?: string;
  publicAvatarSrc?: string;
  publicIdentityLabel?: string;
  publicIdentityInitials?: string;
  royaltyPercent: string;
  regionalPricingAvailable?: boolean;
  regionalPricingEnabled?: boolean;
  regionalPricingPreview?: RegionalPricingPreview | null;
  showLicenseFields?: boolean;
  showAnonymousIdentity?: boolean;
  visibility: "public" | "community";
  onAgentIdentitySelect?: () => void;
};

const defaultCopy: PostComposerSettingsSectionsCopy = {
  postAsTitle: "Post as",
  publicIdentityDescription: "Your public profile",
  anonymousIdentityDescription: "Same identity across this community",
  visibilityTitle: "Who can see this?",
  publicVisibilityLabel: "Public",
  communityVisibilityLabel: "Community",
  paidUnlockTitle: "Paid unlock",
  priceLabel: "Price",
  pricePlaceholder: "0",
  previewStartLabel: "30-second preview starts at",
  previewStartPlaceholder: "0",
  regionalPricingLabel: "Use community regional pricing",
  licenseLabel: "License",
  licenseLabels: {
    "non-commercial": "No reuse",
    "commercial-use": "Commercial use",
    "commercial-remix": "Commercial remix",
  },
  licenseDescriptions: {
    "non-commercial": "Buyers can watch, not reuse.",
    "commercial-use": "Reuse allowed.",
    "commercial-remix": "Reuse plus royalty.",
  },
  royaltyLabel: "Royalty",
  royaltyPlaceholder: "15",
};

function normalizeSecondsInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return String(Math.min(Number.parseInt(digits, 10), 86_400));
}

export function PostComposerSettingsRow({
  icon,
  label,
  onClick,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      className="flex min-h-16 w-full items-center gap-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4 text-start"
      onClick={onClick}
      type="button"
    >
      <span className="text-muted-foreground">{icon}</span>
      <Type as="span" variant="body-strong" className="min-w-0 flex-1 truncate">
        {label}
      </Type>
      <Type as="span" variant="body" className="truncate text-muted-foreground">
        {value}
      </Type>
    </button>
  );
}

function OptionRow({
  checked,
  description,
  icon,
  onClick,
  title,
}: {
  checked: boolean;
  description?: string;
  icon?: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={cn(
        "grid w-full grid-cols-[1fr_auto] items-center gap-4 rounded-[var(--radius-lg)] border p-4 text-start",
        icon && "grid-cols-[auto_1fr_auto]",
        checked ? "border-primary bg-primary-subtle" : "border-border-soft bg-card",
      )}
      onClick={onClick}
      type="button"
    >
      {icon ? (
        <span className="grid size-11 place-items-center rounded-full bg-background text-foreground">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 space-y-1">
        <Type as="span" variant="body-strong" className="block break-words">
          {title}
        </Type>
        {description ? (
          <Type as="span" variant="body" className="block text-muted-foreground">
            {description}
          </Type>
        ) : null}
      </span>
      <RadioIndicator checked={checked} />
    </button>
  );
}

export function PostComposerSettingsSections({
  access,
  agentIdentityDescription = "Post from your agent identity",
  agentIdentityLabel,
  agentIdentitySelected = false,
  attachment,
  className,
  copy: copyOverrides,
  anonymousIdentityLabel = "Pseudonym",
  identity,
  license,
  onIdentityChange,
  onLicenseChange,
  onPriceChange,
  onPreviewStartSecondsChange,
  onRegionalPricingChange,
  onRoyaltyPercentChange,
  onVisibilityChange,
  price,
  previewStartSeconds,
  publicAvatarSeed,
  publicAvatarSrc,
  publicIdentityLabel = "saint-pablo.pirate",
  publicIdentityInitials = "sp",
  regionalPricingAvailable = false,
  regionalPricingEnabled = false,
  regionalPricingPreview,
  royaltyPercent,
  showLicenseFields,
  showAnonymousIdentity = true,
  visibility,
  onAgentIdentitySelect,
}: PostComposerSettingsSectionsProps) {
  const isLiveAttachment = attachment?.kind === "live";
  const showAccess = Boolean(attachment && (
    attachment.kind === "song"
    || attachment.kind === "video"
    || (isLiveAttachment && access === "paid")
  ));
  const showPaidFields = access === "paid" && showAccess;
  const shouldShowLicenseFields = showLicenseFields ?? (showPaidFields && !isLiveAttachment);
  const copy = {
    ...defaultCopy,
    ...copyOverrides,
    licenseLabels: {
      ...defaultCopy.licenseLabels,
      ...copyOverrides?.licenseLabels,
    },
    licenseDescriptions: {
      ...defaultCopy.licenseDescriptions,
      ...copyOverrides?.licenseDescriptions,
    },
  };
  const canPreviewRegionalPricing = Boolean(regionalPricingPreview?.tiers.length);
  const paidAccessId = React.useId();
  const regionalPricingId = React.useId();

  return (
    <div className={cn("space-y-8", className)}>
      <section className="space-y-3">
        <Type as="h2" variant="h3" className="text-muted-foreground">
          {copy.postAsTitle}
        </Type>
        <OptionRow
          checked={identity === "pseudonym" && !agentIdentitySelected}
          description={copy.publicIdentityDescription}
          icon={
            <Avatar
              className="h-full w-full border-0"
              fallback={publicIdentityInitials}
              fallbackSeed={publicAvatarSeed}
              src={publicAvatarSrc}
            />
          }
          onClick={() => onIdentityChange("pseudonym")}
          title={publicIdentityLabel}
        />
        {showAnonymousIdentity ? (
          <OptionRow
            checked={identity === "anonymous" && !agentIdentitySelected}
            description={copy.anonymousIdentityDescription}
            icon={<MaskHappy className="size-6" weight="fill" />}
            onClick={() => onIdentityChange("anonymous")}
            title={anonymousIdentityLabel}
          />
        ) : null}
        {agentIdentityLabel && onAgentIdentitySelect ? (
          <OptionRow
            checked={agentIdentitySelected}
            description={agentIdentityDescription}
            icon={<span className="text-base font-bold">AI</span>}
            onClick={onAgentIdentitySelect}
            title={agentIdentityLabel}
          />
        ) : null}
      </section>

      <section className="space-y-3">
        <Type as="h2" variant="h3" className="text-muted-foreground">
          {copy.visibilityTitle}
        </Type>
        <OptionRow
          checked={visibility === "public"}
          icon={<Globe className="size-6" />}
          onClick={() => onVisibilityChange("public")}
          title={copy.publicVisibilityLabel}
        />
        <OptionRow
          checked={visibility === "community"}
          icon={<UsersThree className="size-6" />}
          onClick={() => onVisibilityChange("community")}
          title={copy.communityVisibilityLabel}
        />
      </section>

      {showAccess ? (
        <section className="space-y-3">
          <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
            {isLiveAttachment ? null : (
              <div className="flex min-h-14 items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3.5">
                <Checkbox
                  checked={access === "paid"}
                  id={paidAccessId}
                  onCheckedChange={(next) => onPriceChange(price, next === true ? "paid" : "free")}
                />
                <Label className="flex-1 text-base leading-6" htmlFor={paidAccessId}>
                  {copy.paidUnlockTitle}
                </Label>
              </div>
            )}
            {showPaidFields ? (
              <div className="space-y-4">
                <label className="block space-y-2">
                  <Type as="span" variant="body-strong">
                    {copy.priceLabel}
                  </Type>
                  <div className="grid grid-cols-[auto_1fr] items-center rounded-[var(--radius-lg)] border border-border-soft bg-background px-4">
                    <span className="text-base font-semibold text-muted-foreground">$</span>
                    <Input
                      className="h-14 rounded-none border-0 bg-transparent px-2 text-end text-lg shadow-none focus-visible:ring-0"
                      inputMode="decimal"
                      onChange={(event) => onPriceChange(normalizePriceInput(event.target.value))}
                      pattern="[0-9]*[.]?[0-9]*"
                      placeholder={copy.pricePlaceholder}
                      value={price}
                    />
                  </div>
                </label>
                {attachment?.kind === "song" && onPreviewStartSecondsChange ? (
                  <label className="block space-y-2">
                    <Type as="span" variant="body-strong">
                      {copy.previewStartLabel}
                    </Type>
                    <div className="grid grid-cols-[1fr_auto] items-center rounded-[var(--radius-lg)] border border-border-soft bg-background px-4">
                      <Input
                        className="h-14 rounded-none border-0 bg-transparent px-0 text-lg shadow-none focus-visible:ring-0"
                        inputMode="numeric"
                        onChange={(event) => onPreviewStartSecondsChange(normalizeSecondsInput(event.target.value))}
                        placeholder={copy.previewStartPlaceholder}
                        value={previewStartSeconds ?? ""}
                      />
                      <span className="text-base font-semibold text-muted-foreground">s</span>
                    </div>
                  </label>
                ) : null}
              </div>
            ) : null}
            {showPaidFields && regionalPricingAvailable && onRegionalPricingChange ? (
              <div className="space-y-2">
                <div className="flex min-h-14 items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3.5">
                  <Checkbox
                    checked={regionalPricingEnabled}
                    id={regionalPricingId}
                    onCheckedChange={(next) => onRegionalPricingChange(next === true)}
                  />
                  <Label className="flex-1 text-base leading-6" htmlFor={regionalPricingId}>
                    {copy.regionalPricingLabel}
                  </Label>
                </div>
                {canPreviewRegionalPricing ? (
                  <RegionalPricingPreviewDialog
                    preview={regionalPricingPreview}
                    priceUsd={price}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          {shouldShowLicenseFields ? (
            <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
              <div className="space-y-3">
                <Type as="div" variant="body-strong">
                  {copy.licenseLabel}
                </Type>
                {(["non-commercial", "commercial-use", "commercial-remix"] as const).map((preset) => (
                  <OptionRow
                    checked={license === preset}
                    description={copy.licenseDescriptions[preset]}
                    key={preset}
                    onClick={() => onLicenseChange(preset)}
                    title={copy.licenseLabels[preset]}
                  />
                ))}
              </div>
              {shouldShowLicenseFields && license === "commercial-remix" ? (
                <label className="block space-y-2">
                  <Type as="span" variant="body-strong">
                    {copy.royaltyLabel}
                  </Type>
                  <div className="grid grid-cols-[1fr_auto] items-center rounded-[var(--radius-lg)] border border-border-soft bg-background px-4">
                    <Input
                      className="h-14 rounded-none border-0 bg-transparent px-0 text-lg shadow-none focus-visible:ring-0"
                      inputMode="numeric"
                      max={100}
                      min={0}
                      onChange={(event) => onRoyaltyPercentChange(normalizeRoyaltyInput(event.target.value))}
                      placeholder={copy.royaltyPlaceholder}
                      type="number"
                      value={royaltyPercent}
                    />
                    <span className="text-base font-semibold text-muted-foreground">%</span>
                  </div>
                </label>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
