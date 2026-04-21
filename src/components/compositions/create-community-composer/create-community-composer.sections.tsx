"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Checkbox } from "@/components/primitives/checkbox";
import {
  FormFieldLabel,
  FormNote,
} from "@/components/primitives/form-layout";
import { Label } from "@/components/primitives/label";
import { RadioGroup, RadioGroupItem } from "@/components/primitives/radio-group";
import { cn } from "@/lib/utils";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";

import type {
  AnonymousIdentityScope,
  CommunityMembershipMode,
} from "./create-community-composer.types";

export const ISO_ALPHA_2 = /^[A-Z]{2}$/;
export const acceptedCommunityImageTypes = "image/png,image/jpeg,image/webp,image/gif";



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
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
        {hint ? <FormNote>{hint}</FormNote> : null}
      </div>
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
      <RadioGroup
        className="grid"
        onValueChange={(next) => onChange(next as T)}
        value={value}
        style={{ gridTemplateColumns: `repeat(${keys.length}, minmax(0, 1fr))` }}
      >
        {keys.map((key) => (
          <RadioGroupItem key={key} value={key}>
            {options[key].label}
          </RadioGroupItem>
        ))}
      </RadioGroup>
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
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
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
  description,
  displayName,
  gateRequirementSummary,
  membershipLabel,
  routeLabel,
}: {
  ageGateLabel: string;
  anonymousPostingLabel: string;
  anonymousScopeLabel?: string;
  avatarLabel: string;
  bannerLabel: string;
  copy: Record<string, string>;
  creatorVerificationMessage: string | null;
  description: string;
  displayName: string;
  gateRequirementSummary: string | null;
  membershipLabel: string;
  routeLabel: string;
}) {
  return (
    <div className="space-y-4">
      <ReviewSection title={copy.reviewCommunitySection}>
        <ReviewField label={copy.reviewDisplayName} value={displayName} />
        <div className="md:col-span-2">
          <ReviewField label={copy.reviewDescription} value={description || "\u2014"} />
        </div>
        <ReviewField label={copy.reviewRoute} value={routeLabel} />
        <ReviewField label={copy.reviewAvatar} value={avatarLabel} />
        <ReviewField label={copy.reviewBanner} value={bannerLabel} />
      </ReviewSection>

      <ReviewSection title={copy.reviewAccessPolicySection}>
        <ReviewField label={copy.reviewJoinFlow} value={membershipLabel} />
        {gateRequirementSummary ? (
          <div className="md:col-span-2">
            <ReviewField label={copy.reviewMembershipGates} value={gateRequirementSummary} />
          </div>
        ) : null}
        <ReviewField label={copy.reviewAnonymousPosting} value={anonymousPostingLabel} />
        {anonymousScopeLabel ? (
          <ReviewField label={copy.reviewAnonymousScope} value={anonymousScopeLabel} />
        ) : null}
        <ReviewField label={copy.reviewAgeGate} value={ageGateLabel} />
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
  const { copy } = useRouteMessages();
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
      <div className="flex min-h-14 items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3.5">
        <p className="min-w-0 truncate text-base font-medium text-foreground">
          {file?.name || null}
        </p>
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
  );
}
