"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Checkbox } from "@/components/primitives/checkbox";
import { Input } from "@/components/primitives/input";
import { ImageSquare, Minus, Plus } from "@phosphor-icons/react";
import {
  FormFieldLabel,
  FormNote,
} from "@/components/primitives/form-layout";
import { Label } from "@/components/primitives/label";
import { FlatTabBar, FlatTabButton } from "@/components/compositions/system/flat-tabs/flat-tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Type } from "@/components/primitives/type";
import { defaultRouteCopy } from "../../system/route-copy-defaults";

import type {
  AnonymousIdentityScope,
  CommunityMembershipMode,
} from "./create-community-composer.types";

export const ISO_ALPHA_2 = /^[A-Z]{2}$/;
export const acceptedCommunityImageTypes = "image/png,image/jpeg,image/webp,image/gif,image/avif";



export function Section({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {title.trim() || hint ? (
        <div className="space-y-1.5">
          {title.trim() ? (
            <Type as="h3" variant="h4">{title}</Type>
          ) : null}
          {hint ? <FormNote>{hint}</FormNote> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function FieldLabel({ label }: { label: string }) {
  return <FormFieldLabel className="mb-1.5" label={label} />;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Record<T, { label: string; detail?: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  const keys = Object.keys(options) as T[];
  const selectedOption = options[value];

  return (
    <div className="space-y-3">
      <FlatTabBar columns={keys.length}>
        {keys.map((key) => (
          <FlatTabButton
            key={key}
            active={value === key}
            onClick={() => onChange(key)}
          >
            {options[key].label}
          </FlatTabButton>
        ))}
      </FlatTabBar>
      {selectedOption.detail ? <FormNote>{selectedOption.detail}</FormNote> : null}
    </div>
  );
}

export function CheckboxRow({
  checked,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3.5">
      <Checkbox
        checked={checked}
        id={id}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
      <Label className="flex-1 text-base leading-6" htmlFor={id}>
        {label}
      </Label>
    </div>
  );
}

export function ReviewField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-base text-muted-foreground">{label}</p>
      <Type as="p" variant="label">{value || "\u2014"}</Type>
    </div>
  );
}

export function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  return (
    <div className={cn("space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4", isMobile && "rounded-none border-0 bg-transparent px-0 py-0")}>
      <Type as="h3" variant="body-strong">{title}</Type>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </div>
  );
}

export function NumericStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        size="icon"
        type="button"
        variant="secondary"
      >
        <Minus className="size-4" />
      </Button>
      <Input
        className="h-12 w-20 text-center rounded-[var(--radius-lg)]"
        inputMode="numeric"
        max={max}
        min={min}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          if (!Number.isNaN(parsed)) onChange(parsed);
        }}
        type="number"
        value={String(value)}
      />
      <Button
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        size="icon"
        type="button"
        variant="secondary"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

export function CommunityReviewStep({
  ageGateLabel,
  anonymousPostingLabel,
  anonymousScopeLabel,
  avatarLabel,
  bannerLabel,
  copy,
  creatorVerificationMessage,
  databaseRegionLabel,
  description,
  displayName,
  gateRequirementSummary,
  membershipLabel,
}: {
  ageGateLabel: string;
  anonymousPostingLabel: string;
  anonymousScopeLabel?: string;
  avatarLabel: string;
  bannerLabel: string;
  copy: Record<string, string>;
  creatorVerificationMessage: string | null;
  databaseRegionLabel: string;
  description: string;
  displayName: string;
  gateRequirementSummary: string | null;
  membershipLabel: string;
}) {
  return (
    <div className="space-y-4">
      <ReviewSection title={copy.reviewCommunitySection}>
        <ReviewField label={copy.reviewDisplayName} value={displayName} />
        <div className="md:col-span-2">
          <ReviewField label={copy.reviewDescription} value={description || "\u2014"} />
        </div>
        <ReviewField label={copy.reviewDataRegion} value={databaseRegionLabel} />
        <ReviewField label={copy.reviewAvatar} value={avatarLabel} />
        <ReviewField label={copy.reviewBanner} value={bannerLabel} />
      </ReviewSection>

      <ReviewSection title={copy.reviewAccessPolicySection}>
        <ReviewField label={copy.reviewJoinFlow} value={membershipLabel} />
        <ReviewField label={copy.reviewAgeGate} value={ageGateLabel} />
        {gateRequirementSummary ? (
          <div className="md:col-span-2">
            <ReviewField label={copy.reviewMembershipGates} value={gateRequirementSummary} />
          </div>
        ) : null}
        <ReviewField label={copy.reviewAnonymousPosting} value={anonymousPostingLabel} />
        {anonymousScopeLabel ? (
          <ReviewField label={copy.reviewAnonymousScope} value={anonymousScopeLabel} />
        ) : null}
      </ReviewSection>

      {creatorVerificationMessage ? (
        <div className="rounded-[var(--radius-lg)] border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-base font-semibold text-foreground">
            {creatorVerificationMessage}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function useObjectUrl(file: File | null): string | null {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  return objectUrl;
}

export function useCommunityPreviewMedia(file: File | null, ref: string | null) {
  return useObjectUrl(file) ?? (ref?.trim() || null);
}

export function MediaPicker({
  accept,
  file,
  label,
  onSelect,
  onRemove,
}: {
  accept: string;
  file: File | null;
  label: string;
  onSelect: (file: File | null) => void;
  onRemove: () => void;
}) {
  const inputId = React.useId();
  const isMobile = useIsMobile();
  const copy = defaultRouteCopy;
  const cc = copy.createCommunity.composer;

  return (
    <div className="space-y-2">
      <FieldLabel label={label} />
      <input
        accept={accept}
        className="sr-only"
        id={inputId}
        onChange={(event) => {
          onSelect(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
        type="file"
      />
      <div className={cn("rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4", isMobile && "rounded-none border-0 bg-transparent px-0 py-0")}>
        <div className={cn("flex min-h-24 items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-dashed border-border-soft bg-background px-4 py-4", isMobile && "rounded-[var(--radius-lg)] border-solid bg-muted/20")}>
          <div className="flex min-w-0 items-center gap-4">
            <ImageSquare className="size-10 shrink-0 text-muted-foreground" />
            <div className="min-w-0 space-y-1">
              <p className="truncate text-base font-medium text-foreground">
                {file?.name || cc.uploadPrompt}
              </p>
              {file ? null : (
                <p className="text-base text-muted-foreground">
                  {label === cc.bannerLabel ? cc.bannerUploadHelp : cc.avatarUploadHelp}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {file ? (
              <Button onClick={onRemove} size="sm" type="button" variant="ghost">
                {cc.remove}
              </Button>
            ) : null}
            <label className="cursor-pointer" htmlFor={inputId}>
              <span className="inline-flex h-10 items-center rounded-full bg-muted px-4 text-base font-semibold text-foreground">
                {file ? cc.replace : cc.chooseFile}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
