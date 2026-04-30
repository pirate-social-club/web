"use client";

import * as React from "react";
import { isAddress } from "viem";

import { CommunityModerationSaveFooter } from "@/components/compositions/community/moderation-shell/community-moderation-save-footer";
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
import { NationalityMultiPicker } from "@/components/compositions/community/create-composer/nationality-picker";
import type {
  AnonymousIdentityScope,
  CommunityDefaultAgeGatePolicy,
  CommunityMembershipMode,
  CommunityReadAccessMode,
  CreatorVerificationState,
  IdentityGateDraft,
} from "@/components/compositions/community/create-composer/create-community-composer.types";
import { isCountryCode } from "@/lib/countries";
import {
  COURTYARD_CATALOG_AUTHORING_ENABLED,
  createDefaultCourtyardInventoryDraft,
} from "@/lib/courtyard-inventory-gates";
import { cn } from "@/lib/utils";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { NumericStepper } from "@/components/compositions/community/create-composer/create-community-composer.sections";
import { Type } from "@/components/primitives/type";







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
      <Type as="h2" variant="h2">{title}</Type>
      {children}
    </section>
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
  anonymousScopeChangeWarning?: string;
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
  showReadAccessSection?: boolean;
  showSaveAction?: boolean;
  showTitle?: boolean;
}

