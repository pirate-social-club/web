"use client";

import * as React from "react";
import { ArrowLeft } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Checkbox } from "@/components/primitives/checkbox";
import {
  FormFieldLabel,
  FormNote,
  FormSectionHeading,
} from "@/components/primitives/form-layout";
import { IconButton } from "@/components/primitives/icon-button";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { OptionCard } from "@/components/primitives/option-card";
import { RadioGroup, RadioGroupItem } from "@/components/primitives/radio-group";
import type {
  AnonymousIdentityScope,
  CommunityDefaultAgeGatePolicy,
  CommunityMembershipMode,
  CreatorVerificationState,
  IdentityGateDraft,
} from "@/components/compositions/create-community-composer/create-community-composer.types";
import { getGateDraftWarning } from "@/lib/identity-gates";
import { cn } from "@/lib/utils";

const ISO_ALPHA_2 = /^[A-Z]{2}$/;

const membershipMeta: Record<CommunityMembershipMode, { label: string; detail: string }> = {
  open: {
    label: "Open",
    detail: "Anyone can join immediately.",
  },
  request: {
    label: "Request",
    detail: "Users request to join.",
  },
  gated: {
    label: "Gated",
    detail: "Joining requires passing one or more gate checks.",
  },
};

const anonymousScopeMeta: Record<
  AnonymousIdentityScope,
  { label: string; detail: string; disabledHint?: string }
