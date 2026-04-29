import type * as React from "react";
import {
  Globe,
  Lock,
  MaskHappy,
  UsersThree,
} from "@phosphor-icons/react";

import { Input } from "@/components/primitives/input";
import { RadioIndicator } from "@/components/primitives/radio-indicator";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import { normalizePriceInput, normalizeRoyaltyInput } from "./post-composer-utils";
import type { AssetLicensePresetId, AttachmentState } from "./post-composer.types";

export type PostComposerSettingsSectionsCopy = {
  postAsTitle: string;
  publicIdentityDescription: string;
  anonymousIdentityDescription: string;
  visibilityTitle: string;
  publicVisibilityLabel: string;
  communityVisibilityLabel: string;
  paidUnlockTitle: string;
  paidUnlockLabel: string;
  priceLabel: string;
  pricePlaceholder: string;
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
  onAccessChange: (value: "free" | "paid") => void;
  onIdentityChange: (value: "pseudonym" | "anonymous") => void;
  onLicenseChange: (value: AssetLicensePresetId) => void;
  onPriceChange: (value: string) => void;
  onRoyaltyPercentChange: (value: string) => void;
  onVisibilityChange: (value: "public" | "community") => void;
  price: string;
  publicAvatarSrc?: string;
  publicIdentityLabel?: string;
  publicIdentityInitials?: string;
  royaltyPercent: string;
  showLicenseFields?: boolean;
  showAnonymousIdentity?: boolean;
  visibility: "public" | "community";
  onAgentIdentitySelect?: () => void;
};

const defaultCopy: PostComposerSettingsSectionsCopy = {
  postAsTitle: "Post as",
  publicIdentityDescription: "Your public profile",
  anonymousIdentityDescription: "A community pseudonym",
  visibilityTitle: "Who can see this?",
  publicVisibilityLabel: "Public",
  communityVisibilityLabel: "Community",
  paidUnlockTitle: "Paid unlock",
  paidUnlockLabel: "Paid unlock",
  priceLabel: "Price",
  pricePlaceholder: "4.99",
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
      className="flex min-h-16 w-full items-center gap-4 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4 text-start"
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
        "grid w-full grid-cols-[1fr_auto] items-center gap-4 rounded-[var(--radius-lg)] border px-4 py-4 text-start",
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
  anonymousIdentityLabel = "anon_amber-anchor-00",
  identity,
  license,
  onAccessChange,
  onIdentityChange,
  onLicenseChange,
  onPriceChange,
  onRoyaltyPercentChange,
  onVisibilityChange,
  price,
  publicAvatarSrc,
  publicIdentityLabel = "saint-pablo.pirate",
  publicIdentityInitials = "sp",
  royaltyPercent,
  showLicenseFields,
  showAnonymousIdentity = true,
  visibility,
  onAgentIdentitySelect,
}: PostComposerSettingsSectionsProps) {
  const showAccess = Boolean(attachment && (attachment.kind === "song" || attachment.kind === "video"));
  const showPaidFields = access === "paid" && showAccess;
  const shouldShowLicenseFields = showLicenseFields ?? showPaidFields;
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
            publicAvatarSrc ? (
              <img alt="" className="size-full rounded-full object-cover" src={publicAvatarSrc} />
            ) : (
              <span className="text-base font-bold">{publicIdentityInitials}</span>
            )
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
          <Type as="h2" variant="h3" className="text-muted-foreground">
            {copy.paidUnlockTitle}
          </Type>
          <OptionRow
            checked={access === "paid"}
            icon={<Lock className="size-7" />}
            onClick={() => onAccessChange(access === "paid" ? "free" : "paid")}
            title={copy.paidUnlockLabel}
          />
          {showPaidFields || shouldShowLicenseFields ? (
            <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
              {showPaidFields ? (
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
              ) : null}
              {shouldShowLicenseFields ? (
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
              ) : null}
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