export function CommunityGatesEditorPage({
  allowAnonymousIdentity,
  anonymousIdentityScope,
  anonymousScopeChangeWarning: anonymousScopeChangeWarningProp,
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
  showReadAccessSection = true,
  showSaveAction = true,
  showTitle = true,
}: CommunityGatesEditorPageProps) {
  const { locale } = useUiLocale();
  const copy = React.useMemo(() => getLocaleMessages(locale, "routes"), [locale]);
  const mc = copy.moderation.gates;
  const anonymousScopeChangeWarning = anonymousScopeChangeWarningProp ?? mc.anonymousScopeChangeWarning;

  const effectiveMembershipMode: CommunityMembershipMode = membershipMode;

  const membershipMeta: Record<CommunityMembershipMode, { label: string; detail: string }> = {
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
  const genderGate = gateDrafts.find((draft) => draft.gateType === "gender");
  const walletScoreGate = gateDrafts.find((draft) => draft.gateType === "wallet_score");
  const erc721Gate = gateDrafts.find((draft) => draft.gateType === "erc721_holding");
  const courtyardInventoryGate = gateDrafts.find((draft) => draft.gateType === "erc721_inventory_match");
  const creatorAgeOver18Verified = creatorVerificationState?.ageOver18Verified ?? true;
  const hasAdultMinimumAgeGate =
    effectiveMembershipMode === "gated"
    && minimumAgeGate != null
    && Number.isInteger(minimumAgeGate.minimumAge)
    && minimumAgeGate.minimumAge >= 18
    && minimumAgeGate.minimumAge <= 125;

  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      {showTitle ? (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="min-w-0 space-y-2">
              <Type as="h1" variant="h1" className="md:text-4xl">{mc.title}</Type>
            </div>
          </div>
        </div>
      ) : null}

      <Section title={mc.membershipTitle}>
        <div className="space-y-3">
          {(Object.keys(membershipMeta) as Array<Exclude<CommunityMembershipMode, "open">>).map((mode) => (
            <div key={mode} className="space-y-3">
              <OptionCard
                className={mode === effectiveMembershipMode ? "border-border bg-muted/30" : undefined}
                selected={mode === effectiveMembershipMode}
                title={membershipMeta[mode].label}
                onClick={() => {
                  onMembershipModeChange?.(mode);
                  if (mode === "request") {
                    onGateDraftsChange?.([]);
                  }
                }}
              />

              {mode === "gated" && effectiveMembershipMode === "gated" ? (
                <div className="space-y-3 pt-2">
                  <FormSectionHeading title={mc.walletGateChecksTitle} />

                  <CheckboxCard
                    className={walletScoreGate ? "border-border bg-muted/30" : undefined}
                    checked={Boolean(walletScoreGate)}
                    title={mc.walletScoreTitle}
                    onCheckedChange={(checked) => onGateDraftsChange?.(
                      checked
                        ? upsertGateDraft(gateDrafts, {
                          gateType: "wallet_score",
                          provider: "passport",
                          minimumScore: 20,
                        })
                        : removeGateDraft(gateDrafts, "wallet_score"),
                    )}
                  />

                  {walletScoreGate ? (
                    <div className="space-y-2 ps-4">
                      <FormFieldLabel label={mc.walletScoreLabel} />
                      <NumericStepper
                        max={100}
                        min={0}
                        value={walletScoreGate.minimumScore}
                        onChange={(next) => onGateDraftsChange?.(upsertGateDraft(gateDrafts, {
                          gateType: "wallet_score",
                          provider: "passport",
                          minimumScore: next,
                          gateRuleId: walletScoreGate.gateRuleId,
                        }))}
                      />
                      {(!Number.isFinite(walletScoreGate.minimumScore) || walletScoreGate.minimumScore < 0 || walletScoreGate.minimumScore > 100) ? (
                        <FormNote tone="warning">{mc.walletScoreInvalid}</FormNote>
                      ) : null}
                    </div>
                  ) : null}

                  <CheckboxCard
                    className={erc721Gate ? "border-border bg-muted/30" : undefined}
                    checked={Boolean(erc721Gate)}
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
                    <div className="space-y-2 ps-4">
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

                  <CheckboxCard
                    className={courtyardInventoryGate ? "border-border bg-muted/30" : undefined}
                    checked={Boolean(courtyardInventoryGate)}
                    disabled={!COURTYARD_CATALOG_AUTHORING_ENABLED && !courtyardInventoryGate}
                    title={mc.courtyardTitle}
                    onCheckedChange={(checked) => onGateDraftsChange?.(
                      checked
                        ? upsertGateDraft(gateDrafts, createDefaultCourtyardInventoryDraft())
                        : removeGateDraft(gateDrafts, "erc721_inventory_match"),
                    )}
                  />

                  {!COURTYARD_CATALOG_AUTHORING_ENABLED && courtyardInventoryGate ? (
                    <FormNote tone="warning">{mc.courtyardCatalogUnavailable}</FormNote>
                  ) : null}

                  <FormSectionHeading title={mc.biometricGateChecksTitle} />

                  <CheckboxCard
                    className={nationalityGate ? "border-border bg-muted/30" : undefined}
                    checked={Boolean(nationalityGate)}
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
                    <div className="space-y-2 ps-4">
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
                    className={minimumAgeGate ? "border-border bg-muted/30" : undefined}
                    checked={Boolean(minimumAgeGate)}
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
                    <div className="space-y-2 ps-4">
                      <FormFieldLabel label={mc.minimumAgeLabel} />
                      <NumericStepper
                        max={125}
                        min={18}
                        value={minimumAgeGate.minimumAge}
                        onChange={(next) => onGateDraftsChange?.(upsertGateDraft(gateDrafts, {
                          gateType: "minimum_age",
                          provider: "self",
                          minimumAge: next,
                          gateRuleId: minimumAgeGate.gateRuleId,
                        }))}
                      />
                      {(!Number.isInteger(minimumAgeGate.minimumAge) || minimumAgeGate.minimumAge < 18 || minimumAgeGate.minimumAge > 125) ? (
                        <FormNote tone="warning">{mc.minimumAgeInvalid}</FormNote>
                      ) : null}
                    </div>
                  ) : null}

                  <CheckboxCard
                    className={genderGate ? "border-border bg-muted/30" : undefined}
                    checked={Boolean(genderGate)}
                    title={mc.genderTitle}
                    onCheckedChange={(checked) => onGateDraftsChange?.(
                      checked
                        ? upsertGateDraft(gateDrafts, {
                          gateType: "gender",
                          provider: "self",
                          requiredValue: genderGate?.requiredValue ?? "F",
                        })
                        : removeGateDraft(gateDrafts, "gender"),
                    )}
                  />

                  {genderGate ? (
                    <div className="grid gap-3 ps-4 sm:grid-cols-2">
                      <OptionCard
                        className={genderGate.requiredValue === "F" ? "border-border bg-muted/30" : undefined}
                        selected={genderGate.requiredValue === "F"}
                        title={mc.fMarkerLabel}
                        onClick={() => onGateDraftsChange?.(upsertGateDraft(gateDrafts, {
                          gateType: "gender",
                          provider: "self",
                          requiredValue: "F",
                          gateRuleId: genderGate.gateRuleId,
                        }))}
                      />
                      <OptionCard
                        className={genderGate.requiredValue === "M" ? "border-border bg-muted/30" : undefined}
                        selected={genderGate.requiredValue === "M"}
                        title={mc.mMarkerLabel}
                        onClick={() => onGateDraftsChange?.(upsertGateDraft(gateDrafts, {
                          gateType: "gender",
                          provider: "self",
                          requiredValue: "M",
                          gateRuleId: genderGate.gateRuleId,
                        }))}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>

      </Section>

      {!hasAdultMinimumAgeGate ? (
        <Section className="border-t border-border-soft pt-6 md:pt-8" title={mc.contentRatingTitle}>
          <div className="space-y-2">
            <CheckboxRow
              checked={defaultAgeGatePolicy === "18_plus"}
              id="community-18-plus"
              label={mc.ageGateLabel}
              onCheckedChange={(checked) => onDefaultAgeGatePolicyChange?.(checked ? "18_plus" : "none")}
            />
            {defaultAgeGatePolicy === "18_plus" && !creatorAgeOver18Verified ? (
              <FormNote tone="warning">
                {mc.ageGateWarning}
              </FormNote>
            ) : null}
          </div>
        </Section>
      ) : null}

      {showReadAccessSection ? (
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
      ) : null}

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
              <FormNote>{anonymousScopeChangeWarning}</FormNote>
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
