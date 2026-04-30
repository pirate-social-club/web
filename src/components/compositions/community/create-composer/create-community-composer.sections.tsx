"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Checkbox } from "@/components/primitives/checkbox";
import { Input } from "@/components/primitives/input";
import { ImageSquare, Lock, Minus, Plus, Users } from "@phosphor-icons/react";
import {
  FormFieldLabel,
  FormNote,
} from "@/components/primitives/form-layout";
import { Label } from "@/components/primitives/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Type } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

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
    <div className="space-y-1">
      <Type as="p" className="text-muted-foreground" variant="caption">{label}</Type>
      <p className="text-base font-medium text-foreground">{value || "\u2014"}</p>
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
  return (
    <div className="space-y-5 py-6 first:pt-0 last:pb-0">
      <Type as="h3" variant="h4">
        {title}
      </Type>
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">{children}</div>
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
    <div className="space-y-0">
      {/* Community section */}
      <div className="pb-8">
        <div className="flex items-center gap-3 pb-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Users className="size-5 text-muted-foreground" />
          </div>
          <Type as="h3" variant="h3">{copy.reviewCommunitySection}</Type>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-1">
            <Type as="p" className="text-muted-foreground" variant="caption">{copy.reviewDisplayName}</Type>
            <p className="text-base font-medium text-foreground">{displayName}</p>
          </div>
          <div className="relative space-y-1 md:border-l md:border-border-soft md:pl-6">
            <Type as="p" className="text-muted-foreground" variant="caption">{copy.reviewDescription}</Type>
            <p className="text-base font-medium text-foreground">{description || "\u2014"}</p>
          </div>
        </div>

        <div className="mt-5 space-y-1">
          <Type as="p" className="text-muted-foreground" variant="caption">{copy.reviewDataRegion}</Type>
          <p className="text-base font-medium text-foreground">{databaseRegionLabel}</p>
        </div>

        {(avatarLabel !== copy.generatedDefault || bannerLabel !== copy.generatedDefault) ? (
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            {avatarLabel !== copy.generatedDefault ? (
              <div className="space-y-1">
                <Type as="p" className="text-muted-foreground" variant="caption">{copy.reviewAvatar}</Type>
                <p className="text-base font-medium text-foreground">{avatarLabel}</p>
              </div>
            ) : null}
            {bannerLabel !== copy.generatedDefault ? (
              <div className={cn("space-y-1", avatarLabel !== copy.generatedDefault && "relative md:border-l md:border-border-soft md:pl-6")}>
                <Type as="p" className="text-muted-foreground" variant="caption">{copy.reviewBanner}</Type>
                <p className="text-base font-medium text-foreground">{bannerLabel}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Divider */}
      <div className="border-t border-border-soft" />

      {/* Access policy section */}
      <div className="py-8">
        <div className="flex items-center gap-3 pb-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Lock className="size-5 text-muted-foreground" />
          </div>
          <Type as="h3" variant="h3">{copy.reviewAccessPolicySection}</Type>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-1">
            <Type as="p" className="text-muted-foreground" variant="caption">{copy.reviewJoinFlow}</Type>
            <p className="text-base font-medium text-foreground">{membershipLabel}</p>
          </div>
          <div className="relative space-y-1 md:border-l md:border-border-soft md:pl-6">
            <Type as="p" className="text-muted-foreground" variant="caption">{copy.reviewAgeGate}</Type>
            <p className="text-base font-medium text-foreground">{ageGateLabel}</p>
          </div>
        </div>

        {gateRequirementSummary ? (
          <div className="mt-6 space-y-1">
            <Type as="p" className="text-muted-foreground" variant="caption">{copy.reviewMembershipGates}</Type>
            <p className="text-base font-medium text-foreground">{gateRequirementSummary}</p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-1">
            <Type as="p" className="text-muted-foreground" variant="caption">{copy.reviewAnonymousPosting}</Type>
            <p className="text-base font-medium text-foreground">{anonymousPostingLabel}</p>
          </div>
          {anonymousScopeLabel ? (
            <div className="relative space-y-1 md:border-l md:border-border-soft md:pl-6">
              <Type as="p" className="text-muted-foreground" variant="caption">{copy.reviewAnonymousScope}</Type>
              <p className="text-base font-medium text-foreground">{anonymousScopeLabel}</p>
            </div>
          ) : null}
        </div>
      </div>

      {creatorVerificationMessage ? (
        <div className="mt-5 rounded-[var(--radius-lg)] border border-destructive/20 bg-destructive/5 px-4 py-3">
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
  const { locale } = useUiLocale();
  const copy = React.useMemo(() => getLocaleMessages(locale, "routes"), [locale]);
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