> = {
  community_stable: {
    label: "Community-stable",
    detail: "One persistent anonymous label per user across the community.",
  },
  thread_stable: {
    label: "Thread-stable",
    detail: "One persistent anonymous label per user per thread.",
  },
  post_ephemeral: {
    label: "Post-ephemeral",
    detail: "Random label per post. Limits moderation continuity.",
    disabledHint: "Post-ephemeral scope is not available in v0.",
  },
};

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function SegmentedControl<T extends string>({
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

function CheckboxRow({
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

function upsertGateDraft(
  drafts: IdentityGateDraft[],
  nextDraft: IdentityGateDraft,
): IdentityGateDraft[] {
  const existing = drafts.find((draft) => draft.gateType === nextDraft.gateType);
  const preserved = existing?.gateRuleId && !nextDraft.gateRuleId
    ? { ...nextDraft, gateRuleId: existing.gateRuleId }
    : nextDraft;
  return [
    ...drafts.filter((draft) => draft.gateType !== nextDraft.gateType),
    preserved,
  ];
}

function removeGateDraft(
  drafts: IdentityGateDraft[],
  gateType: IdentityGateDraft["gateType"],
): IdentityGateDraft[] {
  return drafts.filter((draft) => draft.gateType !== gateType);
}

export interface CommunityGatesEditorPageProps {
  allowAnonymousIdentity: boolean;
  anonymousIdentityScope: AnonymousIdentityScope;
  className?: string;
  creatorVerificationState?: CreatorVerificationState;
  defaultAgeGatePolicy: CommunityDefaultAgeGatePolicy;
  gateDrafts: IdentityGateDraft[];
  membershipMode: CommunityMembershipMode;
  onAllowAnonymousIdentityChange?: (value: boolean) => void;
  onAnonymousIdentityScopeChange?: (value: AnonymousIdentityScope) => void;
  onBackClick?: () => void;
  onDefaultAgeGatePolicyChange?: (value: CommunityDefaultAgeGatePolicy) => void;
  onGateDraftsChange?: (value: IdentityGateDraft[]) => void;
  onMembershipModeChange?: (value: CommunityMembershipMode) => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  showSaveAction?: boolean;
}

export function CommunityGatesEditorPage({
  allowAnonymousIdentity,
  anonymousIdentityScope,
  className,
  creatorVerificationState,
  defaultAgeGatePolicy,
  gateDrafts,
  membershipMode,
  onAllowAnonymousIdentityChange,
  onAnonymousIdentityScopeChange,
  onBackClick,
  onDefaultAgeGatePolicyChange,
  onGateDraftsChange,
  onMembershipModeChange,
  onSave,
  saveDisabled = false,
  showSaveAction = true,
}: CommunityGatesEditorPageProps) {
  const nationalityGate = gateDrafts.find((draft) => draft.gateType === "nationality");
  const genderGate = gateDrafts.find((draft) => draft.gateType === "gender");
  const creatorAgeOver18Verified = creatorVerificationState?.ageOver18Verified ?? true;

  return (
    <section className={cn("mx-auto flex w-full max-w-[64rem] flex-col gap-8", className)}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <IconButton aria-label="Back" onClick={onBackClick} variant="ghost">
            <ArrowLeft className="size-6" />
          </IconButton>
          <div className="min-w-0 space-y-2">
            <h1 className="text-[2.25rem] font-semibold tracking-tight">Access and gates</h1>
          </div>
        </div>
        {showSaveAction ? (
          <Button disabled={saveDisabled} onClick={onSave}>
            Save
          </Button>
        ) : null}
      </div>

      <Section title="Membership">
        <SegmentedControl
          onChange={(value) => onMembershipModeChange?.(value as CommunityMembershipMode)}
          options={membershipMeta}
          value={membershipMode}
        />

        {membershipMode === "gated" ? (
          <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-5 py-4">
            <FormSectionHeading
              description="Select at least one gate before saving."
              title="Gate checks"
            />

            <OptionCard
              description="Require nationality verification through Self."
              selected={Boolean(nationalityGate)}
              title="Nationality verification"
              onClick={() => onGateDraftsChange?.(
                nationalityGate
                  ? removeGateDraft(gateDrafts, "nationality")
                  : upsertGateDraft(gateDrafts, {
                    gateType: "nationality",
                    provider: "self",
                    requiredValue: "US",
                  }),
              )}
            />

            {nationalityGate ? (
              <div className="space-y-2">
                <FormFieldLabel label="Country code (ISO 3166-1 alpha-2)" />
                <Input
                  className="h-12 w-24 rounded-[var(--radius-lg)]"
                  maxLength={2}
                  onChange={(event) => onGateDraftsChange?.(upsertGateDraft(gateDrafts, {
                    gateType: "nationality",
                    provider: "self",
                    requiredValue: event.target.value.toUpperCase(),
                  }))}
                  placeholder="US"
                  value={nationalityGate.requiredValue}
                />
                {nationalityGate.requiredValue.length > 0 && !ISO_ALPHA_2.test(nationalityGate.requiredValue) ? (
                  <FormNote tone="warning">Enter a valid 2-letter country code.</FormNote>
                ) : null}
              </div>
            ) : null}

            <OptionCard
              description="Require the Self document marker on a verified document."
              selected={Boolean(genderGate)}
              title="Self document marker"
              onClick={() => onGateDraftsChange?.(
                genderGate
                  ? removeGateDraft(gateDrafts, "gender")
                  : upsertGateDraft(gateDrafts, {
                    gateType: "gender",
                    provider: "self",
                    requiredValue: "F",
                  }),
              )}
            />

            {genderGate ? (
              <div className="space-y-3">
                <SegmentedControl
                  onChange={(value) => onGateDraftsChange?.(upsertGateDraft(gateDrafts, {
                    gateType: "gender",
                    provider: "self",
                    requiredValue: value as "M" | "F",
                  }))}
                  options={{
                    F: {
                      label: "F marker",
                      detail: "Accept only members whose Self document marker is F.",
                    },
                    M: {
                      label: "M marker",
                      detail: "Accept only members whose Self document marker is M.",
                    },
                  }}
                  value={genderGate.requiredValue}
                />
                {getGateDraftWarning("gender") ? (
                  <FormNote tone="warning">{getGateDraftWarning("gender")}</FormNote>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Section>

      <Section className="border-t border-border-soft pt-8" title="Identity and access">
        <div className="space-y-5">
          <CheckboxRow
            checked={allowAnonymousIdentity}
            id="community-allow-anonymous-posting"
            label="Allow anonymous posting"
            onCheckedChange={onAllowAnonymousIdentityChange ?? (() => {})}
          />

          {allowAnonymousIdentity ? (
            <div className="space-y-3 border-l border-border-soft pl-4">
              <p className="text-base font-medium">Anonymous scope</p>
              <div className="space-y-2">
                {(Object.keys(anonymousScopeMeta) as AnonymousIdentityScope[]).map((scope) => {
                  const option = anonymousScopeMeta[scope];
                  const disabled = scope === "post_ephemeral";

                  return (
                    <OptionCard
                      key={scope}
                      description={option.detail}
                      disabled={disabled}
                      disabledHint={option.disabledHint}
                      selected={scope === anonymousIdentityScope}
                      title={option.label}
                      onClick={() => !disabled && onAnonymousIdentityScopeChange?.(scope)}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}

          <CheckboxRow
            checked={defaultAgeGatePolicy === "18_plus"}
            id="community-18-plus"
            label="18+ community"
            onCheckedChange={(checked) => onDefaultAgeGatePolicyChange?.(checked ? "18_plus" : "none")}
          />

          {defaultAgeGatePolicy === "18_plus" && !creatorAgeOver18Verified ? (
            <FormNote tone="warning">
              The owner must complete age verification before launching an 18+ community.
            </FormNote>
          ) : null}
        </div>
      </Section>
    </section>
  );
}
