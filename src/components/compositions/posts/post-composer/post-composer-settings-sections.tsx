import * as React from "react";
import {
  Globe,
  MaskHappy,
  Plus,
  Trash,
  UsersThree,
  Wallet,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Checkbox } from "@/components/primitives/checkbox";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { RadioIndicator } from "@/components/primitives/radio-indicator";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import { normalizePriceInput, normalizeRoyaltyInput } from "./post-composer-utils";
import { RegionalPricingPreviewDialog } from "./regional-pricing-preview";
import type {
  AssetLicensePresetId,
  AssetRoyaltySplitState,
  AttachmentState,
  AuthorAgeGatePolicy,
  RegionalPricingPreview,
} from "./post-composer.types";

export type PostComposerSettingsSectionsCopy = {
  postAsTitle: string;
  publicIdentityDescription: string;
  anonymousIdentityDescription: string;
  visibilityTitle: string;
  publicVisibilityLabel: string;
  communityVisibilityLabel: string;
  ageGateTitle: string;
  ageGateDescription: string;
  paidUnlockTitle: string;
  priceLabel: string;
  pricePlaceholder: string;
  previewStartLabel: string;
  previewStartPlaceholder: string;
  vinylReleaseUrlLabel: string;
  vinylReleaseUrlPlaceholder: string;
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
  ageGatePolicy: AuthorAgeGatePolicy;
  license: AssetLicensePresetId;
  onAgeGatePolicyChange: (value: AuthorAgeGatePolicy) => void;
  onIdentityChange: (value: "pseudonym" | "anonymous") => void;
  onLicenseChange: (value: AssetLicensePresetId) => void;
  onPriceChange: (value: string, nextAccess?: "free" | "paid") => void;
  onPreviewStartSecondsChange?: (value: string) => void;
  onRegionalPricingChange?: (value: boolean) => void;
  onRoyaltySplitChange?: (value: AssetRoyaltySplitState) => void;
  onRoyaltyPercentChange: (value: string) => void;
  onVinylReleaseUrlChange?: (value: string) => void;
  onVisibilityChange: (value: "public" | "community") => void;
  price: string;
  previewStartSeconds?: string;
  publicAvatarSeed?: string;
  publicAvatarSrc?: string;
  publicIdentityLabel?: string;
  publicIdentityInitials?: string;
  royaltyPercent: string;
  royaltySplit?: AssetRoyaltySplitState;
  regionalPricingAvailable?: boolean;
  regionalPricingEnabled?: boolean;
  regionalPricingPreview?: RegionalPricingPreview | null;
  showLicenseFields?: boolean;
  showRoyaltySplit?: boolean;
  showAnonymousIdentity?: boolean;
  visibility: "public" | "community";
  vinylReleaseUrl?: string;
  onAgentIdentitySelect?: () => void;
};

