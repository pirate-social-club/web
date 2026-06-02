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
import {
  DEFAULT_DOCUMENT_PROOF_PROVIDERS,
  type AnonymousIdentityScope,
  type CommunityDefaultAgeGatePolicy,
  type CommunityMembershipMode,
  type CommunityReadAccessMode,
  type CreatorVerificationState,
  type DocumentProofProvider,
  type IdentityGateDraft,
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
  disabled = false,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  disabled?: boolean;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className={cn(
      "flex min-h-14 items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3.5",
      disabled && "opacity-60",
    )}>
      <Checkbox
        checked={checked}
        disabled={disabled}
        id={id}
        onCheckedChange={(next) => {
          if (!disabled) onCheckedChange(next === true);
        }}
      />
      <Label className={cn("flex-1 text-base leading-6", disabled && "text-muted-foreground")} htmlFor={id}>
        {label}
      </Label>
    </div>
  );
}

const POW_EXCLUSIVE_GATE_TYPES: IdentityGateDraft["gateType"][] = [
  "unique_human",
  "nationality",
  "minimum_age",
  "wallet_score",
  "gender",
];

type DocumentGateDraft = Extract<IdentityGateDraft, { gateType: "nationality" | "minimum_age" | "gender" }>;

const DOCUMENT_PROOF_PROVIDER_OPTIONS: Array<{ value: DocumentProofProvider; label: string }> = [
  { value: "self", label: "Self.xyz" },
  { value: "zkpassport", label: "ZKPassport" },
];

function getInitialDocumentProofProviders(): DocumentProofProvider[] {
  return [...DEFAULT_DOCUMENT_PROOF_PROVIDERS];
}

export function normalizeDocumentProofProviders(
  providers: readonly DocumentProofProvider[] | null | undefined,
): DocumentProofProvider[] {
  const selected = DEFAULT_DOCUMENT_PROOF_PROVIDERS.filter((provider) => providers?.includes(provider));
  return selected.length > 0 ? selected : ["self"];
}

function getDocumentProofProviders(draft: DocumentGateDraft | null | undefined): DocumentProofProvider[] {
  return normalizeDocumentProofProviders(draft?.acceptedProviders);
}

export function toggleDocumentProofProvider(
  providers: readonly DocumentProofProvider[],
  provider: DocumentProofProvider,
  checked: boolean,
): DocumentProofProvider[] {
  const current = normalizeDocumentProofProviders(providers);
  if (checked) {
    return DEFAULT_DOCUMENT_PROOF_PROVIDERS.filter((candidate) => candidate === provider || current.includes(candidate));
  }
  if (!current.includes(provider) || current.length === 1) {
    return current;
  }
  return current.filter((candidate) => candidate !== provider);
}

function DocumentProofProviderRows({
  draft,
  onChange,
}: {
  draft: DocumentGateDraft;
  onChange: (providers: DocumentProofProvider[]) => void;
}) {
  const providers = getDocumentProofProviders(draft);
  const idPrefix = `community-${draft.gateType.replaceAll("_", "-")}-proof-provider`;

  return (
    <div className="space-y-2">
      <FormFieldLabel label="Accepted proof apps" />
      <div className="space-y-2">
        {DOCUMENT_PROOF_PROVIDER_OPTIONS.map((option) => {
          const checked = providers.includes(option.value);
          return (
            <CheckboxRow
              key={option.value}
              checked={checked}
              disabled={checked && providers.length === 1}
              id={`${idPrefix}-${option.value}`}
              label={option.label}
              onCheckedChange={(next) => onChange(toggleDocumentProofProvider(providers, option.value, next))}
            />
          );
        })}
      </div>
    </div>
  );
}

export function normalizeGateDraftsForMatchMode(
  drafts: IdentityGateDraft[],
  gateMatchMode: "all" | "any",
): IdentityGateDraft[] {
  if (gateMatchMode === "any") {
    return drafts;
  }
  const hasPow = drafts.some((draft) => draft.gateType === "altcha_pow");
  const hasPowExclusiveGate = drafts.some((draft) => POW_EXCLUSIVE_GATE_TYPES.includes(draft.gateType));
  if (!hasPow || !hasPowExclusiveGate) {
    return drafts;
  }
  return drafts.filter((draft) => draft.gateType !== "altcha_pow");
}

