"use client";

import * as React from "react";
import { isAddress } from "viem";

import { CommunityModerationSaveFooter } from "@/components/compositions/community/moderation-shell/community-moderation-save-footer";
import { Checkbox } from "@/components/primitives/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/primitives/radio-group";
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
import { GateTreeBuilder } from "@/components/compositions/community/gates-editor/tree-builder/gate-tree-builder";
import { createOwnedCourtyardCapabilitySource } from "@/components/compositions/community/gates-editor/tree-builder/owned-courtyard-capability-source";
import { createFallbackCollectionCapabilitySource } from "@/components/compositions/community/gates-editor/tree-builder/api-collection-capability-source";
import type { CollectionCapabilitySource } from "@/components/compositions/community/gates-editor/tree-builder/collection-capability-source";
import type { GateBuilderGroupDraft } from "@/app/authenticated-helpers/community-gate-tree-draft";
import {
  DEFAULT_DOCUMENT_PROOF_PROVIDERS,
  type AnonymousIdentityScope,
  type CommunityDefaultAgeGatePolicy,
  type CommunityMembershipMode,
  type CommunityReadAccessMode,
  type CourtyardWalletInventoryGroup,
  type CreatorVerificationState,
  type DocumentProofProvider,
  type IdentityGateDraft,
} from "@/components/compositions/community/create-composer/create-community-composer.types";
import { isCountryCode } from "@/lib/countries";
import {
  createCourtyardInventoryDraftFromGroup,
} from "@/lib/courtyard-inventory-gates";
import { cn } from "@/lib/utils";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { NumericStepper } from "@/components/compositions/community/create-composer/create-community-composer.sections";
import { Type } from "@/components/primitives/type";
import { ActionBanner } from "@/components/primitives/action-banner";
import {
  buildGateRequirementGroupsProjection,
  type GateRequirementGroupsProjection,
} from "./gate-requirement-groups";







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

export function AdvancedGatePolicyBanner({
  replacementRequired,
  replaceConfirmed,
  onReplaceConfirmedChange,
}: {
  replacementRequired: boolean;
  replaceConfirmed: boolean;
  onReplaceConfirmedChange?: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-warning/40 bg-warning/10 p-4">
      <ActionBanner
        title="Advanced gate policy"
        subtitle={replacementRequired
          ? "The visible gate settings no longer match the saved policy. Confirm replacement to save this simpler policy."
          : "This community uses a gate policy this editor cannot fully show. It will be preserved unless you replace it."}
      />
      {replacementRequired ? (
        <div className="mt-3 flex items-center gap-3">
          <Checkbox
            checked={replaceConfirmed}
            id="replace-advanced-gate-policy"
            onCheckedChange={(checked) => onReplaceConfirmedChange?.(checked === true)}
          />
          <Label className="leading-5" htmlFor="replace-advanced-gate-policy">
            Replace the saved advanced policy with the gate settings shown here
          </Label>
        </div>
      ) : null}
    </div>
  );
}

export function courtyardInventoryDraftMatchesGroup(
  draft: Extract<IdentityGateDraft, { gateType: "erc721_inventory_match" }> | undefined,
  group: CourtyardWalletInventoryGroup,
): boolean {
  if (!draft) return false;
  const candidate = createCourtyardInventoryDraftFromGroup(group);
  return draft.chainNamespace === candidate.chainNamespace
    && draft.contractAddress.toLowerCase() === candidate.contractAddress.toLowerCase()
    && draft.assetFilter.category === candidate.assetFilter.category
    && draft.assetFilter.franchise === candidate.assetFilter.franchise
    && draft.assetFilter.subject === candidate.assetFilter.subject
    && draft.assetFilter.brand === candidate.assetFilter.brand
    && draft.assetFilter.model === candidate.assetFilter.model
    && draft.assetFilter.reference === candidate.assetFilter.reference
    && draft.assetFilter.set === candidate.assetFilter.set
    && draft.assetFilter.year === candidate.assetFilter.year
    && draft.assetFilter.grader === candidate.assetFilter.grader
    && draft.assetFilter.grade === candidate.assetFilter.grade
    && draft.assetFilter.condition === candidate.assetFilter.condition;
}

export function canAuthorCourtyardInventoryGate(
  groups: CourtyardWalletInventoryGroup[] | null | undefined,
): boolean {
  return Boolean(groups?.length);
}

