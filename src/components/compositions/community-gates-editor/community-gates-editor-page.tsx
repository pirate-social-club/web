"use client";

import * as React from "react";
import { isAddress } from "viem";

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
import { OptionCard } from "@/components/primitives/option-card";
import { RadioGroup, RadioGroupItem } from "@/components/primitives/radio-group";
import { NationalityPicker } from "@/components/compositions/create-community-composer/nationality-picker";
import type {
  AnonymousIdentityScope,
  CommunityDefaultAgeGatePolicy,
  CommunityMembershipMode,
  CommunityReadAccessMode,
  CreatorVerificationState,
  IdentityGateDraft,
} from "@/components/compositions/create-community-composer/create-community-composer.types";
import { isCountryCode } from "@/lib/countries";
import { getGateDraftWarning } from "@/lib/identity-gates";
import { cn } from "@/lib/utils";

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

const readAccessMeta: Record<CommunityReadAccessMode, { label: string; detail: string }> = {
  public: {
    label: "Public",
    detail: "Anyone can read posts.",
  },
  members_only: {
    label: "Members only",
    detail: "Only joined members can read posts.",
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
  readAccessMode?: CommunityReadAccessMode;
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
  onReadAccessModeChange?: (value: CommunityReadAccessMode) => void;
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
  readAccessMode = "public",
  onAllowAnonymousIdentityChange,
  onAnonymousIdentityScopeChange,
  onBackClick,
  onDefaultAgeGatePolicyChange,
  onGateDraftsChange,
  onMembershipModeChange,
  onReadAccessModeChange,
  onSave,
  saveDisabled = false,
  showSaveAction = true,
}: CommunityGatesEditorPageProps) {
  const nationalityGate = gateDrafts.find((draft) => draft.gateType === "nationality");
  const genderGate = gateDrafts.find((draft) => draft.gateType === "gender");
  const erc721Gate = gateDrafts.find((draft) => draft.gateType === "erc721_holding");
  const creatorAgeOver18Verified = creatorVerificationState?.ageOver18Verified ?? true;

  return (
    <section className={cn("mx-auto flex w-full max-w-[64rem] flex-col gap-6 md:gap-8", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="min-w-0 space-y-2">
            <h1 className="text-[1.875rem] font-semibold tracking-tight md:text-[2.25rem]">Access and gates</h1>
          </div>
        </div>
      </div>

      <Section title="Membership">
        <SegmentedControl
          onChange={(value) => onMembershipModeChange?.(value as CommunityMembershipMode)}
          options={membershipMeta}
          value={membershipMode}
        />

        {membershipMode === "gated" ? (
          <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4 md:px-5">
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
                <FormFieldLabel label="Allowed nationality" />
                <NationalityPicker
                  onChange={(code) => onGateDraftsChange?.(upsertGateDraft(gateDrafts, {
                    gateType: "nationality",
                    provider: "self",
                    requiredValue: code ?? "",
                  }))}
                  value={nationalityGate.requiredValue || null}
                />
                {nationalityGate.requiredValue.length > 0 && !isCountryCode(nationalityGate.requiredValue) ? (
                  <FormNote tone="warning">Select a valid country.</FormNote>
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

            <OptionCard
              description="Require a linked Ethereum wallet that holds a specific ERC-721 collection."
              selected={Boolean(erc721Gate)}
              title="Ethereum NFT collection"
              onClick={() => onGateDraftsChange?.(
                erc721Gate
                  ? removeGateDraft(gateDrafts, "erc721_holding")
                  : upsertGateDraft(gateDrafts, {
                    gateType: "erc721_holding",
                    chainNamespace: "eip155:1",
                    contractAddress: "",
                  }),
              )}
            />

            {erc721Gate ? (
              <div className="space-y-2">
                <FormFieldLabel label="Collection contract" />
                <Input
                  className="h-12 rounded-[var(--radius-lg)]"
                  onChange={(event) => onGateDraftsChange?.(upsertGateDraft(gateDrafts, {
                    gateType: "erc721_holding",
                    chainNamespace: "eip155:1",
                    contractAddress: event.target.value,
                  }))}
                  placeholder="0x..."
                  value={erc721Gate.contractAddress}
                />
                {!isAddress(erc721Gate.contractAddress.trim()) ? (
                  <FormNote tone="warning">Enter a valid Ethereum contract address.</FormNote>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title="Reading">
        <div className="space-y-3">
          {(Object.keys(readAccessMeta) as CommunityReadAccessMode[]).map((mode) => (
            <OptionCard
              key={mode}
              description={readAccessMeta[mode].detail}
              selected={mode === readAccessMode}
              title={readAccessMeta[mode].label}
              onClick={() => onReadAccessModeChange?.(mode)}
            />
          ))}
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title="Identity and access">
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

      {showSaveAction ? (
        <CommunityModerationSaveFooter
          disabled={saveDisabled}
          onSave={onSave}
        />
      ) : null}
    </section>
  );
}