export function upsertGateDraftForMatchMode(
  drafts: IdentityGateDraft[],
  nextDraft: IdentityGateDraft,
  gateMatchMode: "all" | "any",
): IdentityGateDraft[] {
  const existing = drafts.find((draft) => draft.gateType === nextDraft.gateType);
  const preserved = existing?.gateRuleId && !nextDraft.gateRuleId
    ? { ...nextDraft, gateRuleId: existing.gateRuleId }
    : nextDraft;
  if (gateMatchMode === "any") {
    return [
      ...drafts.filter((draft) => draft.gateType !== nextDraft.gateType),
      preserved,
    ];
  }
  if (nextDraft.gateType === "altcha_pow") {
    return [
      ...drafts.filter((draft) => !POW_EXCLUSIVE_GATE_TYPES.includes(draft.gateType) && draft.gateType !== "altcha_pow"),
      preserved,
    ];
  }
  const withoutConflicts = POW_EXCLUSIVE_GATE_TYPES.includes(nextDraft.gateType)
    ? drafts.filter((draft) => draft.gateType !== "altcha_pow")
    : drafts;
  return [
    ...withoutConflicts.filter((draft) => draft.gateType !== nextDraft.gateType),
    preserved,
  ];
}

function removeGateDraft(
  drafts: IdentityGateDraft[],
  gateType: IdentityGateDraft["gateType"],
): IdentityGateDraft[] {
  return drafts.filter((draft) => draft.gateType !== gateType);
}