type DocumentGateDraft = Extract<IdentityGateDraft, { gateType: "nationality" | "minimum_age" | "gender" }>;

type DocumentProofProviderChoice = "self" | "zkpassport" | "both";

const DOCUMENT_PROOF_PROVIDER_CHOICES: Array<{ value: DocumentProofProviderChoice; label: string }> = [
  { value: "self", label: "Self.xyz only" },
  { value: "zkpassport", label: "ZKPassport only" },
  { value: "both", label: "Self.xyz or ZKPassport" },
];

export const GATE_REQUIREMENT_SECTION_TITLES = {
  documentAttributes: "Document attributes",
  humanity: "Humanity",
  reputation: "Reputation",
  tokenHoldings: "Token holdings",
} as const;

export const GATE_REQUIREMENT_SECTION_ORDER = [
  "humanity",
  "documentAttributes",
  "tokenHoldings",
  "reputation",
] as const;

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

export function documentProofProviderChoiceFromProviders(
  providers: readonly DocumentProofProvider[] | null | undefined,
): DocumentProofProviderChoice {
  const selected = normalizeDocumentProofProviders(providers);
  if (selected.length === 1) {
    return selected[0];
  }
  return "both";
}

export function documentProofProvidersFromChoice(
  choice: string,
): DocumentProofProvider[] {
  if (choice === "zkpassport") {
    return ["zkpassport"];
  }
  if (choice === "both") {
    return [...DEFAULT_DOCUMENT_PROOF_PROVIDERS];
  }
  return ["self"];
}

function DocumentProofProviderRows({
  draft,
  onChange,
}: {
  draft: DocumentGateDraft;
  onChange: (providers: DocumentProofProvider[]) => void;
}) {
  const providers = getDocumentProofProviders(draft);
  const choice = documentProofProviderChoiceFromProviders(providers);

  return (
    <div className="space-y-2">
      <FormFieldLabel label="Accepted proof apps" />
      <RadioGroup
        className="grid-cols-1 sm:grid-cols-3"
        value={choice}
        onValueChange={(next) => onChange(documentProofProvidersFromChoice(next))}
      >
        {DOCUMENT_PROOF_PROVIDER_CHOICES.map((option) => (
          <RadioGroupItem key={option.value} value={option.value}>
            {option.label}
          </RadioGroupItem>
        ))}
      </RadioGroup>
    </div>
  );
}

