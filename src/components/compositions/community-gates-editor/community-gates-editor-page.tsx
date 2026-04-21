"use client";

import * as React from "react";
import { isAddress } from "viem";

import { CommunityModerationSaveFooter } from "@/components/compositions/community-moderation-shell/community-moderation-save-footer";
import { Checkbox } from "@/components/primitives/checkbox";
import {
  FormFieldLabel,
  FormNote,
  FormSectionHeading,
} from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { CheckboxCard } from "@/components/primitives/checkbox-card";
import { OptionCard } from "@/components/primitives/option-card";
import { RadioGroup, RadioGroupItem } from "@/components/primitives/radio-group";
import { NationalityMultiPicker } from "@/components/compositions/create-community-composer/nationality-picker";
import type {
  AnonymousIdentityScope,
  CommunityDefaultAgeGatePolicy,
  CommunityMembershipMode,
  CommunityReadAccessMode,
  CreatorVerificationState,
  IdentityGateDraft,
} from "@/components/compositions/create-community-composer/create-community-composer.types";
import { isCountryCode } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";







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
  const { copy } = useRouteMessages();
  const mc = copy.moderation.gates;

  const membershipMeta: Record<CommunityMembershipMode, { label: string; detail: string }> = {
    open: { label: mc.membershipOpenLabel, detail: mc.membershipOpenDetail },
    request: { label: mc.membershipRequestLabel, detail: mc.membershipRequestDetail },
    gated: { label: mc.membershipGatedLabel, detail: mc.membershipGatedDetail },
  };

  const anonymousScopeMeta: Record<
    Exclude<AnonymousIdentityScope, "post_ephemeral">,
    { label: string; detail: string }
  > = {
    community_stable: { label: mc.anonymousScopeCommunityStableLabel, detail: mc.anonymousScopeCommunityStableDetail },
    thread_stable: { label: mc.anonymousScopeThreadStableLabel, detail: mc.anonymousScopeThreadStableDetail },

  };

  const readAccessMeta: Record<CommunityReadAccessMode, { label: string; detail: string }> = {
    public: { label: mc.readAccessPublicLabel, detail: mc.readAccessPublicDetail },
    members_only: { label: mc.readAccessMembersOnlyLabel, detail: mc.readAccessMembersOnlyDetail },
  };
  const nationalityGate = gateDrafts.find((draft) => draft.gateType === "nationality");
  const minimumAgeGate = gateDrafts.find((draft) => draft.gateType === "minimum_age");
  const erc721Gate = gateDrafts.find((draft) => draft.gateType === "erc721_holding");
  const creatorAgeOver18Verified = creatorVerificationState?.ageOver18Verified ?? true;

  return (
    <section className={cn("mx-auto flex w-full max-w-[64rem] flex-col gap-6 md:gap-8", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="min-w-0 space-y-2">
            <h1 className="text-[1.875rem] font-semibold tracking-tight md:text-[2.25rem]">{mc.title}</h1>
          </div>
        </div>
      </div>

      <Section title={mc.membershipTitle}>
        <SegmentedControl
          onChange={(value) => onMembershipModeChange?.(value as CommunityMembershipMode)}
          options={membershipMeta}
          value={membershipMode}
        />

        {membershipMode === "gated" ? (
          <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4 md:px-5">
            <FormSectionHeading
              description={mc.gateChecksDescription}
              title={mc.gateChecksTitle}
            />

            <CheckboxCard
              checked={Boolean(nationalityGate)}
              description={mc.nationalityDescription}
              title={mc.nationalityTitle}
              onCheckedChange={(checked) => onGateDraftsChange?.(
                checked
                  ? upsertGateDraft(gateDrafts, {
                    gateType: "nationality",
                    provider: "self",
                    requiredValues: ["USA"],
                  })
                  : removeGateDraft(gateDrafts, "nationality"),
              )}
            />

            {nationalityGate ? (
              <div className="space-y-2">
                <FormFieldLabel label={mc.allowedNationalityLabel} />
                <NationalityMultiPicker
                  onChange={(codes) => onGateDraftsChange?.(upsertGateDraft(gateDrafts, {
                    gateType: "nationality",
                    provider: "self",
                    requiredValues: codes,
                  }))}
                  values={nationalityGate.requiredValues}
                />
                {nationalityGate.requiredValues.some((value) => !isCountryCode(value)) ? (
                  <FormNote tone="warning">{mc.selectValidCountry}</FormNote>
                ) : null}
              </div>
            ) : null}

            <CheckboxCard
              checked={Boolean(minimumAgeGate)}
              description={mc.minimumAgeDescription}
              title={mc.minimumAgeTitle}
              onCheckedChange={(checked) => onGateDraftsChange?.(
                checked
                  ? upsertGateDraft(gateDrafts, {
                    gateType: "minimum_age",
                    provider: "self",
                    minimumAge: 30,
                  })
                  : removeGateDraft(gateDrafts, "minimum_age"),
              )}
            />

            {minimumAgeGate ? (
              <div className="space-y-2">
                <FormFieldLabel label={mc.minimumAgeLabel} />
                <Input
                  className="h-12 rounded-[var(--radius-lg)]"
                  inputMode="numeric"
                  max={125}
                  min={1}
                  onChange={(event) => onGateDraftsChange?.(upsertGateDraft(gateDrafts, {
                    gateType: "minimum_age",
                    provider: "self",
                    minimumAge: Number(event.target.value),
                    gateRuleId: minimumAgeGate.gateRuleId,
                  }))}
                  type="number"
                  value={String(minimumAgeGate.minimumAge)}
                />
                {(!Number.isInteger(minimumAgeGate.minimumAge) || minimumAgeGate.minimumAge < 1 || minimumAgeGate.minimumAge > 125) ? (
                  <FormNote tone="warning">{mc.minimumAgeInvalid}</FormNote>
                ) : null}
              </div>
            ) : null}

            <CheckboxCard
              checked={Boolean(erc721Gate)}
              description={mc.erc721Description}
              title={mc.erc721Title}
              onCheckedChange={(checked) => onGateDraftsChange?.(
                checked
                  ? upsertGateDraft(gateDrafts, {
                    gateType: "erc721_holding",
                    chainNamespace: "eip155:1",
                    contractAddress: "",
                  })
                  : removeGateDraft(gateDrafts, "erc721_holding"),
              )}
            />

            {erc721Gate ? (
              <div className="space-y-2">
                <FormFieldLabel label={mc.collectionContractLabel} />
                <Input
                  className="h-12 rounded-[var(--radius-lg)]"
                  onChange={(event) => onGateDraftsChange?.(upsertGateDraft(gateDrafts, {
                    gateType: "erc721_holding",
                    chainNamespace: "eip155:1",
                    contractAddress: event.target.value,
                  }))}
                  placeholder={mc.collectionContractPlaceholder}
                  value={erc721Gate.contractAddress}
                />
                {erc721Gate.contractAddress.trim().length > 0 && !isAddress(erc721Gate.contractAddress.trim()) ? (
                  <FormNote tone="warning">{mc.invalidContractAddress}</FormNote>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title={mc.readingTitle}>
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

      <Section className="border-t border-border-soft pt-6 md:pt-8" title={mc.identityAndAccessTitle}>
        <div className="space-y-5">
          <CheckboxRow
            checked={allowAnonymousIdentity}
            id="community-allow-anonymous-posting"
            label={mc.allowAnonymousPosting}
            onCheckedChange={onAllowAnonymousIdentityChange ?? (() => {})}
          />

          {allowAnonymousIdentity ? (
            <div className="space-y-3 border-s border-border-soft ps-4">
              <p className="text-base font-medium">{mc.anonymousScopeLabel}</p>
              <div className="space-y-2">
                {((Object.keys(anonymousScopeMeta) as (keyof typeof anonymousScopeMeta)[]).map((scope) => {
                  const option = anonymousScopeMeta[scope];
                  return (
                    <OptionCard
                      key={scope}
                      description={option.detail}
                      selected={scope === anonymousIdentityScope}
                      title={option.label}
                      onClick={() => onAnonymousIdentityScopeChange?.(scope)}
                    />
                  );
                }))}
              </div>
            </div>
          ) : null}

          <CheckboxRow
            checked={defaultAgeGatePolicy === "18_plus"}
            id="community-18-plus"
            label={mc.ageGateLabel}
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