const defaultCopy: PostComposerSettingsSectionsCopy = {
  postAsTitle: "Post as",
  publicIdentityDescription: "Your public profile",
  anonymousIdentityDescription: "Same identity across this community",
  visibilityTitle: "Who can see this?",
  publicVisibilityLabel: "Public",
  communityVisibilityLabel: "Community",
  ageGateTitle: "18+ content",
  ageGateDescription: "Require age verification",
  paidUnlockTitle: "Paid unlock",
  priceLabel: "Price",
  pricePlaceholder: "0",
  previewStartLabel: "30-second preview starts at",
  previewStartPlaceholder: "0",
  vinylReleaseUrlLabel: "ElasticStage vinyl URL",
  vinylReleaseUrlPlaceholder: "https://elasticstage.com/artist/releases/release-singleep",
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

function RoyaltySplitEditor({
  onChange,
  value,
}: {
  onChange: (value: AssetRoyaltySplitState) => void;
  value: AssetRoyaltySplitState;
}) {
  const totalSharePct = value.allocations.reduce((sum, allocation) => sum + allocation.sharePct, 0);
  const creatorSharePct = value.allocations
    .filter((allocation) => allocation.recipientKind === "creator")
    .reduce((sum, allocation) => sum + allocation.sharePct, 0);
  const updateAllocation = (
    allocationId: string,
    patch: Partial<AssetRoyaltySplitState["allocations"][number]>,
  ) => {
    onChange({
      allocations: value.allocations.map((allocation) =>
        allocation.id === allocationId ? { ...allocation, ...patch } : allocation
      ),
    });
  };

  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Type as="div" variant="body-strong">Royalty split</Type>
          <Type as="p" variant="body" className="text-muted-foreground">
            Add a share to each wallet. Total must be 100%.
          </Type>
        </div>
        <div className={cn(
          "shrink-0 rounded-full px-3 py-1 font-semibold tabular-nums",
          totalSharePct === 100
            ? "bg-primary-subtle text-primary"
            : "bg-destructive/10 text-destructive",
        )}>
          {totalSharePct}%
        </div>
      </div>

      <div className="space-y-3">
        {value.allocations.map((allocation, index) => {
          const isCreator = allocation.recipientKind === "creator";
          return (
            <div
              className="grid items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-background p-3 sm:grid-cols-[1fr_7rem_auto] sm:p-4"
              key={allocation.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Wallet className="size-5" />
                </span>
                {isCreator ? (
                  <Type as="span" variant="body-strong" className="shrink-0 text-foreground">
                    You
                  </Type>
                ) : null}
                <Input
                  aria-label={isCreator ? "Your wallet address" : `Recipient ${index + 1} wallet address`}
                  className="h-11 min-w-0 flex-1 font-mono"
                  onChange={(event) => updateAllocation(allocation.id, { walletAddress: event.target.value })}
                  placeholder={isCreator ? "Your primary wallet" : "0x..."}
                  value={allocation.walletAddress ?? ""}
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center rounded-full border border-input bg-background pe-4 shadow-sm">
                <Input
                  aria-label={isCreator ? "Your royalty percentage" : `Recipient ${index + 1} royalty percentage`}
                  className="h-11 rounded-none border-0 bg-transparent pe-2 text-end shadow-none focus-visible:ring-0"
                  inputMode="numeric"
                  max={100}
                  min={0}
                  onChange={(event) => updateAllocation(allocation.id, {
                    sharePct: Math.min(100, Math.max(0, Number.parseInt(event.target.value, 10) || 0)),
                  })}
                  type="number"
                  value={allocation.sharePct}
                />
                <span className="font-semibold text-muted-foreground">%</span>
              </div>
              {isCreator ? (
                <span className="hidden sm:block sm:size-11" aria-hidden="true" />
              ) : (
                <Button
                  aria-label={`Remove recipient ${index + 1}`}
                  className="h-11 w-11 self-stretch sm:size-11 sm:self-center"
                  onClick={() => onChange({
                    allocations: value.allocations.filter((item) => item.id !== allocation.id),
                  })}
                  size="icon"
                  variant="ghost"
                >
                  <Trash className="size-5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Button
        className="w-full"
        leadingIcon={<Plus className="size-4" />}
        onClick={() => onChange({
          allocations: [
            ...value.allocations,
            {
              id: `recipient-${value.allocations.length}-${Date.now()}`,
              recipientKind: "collaborator",
              sharePct: 0,
            },
          ],
        })}
        variant="outline"
      >
        Add wallet
      </Button>

      {creatorSharePct === 0 ? (
        <Type as="p" variant="caption" className="text-destructive">
          You need to receive at least some royalty.
        </Type>
      ) : totalSharePct !== 100 ? (
        <Type as="p" variant="caption" className="text-destructive">
          Royalty shares must total 100% before publishing.
        </Type>
      ) : (
        <Type as="p" variant="caption" className="text-muted-foreground">
          The split becomes fixed when the asset is registered on Story.
        </Type>
      )}
    </div>
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
  ageGatePolicy,
  license,
  onAgeGatePolicyChange,
  onIdentityChange,
  onLicenseChange,
  onPriceChange,
  onPreviewStartSecondsChange,
  onRegionalPricingChange,
  onRoyaltySplitChange,
  onRoyaltyPercentChange,
  onVinylReleaseUrlChange,
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
  royaltySplit,
  showLicenseFields,
  showRoyaltySplit = false,
  showAnonymousIdentity = true,
  visibility,
  vinylReleaseUrl,
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
  const ageGateId = React.useId();
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

      <section className="space-y-3">
        <div className="flex min-h-14 items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3.5">
          <Checkbox
            aria-label={copy.ageGateTitle}
            checked={ageGatePolicy === "18_plus"}
            id={ageGateId}
            onCheckedChange={(next) => onAgeGatePolicyChange(next === true ? "18_plus" : "none")}
          />
          <Label className="flex-1 text-base leading-6" htmlFor={ageGateId}>
            <span className="block font-medium text-foreground">{copy.ageGateTitle}</span>
            <span className="block text-muted-foreground">{copy.ageGateDescription}</span>
          </Label>
        </div>
      </section>

      {showAccess ? (
        <section className="space-y-3">
          <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
            {isLiveAttachment ? null : (
              <div className="flex min-h-14 items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3.5">
                <Checkbox
                  aria-label={copy.paidUnlockTitle}
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
            {attachment?.kind === "song" && onVinylReleaseUrlChange ? (
              <label className="block space-y-2">
                <Type as="span" variant="body-strong">
                  {copy.vinylReleaseUrlLabel}
                </Type>
                <Input
                  className="h-14 rounded-[var(--radius-lg)] border-border-soft bg-background text-base"
                  inputMode="url"
                  onChange={(event) => onVinylReleaseUrlChange(event.target.value)}
                  placeholder={copy.vinylReleaseUrlPlaceholder}
                  value={vinylReleaseUrl ?? ""}
                />
              </label>
            ) : null}
            {showPaidFields && regionalPricingAvailable && onRegionalPricingChange ? (
              <div className="space-y-2">
                <div className="flex min-h-14 items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3.5">
                  <Checkbox
                    aria-label={copy.regionalPricingLabel}
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
          {showRoyaltySplit && royaltySplit && onRoyaltySplitChange ? (
            <RoyaltySplitEditor onChange={onRoyaltySplitChange} value={royaltySplit} />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