export function normalizeGateDraftsForMatchMode(
  drafts: IdentityGateDraft[],
  gateMatchMode: "all" | "any",
): IdentityGateDraft[] {
  return drafts;
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

function shouldResetMatchModeAfterRemovingPowFallback(
  drafts: IdentityGateDraft[],
  gateMatchMode: "all" | "any",
): boolean {
  if (gateMatchMode !== "any") {
    return false;
  }
  return removeGateDraft(drafts, "altcha_pow").length <= 1;
}

export type GateEditorGroupedAuthoringState = {
  allowAnyDescription: string;
  projection: GateRequirementGroupsProjection;
  showMatchModeControl: boolean;
  showStandaloneAntiBotControl: boolean;
};

export function getGateEditorGroupedAuthoringState(
  gateDrafts: readonly IdentityGateDraft[],
  gateMatchMode: "all" | "any",
): GateEditorGroupedAuthoringState {
  const projection = buildGateRequirementGroupsProjection(gateDrafts, gateMatchMode);
  return {
    allowAnyDescription: projection.normalAuthoringSupported
      ? "Members can pass any one selected access path."
      : "Members can pass any one selected advanced access path. Review the saved policy before replacing it.",
    projection,
    showMatchModeControl: gateMatchMode === "any",
    showStandaloneAntiBotControl: projection.groups.some((group) => group.kind === "standalone_antibot"),
  };
}

export interface CommunityGatesEditorPageProps {
  advancedGatePolicyReplacementRequired?: boolean;
  allowAnonymousIdentity: boolean;
  anonymousIdentityScope: AnonymousIdentityScope;
  anonymousScopeChangeWarning?: string;
  readAccessMode?: CommunityReadAccessMode;
  className?: string;
  creatorVerificationState?: CreatorVerificationState;
  courtyardInventoryGroups?: CourtyardWalletInventoryGroup[] | null;
  courtyardInventoryLoading?: boolean;
  collectionCapabilitySource?: CollectionCapabilitySource;
  defaultAgeGatePolicy: CommunityDefaultAgeGatePolicy;
  gateDrafts: IdentityGateDraft[];
  gateMatchMode?: "all" | "any";
  gateTreeDraft?: GateBuilderGroupDraft;
  hasAdvancedGatePolicy?: boolean;
  membershipMode: CommunityMembershipMode;
  onAllowAnonymousIdentityChange?: (value: boolean) => void;
  onAnonymousIdentityScopeChange?: (value: AnonymousIdentityScope) => void;
  onBackClick?: () => void;
  onDefaultAgeGatePolicyChange?: (value: CommunityDefaultAgeGatePolicy) => void;
  onGateDraftsChange?: (value: IdentityGateDraft[]) => void;
  onGateMatchModeChange?: (value: "all" | "any") => void;
  onGateTreeDraftChange?: (value: GateBuilderGroupDraft) => void;
  onMembershipModeChange?: (value: CommunityMembershipMode) => void;
  onReadAccessModeChange?: (value: CommunityReadAccessMode) => void;
  onReplaceAdvancedGatePolicyChange?: (value: boolean) => void;
  onSave?: () => void;
  replaceAdvancedGatePolicy?: boolean;
  saveDisabled?: boolean;
  showReadAccessSection?: boolean;
  showSaveAction?: boolean;
  showExperimentalZkPassportProviders?: boolean;
  showTitle?: boolean;
  useGateTreeBuilder?: boolean;
}

export function CommunityGatesEditorPage({
  advancedGatePolicyReplacementRequired = false,
  allowAnonymousIdentity,
  anonymousIdentityScope,
  anonymousScopeChangeWarning: anonymousScopeChangeWarningProp,
  className,
  creatorVerificationState,
  courtyardInventoryGroups,
  courtyardInventoryLoading = false,
  collectionCapabilitySource,
  defaultAgeGatePolicy,
  gateDrafts,
  gateMatchMode = "all",
  gateTreeDraft,
  hasAdvancedGatePolicy = false,
  membershipMode,
  readAccessMode = "public",
  onAllowAnonymousIdentityChange,
  onAnonymousIdentityScopeChange,
  onBackClick,
  onDefaultAgeGatePolicyChange,
  onGateDraftsChange,
  onGateMatchModeChange,
  onGateTreeDraftChange,
  onMembershipModeChange,
  onReadAccessModeChange,
  onReplaceAdvancedGatePolicyChange,
  onSave,
  replaceAdvancedGatePolicy = false,
  saveDisabled = false,
  showReadAccessSection = true,
  showSaveAction = true,
  showExperimentalZkPassportProviders = true,
  showTitle = true,
  useGateTreeBuilder = false,
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
  const courtyardInventoryAuthoringAvailable = canAuthorCourtyardInventoryGate(courtyardInventoryGroups);
  const courtyardCapabilitySource = React.useMemo(() => {
    const ownedSource = createOwnedCourtyardCapabilitySource(courtyardInventoryGroups ?? []);
    return collectionCapabilitySource
      ? createFallbackCollectionCapabilitySource(collectionCapabilitySource, ownedSource)
      : ownedSource;
  }, [collectionCapabilitySource, courtyardInventoryGroups]);
  const selectedCourtyardInventoryGroup = courtyardInventoryGroups?.find((group) =>
    courtyardInventoryDraftMatchesGroup(courtyardInventoryGate, group)
  ) ?? null;
  const creatorAgeOver18Verified = creatorVerificationState?.ageOver18Verified ?? true;
  const hasAdultMinimumAgeGate =
    effectiveMembershipMode === "gated"
    && minimumAgeGate != null
    && Number.isInteger(minimumAgeGate.minimumAge)
    && minimumAgeGate.minimumAge >= 18
    && minimumAgeGate.minimumAge <= 125;
  const groupedAuthoringState = React.useMemo(
    () => getGateEditorGroupedAuthoringState(gateDrafts, gateMatchMode),
    [gateDrafts, gateMatchMode],
  );
  const showGateMatchModeControl =
    effectiveMembershipMode === "gated"
    && groupedAuthoringState.showMatchModeControl;
  const uniqueHumanGateTitle = uniqueHumanGate?.provider === "self"
    ? "Private ID proof (Self.xyz)"
    : mc.uniqueHumanTitle;
  const palmScanPowFallbackEnabled = Boolean(
    uniqueHumanGate?.provider === "very"
    && altchaPowGate?.fallbackFor === "unique_human",
  );
  const handlePalmScanPowFallbackChange = React.useCallback((checked: boolean) => {
    if (checked) {
      onGateDraftsChange?.(upsertGateDraftForMatchMode(gateDrafts, {
        gateType: "altcha_pow",
        fallbackFor: "unique_human",
      }, gateMatchMode));
      return;
    }
    onGateDraftsChange?.(removeGateDraft(gateDrafts, "altcha_pow"));
  }, [gateDrafts, gateMatchMode, onGateDraftsChange]);

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

      {hasAdvancedGatePolicy ? (
        <AdvancedGatePolicyBanner
          replacementRequired={advancedGatePolicyReplacementRequired}
          replaceConfirmed={replaceAdvancedGatePolicy}
          onReplaceConfirmedChange={onReplaceAdvancedGatePolicyChange}
        />
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
                useGateTreeBuilder && gateTreeDraft && onGateTreeDraftChange ? (
                  <GateTreeBuilder
                    capabilitySource={courtyardCapabilitySource}
                    className="max-w-none p-0"
                    onChange={onGateTreeDraftChange}
                    showHeader={false}
                    value={gateTreeDraft}
                  />
                ) : (
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
                          description={groupedAuthoringState.allowAnyDescription}
                          selected={gateMatchMode === "any"}
                          title="Allow any one"
                          onClick={() => onGateMatchModeChange?.("any")}
                        />
                      </div>
                    </div>
                  ) : null}

                  <FormSectionHeading title={GATE_REQUIREMENT_SECTION_TITLES.humanity} />

                  {groupedAuthoringState.showStandaloneAntiBotControl ? (
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
                  ) : null}

                  <CheckboxCard
                    className={uniqueHumanGate ? "border-border bg-muted/30" : undefined}
                    checked={Boolean(uniqueHumanGate)}
                    title={uniqueHumanGateTitle}
                    onCheckedChange={(checked) => {
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

                  {uniqueHumanGate?.provider === "very" ? (
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

                  <FormSectionHeading title={GATE_REQUIREMENT_SECTION_TITLES.documentAttributes} />

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

                  <FormSectionHeading title={GATE_REQUIREMENT_SECTION_TITLES.tokenHoldings} />

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
                    disabled={!courtyardInventoryAuthoringAvailable && !courtyardInventoryGate}
                    title={mc.courtyardTitle}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        onGateDraftsChange?.(removeGateDraft(gateDrafts, "erc721_inventory_match"));
                        return;
                      }
                      const firstGroup = courtyardInventoryGroups?.[0];
                      if (!firstGroup) return;
                      onGateDraftsChange?.(upsertGateDraftForMatchMode(
                        gateDrafts,
                        createCourtyardInventoryDraftFromGroup(firstGroup),
                        gateMatchMode,
                      ));
                    }}
                  />

                  {courtyardInventoryAuthoringAvailable && courtyardInventoryGate ? (
                    <div className="space-y-3 ps-4">
                      {courtyardInventoryLoading ? (
                        <FormNote>{mc.courtyardInventoryLoading}</FormNote>
                      ) : courtyardInventoryGroups && courtyardInventoryGroups.length > 0 ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          {courtyardInventoryGroups.map((group) => (
                            <OptionCard
                              description={group.displayDetail ?? `${group.count} in wallet`}
                              key={`${group.chainNamespace ?? "eip155:137"}:${group.contractAddress ?? "courtyard"}:${group.displayLabel}`}
                              selected={courtyardInventoryDraftMatchesGroup(courtyardInventoryGate, group)}
                              title={group.displayLabel}
                              onClick={() => onGateDraftsChange?.(upsertGateDraftForMatchMode(
                                gateDrafts,
                                createCourtyardInventoryDraftFromGroup(group),
                                gateMatchMode,
                              ))}
                            />
                          ))}
                        </div>
                      ) : (
                        <FormNote>{mc.courtyardInventoryEmpty}</FormNote>
                      )}
                      {!selectedCourtyardInventoryGroup ? (
                        <FormNote tone="warning">{mc.courtyardInventorySelectPrompt}</FormNote>
                      ) : null}
                    </div>
                  ) : courtyardInventoryGate ? (
                    <FormNote tone="warning">{mc.courtyardCatalogUnavailable}</FormNote>
                  ) : null}

                  <FormSectionHeading title={GATE_REQUIREMENT_SECTION_TITLES.reputation} />

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
                </div>
                )
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