function shouldResetMatchModeAfterRemovingPowFallback(
  drafts: IdentityGateDraft[],
  gateMatchMode: "all" | "any",
): boolean {
  if (gateMatchMode !== "any") {
    return false;
  }
  return removeGateDraft(drafts, "altcha_pow").length <= 1;
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
  gateMatchMode?: "all" | "any";
  membershipMode: CommunityMembershipMode;
  onAllowAnonymousIdentityChange?: (value: boolean) => void;
  onAnonymousIdentityScopeChange?: (value: AnonymousIdentityScope) => void;
  onBackClick?: () => void;
  onDefaultAgeGatePolicyChange?: (value: CommunityDefaultAgeGatePolicy) => void;
  onGateDraftsChange?: (value: IdentityGateDraft[]) => void;
  onGateMatchModeChange?: (value: "all" | "any") => void;
  onMembershipModeChange?: (value: CommunityMembershipMode) => void;
  onReadAccessModeChange?: (value: CommunityReadAccessMode) => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  showReadAccessSection?: boolean;
  showSaveAction?: boolean;
  showExperimentalZkPassportProviders?: boolean;
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
  gateMatchMode = "all",
  membershipMode,
  readAccessMode = "public",
  onAllowAnonymousIdentityChange,
  onAnonymousIdentityScopeChange,
  onBackClick,
  onDefaultAgeGatePolicyChange,
  onGateDraftsChange,
  onGateMatchModeChange,
  onMembershipModeChange,
  onReadAccessModeChange,
  onSave,
  saveDisabled = false,
  showReadAccessSection = true,
  showSaveAction = true,
  showExperimentalZkPassportProviders = true,
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
  const uniqueHumanGate = gateDrafts.find((draft) => draft.gateType === "unique_human");
  const minimumAgeGate = gateDrafts.find((draft) => draft.gateType === "minimum_age");
  const genderGate = gateDrafts.find((draft) => draft.gateType === "gender");
  const walletScoreGate = gateDrafts.find((draft) => draft.gateType === "wallet_score");
  const altchaPowGate = gateDrafts.find((draft) => draft.gateType === "altcha_pow");
  const erc721Gate = gateDrafts.find((draft) => draft.gateType === "erc721_holding");
  const courtyardInventoryGate = gateDrafts.find((draft) => draft.gateType === "erc721_inventory_match");
  const creatorAgeOver18Verified = creatorVerificationState?.ageOver18Verified ?? true;
  const hasAdultMinimumAgeGate =
    effectiveMembershipMode === "gated"
    && minimumAgeGate != null
    && Number.isInteger(minimumAgeGate.minimumAge)
    && minimumAgeGate.minimumAge >= 18
    && minimumAgeGate.minimumAge <= 125;
  const showGateMatchModeControl =
    effectiveMembershipMode === "gated"
    && (onGateMatchModeChange != null || gateMatchMode === "any");
  const palmScanPowFallbackEnabled = Boolean(uniqueHumanGate && altchaPowGate && gateMatchMode === "any");
  const handlePalmScanPowFallbackChange = React.useCallback((checked: boolean) => {
    if (checked) {
      onGateMatchModeChange?.("any");
      onGateDraftsChange?.(upsertGateDraftForMatchMode(gateDrafts, {
        gateType: "altcha_pow",
      }, "any"));
      return;
    }
    if (shouldResetMatchModeAfterRemovingPowFallback(gateDrafts, gateMatchMode)) {
      onGateMatchModeChange?.("all");
    }
    onGateDraftsChange?.(removeGateDraft(gateDrafts, "altcha_pow"));
  }, [gateDrafts, gateMatchMode, onGateDraftsChange, onGateMatchModeChange]);

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
                  } else if (gateDrafts.length === 0) {
                    onGateDraftsChange?.([{ gateType: "altcha_pow" }]);
                  }
                }}
              />

              {mode === "gated" && effectiveMembershipMode === "gated" ? (
                <div className="space-y-3 pt-2">
                  {showGateMatchModeControl ? (
                    <div className="space-y-3">
                      <FormSectionHeading title="Gate logic" />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <OptionCard
                          className={gateMatchMode === "all" ? "border-border bg-muted/30" : undefined}
                          description="Members must pass every selected gate."
                          selected={gateMatchMode === "all"}
                          title="Require all"
                          onClick={() => {
                            onGateMatchModeChange?.("all");
                            onGateDraftsChange?.(normalizeGateDraftsForMatchMode(gateDrafts, "all"));
                          }}
                        />
                        <OptionCard
                          className={gateMatchMode === "any" ? "border-border bg-muted/30" : undefined}
                          description="Members can pass any one selected gate."
                          selected={gateMatchMode === "any"}
                          title="Allow any one"
                          onClick={() => onGateMatchModeChange?.("any")}
                        />
                      </div>
                    </div>
                  ) : null}

                  <FormSectionHeading title={mc.biometricGateChecksTitle} />

                  <CheckboxCard
                    className={altchaPowGate ? "border-border bg-muted/30" : undefined}
                    checked={Boolean(altchaPowGate)}
                    title={mc.altchaPowTitle}
                    onCheckedChange={(checked) => {
                      if (!checked && shouldResetMatchModeAfterRemovingPowFallback(gateDrafts, gateMatchMode)) {
                        onGateMatchModeChange?.("all");
                      }
                      onGateDraftsChange?.(
                        checked
                          ? upsertGateDraftForMatchMode(gateDrafts, {
                            gateType: "altcha_pow",
                          }, gateMatchMode)
                          : removeGateDraft(gateDrafts, "altcha_pow"),
                      );
                    }}
                  />

                  <CheckboxCard
                    className={uniqueHumanGate ? "border-border bg-muted/30" : undefined}
                    checked={Boolean(uniqueHumanGate)}
                    title={mc.uniqueHumanTitle}
                    onCheckedChange={(checked) => {
                      if (!checked && palmScanPowFallbackEnabled) {
                        onGateMatchModeChange?.("all");
                      }
                      onGateDraftsChange?.(
                        checked
                          ? upsertGateDraftForMatchMode(gateDrafts, {
                            gateType: "unique_human",
                            provider: "very",
                          }, gateMatchMode)
                          : removeGateDraft(gateDrafts, "unique_human"),
                      );
                    }}
                  />

                  {uniqueHumanGate ? (
                    <div className="ps-4">
                      <OptionCard
                        className={palmScanPowFallbackEnabled ? "border-border bg-muted/30" : undefined}
                        description={mc.uniqueHumanPowFallbackDetail}
                        selected={palmScanPowFallbackEnabled}
                        title={mc.uniqueHumanPowFallbackLabel}
                        onClick={() => handlePalmScanPowFallbackChange(!palmScanPowFallbackEnabled)}
                      />
                    </div>
                  ) : null}

                  <CheckboxCard
                    className={nationalityGate ? "border-border bg-muted/30" : undefined}
                    checked={Boolean(nationalityGate)}
                    title={showExperimentalZkPassportProviders ? "Nationality verification" : mc.nationalityTitle}
                    onCheckedChange={(checked) => onGateDraftsChange?.(
                      checked
                        ? upsertGateDraftForMatchMode(gateDrafts, {
                          gateType: "nationality",
                          provider: "self",
                          acceptedProviders: getInitialDocumentProofProviders(),
                          requiredValues: [],
                        }, gateMatchMode)
                        : removeGateDraft(gateDrafts, "nationality"),
                    )}
                  />

                  {nationalityGate ? (
                    <div className="space-y-2 ps-4">
                      {showExperimentalZkPassportProviders ? (
                        <DocumentProofProviderRows
                          draft={nationalityGate}
                          onChange={(providers) => onGateDraftsChange?.(upsertGateDraftForMatchMode(gateDrafts, {
                            ...nationalityGate,
                            acceptedProviders: providers,
                          }, gateMatchMode))}
                        />
                      ) : null}
                      <FormFieldLabel label={mc.allowedNationalityLabel} />
                      <NationalityMultiPicker
                        onChange={(codes) => onGateDraftsChange?.(upsertGateDraftForMatchMode(gateDrafts, {
                          ...nationalityGate,
                          requiredValues: codes,
                        }, gateMatchMode))}
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
                    title={showExperimentalZkPassportProviders ? "Minimum age" : mc.minimumAgeTitle}
                    onCheckedChange={(checked) => onGateDraftsChange?.(
                      checked
                        ? upsertGateDraftForMatchMode(gateDrafts, {
                          gateType: "minimum_age",
                          provider: "self",
                          acceptedProviders: getInitialDocumentProofProviders(),
                          minimumAge: 30,
                        }, gateMatchMode)
                        : removeGateDraft(gateDrafts, "minimum_age"),
                    )}
                  />

                  {minimumAgeGate ? (
                    <div className="space-y-2 ps-4">
                      {showExperimentalZkPassportProviders ? (
                        <DocumentProofProviderRows
                          draft={minimumAgeGate}
                          onChange={(providers) => onGateDraftsChange?.(upsertGateDraftForMatchMode(gateDrafts, {
                            ...minimumAgeGate,
                            acceptedProviders: providers,
                          }, gateMatchMode))}
                        />
                      ) : null}
                      <FormFieldLabel label={mc.minimumAgeLabel} />
                      <NumericStepper
                        max={125}
                        min={18}
                        value={minimumAgeGate.minimumAge}
                        onChange={(next) => onGateDraftsChange?.(upsertGateDraftForMatchMode(gateDrafts, {
                          ...minimumAgeGate,
                          minimumAge: next,
                        }, gateMatchMode))}
                      />
                      {(!Number.isInteger(minimumAgeGate.minimumAge) || minimumAgeGate.minimumAge < 18 || minimumAgeGate.minimumAge > 125) ? (
                        <FormNote tone="warning">{mc.minimumAgeInvalid}</FormNote>
                      ) : null}
                    </div>
                  ) : null}

                  <CheckboxCard
                    className={genderGate ? "border-border bg-muted/30" : undefined}
                    checked={Boolean(genderGate)}
                    title={showExperimentalZkPassportProviders ? "Document sex marker (verified ID)" : mc.genderTitle}
                    onCheckedChange={(checked) => onGateDraftsChange?.(
                      checked
                        ? upsertGateDraftForMatchMode(gateDrafts, {
                          gateType: "gender",
                          provider: "self",
                          acceptedProviders: getInitialDocumentProofProviders(),
                          requiredValue: genderGate?.requiredValue ?? "F",
                        }, gateMatchMode)
                        : removeGateDraft(gateDrafts, "gender"),
                    )}
                  />

                  {genderGate ? (
                    <div className="space-y-2 ps-4">
                      {showExperimentalZkPassportProviders ? (
                        <DocumentProofProviderRows
                          draft={genderGate}
                          onChange={(providers) => onGateDraftsChange?.(upsertGateDraftForMatchMode(gateDrafts, {
                            ...genderGate,
                            acceptedProviders: providers,
                          }, gateMatchMode))}
                        />
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <OptionCard
                          className={genderGate.requiredValue === "F" ? "border-border bg-muted/30" : undefined}
                          selected={genderGate.requiredValue === "F"}
                          title={mc.fMarkerLabel}
                          onClick={() => onGateDraftsChange?.(upsertGateDraftForMatchMode(gateDrafts, {
                            ...genderGate,
                            requiredValue: "F",
                          }, gateMatchMode))}
                        />
                        <OptionCard
                          className={genderGate.requiredValue === "M" ? "border-border bg-muted/30" : undefined}
                          selected={genderGate.requiredValue === "M"}
                          title={mc.mMarkerLabel}
                          onClick={() => onGateDraftsChange?.(upsertGateDraftForMatchMode(gateDrafts, {
                            ...genderGate,
                            requiredValue: "M",
                          }, gateMatchMode))}
                        />
                      </div>
                    </div>
                  ) : null}

                  <FormSectionHeading title={mc.walletGateChecksTitle} />

                  <CheckboxCard
                    className={walletScoreGate ? "border-border bg-muted/30" : undefined}
                    checked={Boolean(walletScoreGate)}
                    title={mc.walletScoreTitle}
                    onCheckedChange={(checked) => onGateDraftsChange?.(
                      checked
                        ? upsertGateDraftForMatchMode(gateDrafts, {
                          gateType: "wallet_score",
                          provider: "passport",
                          minimumScore: 20,
                        }, gateMatchMode)
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
                        onChange={(next) => onGateDraftsChange?.(upsertGateDraftForMatchMode(gateDrafts, {
                          gateType: "wallet_score",
                          provider: "passport",
                          minimumScore: next,
                          gateRuleId: walletScoreGate.gateRuleId,
                        }, gateMatchMode))}
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
                        ? upsertGateDraftForMatchMode(gateDrafts, {
                          gateType: "erc721_holding",
                          chainNamespace: "eip155:1",
                          contractAddress: "",
                        }, gateMatchMode)
                        : removeGateDraft(gateDrafts, "erc721_holding"),
                    )}
                  />

                  {erc721Gate ? (
                    <div className="space-y-2 ps-4">
                      <FormFieldLabel label={mc.collectionContractLabel} />
                      <Input
                        className="h-12 rounded-[var(--radius-lg)]"
                        onChange={(event) => onGateDraftsChange?.(upsertGateDraftForMatchMode(gateDrafts, {
                          gateType: "erc721_holding",
                          chainNamespace: "eip155:1",
                          contractAddress: event.target.value,
                        }, gateMatchMode))}
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
                        ? upsertGateDraftForMatchMode(gateDrafts, createDefaultCourtyardInventoryDraft(), gateMatchMode)
                        : removeGateDraft(gateDrafts, "erc721_inventory_match"),
                    )}
                  />

                  {!COURTYARD_CATALOG_AUTHORING_ENABLED && courtyardInventoryGate ? (
                    <FormNote tone="warning">{mc.courtyardCatalogUnavailable}</FormNote>
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
