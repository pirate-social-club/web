"use client";

import { Type } from "@/components/primitives/type";
import * as React from "react";
import { isAddress } from "viem";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardFooter } from "@/components/primitives/card";
import {
  FormNote,
  FormSectionHeading,
} from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { CheckboxCard } from "@/components/primitives/checkbox-card";
import { OptionCard } from "@/components/primitives/option-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Stepper } from "@/components/primitives/stepper";
import { Textarea } from "@/components/primitives/textarea";
import { toast } from "@/components/primitives/sonner";
import { isCountryCode } from "@/lib/countries";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  COURTYARD_POLYGON_REGISTRY,
  createDefaultCourtyardInventoryDraft,
  describeCourtyardInventoryDraft,
  isValidCourtyardInventoryDraft,
  type CourtyardWalletInventoryGroup,
} from "@/lib/courtyard-inventory-gates";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";
import { resolveCommunityAvatarSrc, resolveCommunityBannerSrc } from "@/lib/default-community-media";
import { formatGateRequirement } from "@/lib/identity-gates";
import { logger } from "@/lib/logger";
import {
  FieldLabel,
  MediaPicker,
  NumericStepper,
  Section,
  SegmentedControl,
  acceptedCommunityImageTypes,
  useCommunityPreviewMedia,
  CheckboxRow,
  CommunityReviewStep,
} from "./create-community-composer.sections";
import { NationalityMultiPicker } from "./nationality-picker";

import type {
  AnonymousIdentityScope,
  ComposerStep,
  CreateCommunityComposerProps,
  CommunityDefaultAgeGatePolicy,
  CommunityDatabaseRegion,
  CommunityMembershipMode,
  IdentityGateDraft,
} from "./create-community-composer.types";
import { CourtyardWalletGateBuilder } from "./courtyard-wallet-gate-builder";

const EMPTY_GATE_DRAFTS: IdentityGateDraft[] = [];
const DATABASE_REGION_OPTIONS: CommunityDatabaseRegion[] = [
  "aws-us-east-1",
  "aws-us-east-2",
  "aws-us-west-2",
  "aws-eu-west-1",
  "aws-ap-south-1",
  "aws-ap-northeast-1",
];

function logCreateCommunityGateDebug(event: string, data: Record<string, unknown>) {
  logger.debug("[CreateCommunityComposer]", event, data);
}

function resolveSelectedCourtyardGroup(
  draft: Extract<IdentityGateDraft, { gateType: "erc721_inventory_match" }>,
  groups: CourtyardWalletInventoryGroup[] | null,
): CourtyardWalletInventoryGroup | null {
  if (!groups) return null;
  return groups.find((group) => (
    group.category === draft.assetFilter.category
    && group.franchise === draft.assetFilter.franchise
    && group.subject === draft.assetFilter.subject
    && group.brand === draft.assetFilter.brand
    && group.model === draft.assetFilter.model
    && group.reference === draft.assetFilter.reference
    && group.set === draft.assetFilter.set
    && group.year === draft.assetFilter.year
    && group.grader === draft.assetFilter.grader
    && group.grade === draft.assetFilter.grade
    && group.condition === draft.assetFilter.condition
  )) ?? null;
}

export function CreateCommunityComposer({
  avatarRef = "",
  bannerRef = "",
  displayName = "",
  databaseRegion = "aws-us-east-1",
  description = "",
  gateDrafts = EMPTY_GATE_DRAFTS,
  membershipMode = "open",
  defaultAgeGatePolicy = "none",
  allowAnonymousIdentity = true,
  anonymousIdentityScope: anonymousIdentityScopeProp,
  creatorVerificationState,
  deferCreatorVerification = false,
  initialStep,
  courtyardInventoryGroups,
  courtyardInventoryLoading = false,
  onCreate,
}: CreateCommunityComposerProps) {
  const isMobile = useIsMobile();
  const [activeStep, setActiveStep] = React.useState<ComposerStep>(initialStep ?? 1);
  const [activeMembershipMode, setActiveMembershipMode] =
    React.useState<CommunityMembershipMode>(membershipMode);
  const [activeDefaultAgeGatePolicy, setActiveDefaultAgeGatePolicy] =
    React.useState<CommunityDefaultAgeGatePolicy>(defaultAgeGatePolicy);
  const [activeAllowAnonymousIdentity, setActiveAllowAnonymousIdentity] =
    React.useState<boolean>(allowAnonymousIdentity);
  const [activeAnonymousScope, setActiveAnonymousScope] =
    React.useState<AnonymousIdentityScope>(anonymousIdentityScopeProp ?? "community_stable");
  const [activeAvatarRef, setActiveAvatarRef] = React.useState(avatarRef ?? "");
  const [activeBannerRef, setActiveBannerRef] = React.useState(bannerRef ?? "");
  const [activeAvatarFile, setActiveAvatarFile] = React.useState<File | null>(null);
  const [activeBannerFile, setActiveBannerFile] = React.useState<File | null>(null);
  const [activeDisplayName, setActiveDisplayName] = React.useState(displayName ?? "");
  const [activeDatabaseRegion, setActiveDatabaseRegion] =
    React.useState<CommunityDatabaseRegion>(databaseRegion);
  const [activeDescription, setActiveDescription] = React.useState(description ?? "");
  const nationalityGate = gateDrafts.find((draft) => draft.gateType === "nationality");
  const minimumAgeGate = gateDrafts.find((draft) => draft.gateType === "minimum_age");
  const walletScoreGate = gateDrafts.find((draft) => draft.gateType === "wallet_score");
  const genderGate = gateDrafts.find((draft) => draft.gateType === "gender");
  const erc721Gate = gateDrafts.find((draft) => draft.gateType === "erc721_holding");
  const courtyardInventoryGate = gateDrafts.find((draft) => draft.gateType === "erc721_inventory_match");
  const [nationalityEnabled, setNationalityEnabled] = React.useState(Boolean(nationalityGate));
  const [nationalityRequiredValues, setNationalityRequiredValues] = React.useState<string[]>(
    nationalityGate?.requiredValues ?? [],
  );
  const [minimumAgeEnabled, setMinimumAgeEnabled] = React.useState(Boolean(minimumAgeGate));
  const [minimumAge, setMinimumAge] = React.useState(minimumAgeGate?.minimumAge ?? 30);
  const [walletScoreEnabled, setWalletScoreEnabled] = React.useState(Boolean(walletScoreGate));
  const [minimumWalletScore, setMinimumWalletScore] = React.useState(walletScoreGate?.minimumScore ?? 20);
  const [genderEnabled, setGenderEnabled] = React.useState(Boolean(genderGate));
  const [genderRequiredValue, setGenderRequiredValue] = React.useState<"M" | "F">(
    genderGate?.requiredValue ?? "F",
  );
  const [erc721Enabled, setErc721Enabled] = React.useState(Boolean(erc721Gate));
  const [erc721ContractAddress, setErc721ContractAddress] = React.useState(
    erc721Gate?.contractAddress ?? "",
  );
  const [courtyardInventoryEnabled, setCourtyardInventoryEnabled] = React.useState(Boolean(courtyardInventoryGate));
  const [courtyardInventoryDraft, setCourtyardInventoryDraft] = React.useState(
    courtyardInventoryGate ?? createDefaultCourtyardInventoryDraft(),
  );
  const [submitting, setSubmitting] = React.useState(false);
  const gateDraftsSyncKey = React.useMemo(
    () =>
      gateDrafts
        .map((draft) => (
          draft.gateType === "erc721_holding"
            ? [draft.gateType, draft.chainNamespace, draft.contractAddress, draft.gateRuleId ?? ""].join(":")
            : draft.gateType === "erc721_inventory_match"
              ? [
                draft.gateType,
                draft.chainNamespace,
                draft.contractAddress,
                draft.inventoryProvider,
                draft.minQuantity,
                draft.assetFilter.category,
                draft.assetFilter.franchise ?? "",
                draft.assetFilter.subject ?? "",
                draft.assetFilter.brand ?? "",
                draft.assetFilter.model ?? "",
                draft.assetFilter.reference ?? "",
                draft.assetFilter.set ?? "",
                draft.assetFilter.year ?? "",
                draft.assetFilter.grader ?? "",
                draft.assetFilter.grade ?? "",
                draft.assetFilter.condition ?? "",
                draft.gateRuleId ?? "",
              ].join(":")
            : draft.gateType === "nationality"
              ? [draft.gateType, draft.provider, draft.requiredValues.join(","), draft.gateRuleId ?? ""].join(":")
              : draft.gateType === "minimum_age"
                ? [draft.gateType, draft.provider, draft.minimumAge, draft.gateRuleId ?? ""].join(":")
                : draft.gateType === "wallet_score"
                  ? [draft.gateType, draft.provider, draft.minimumScore, draft.gateRuleId ?? ""].join(":")
                  : [draft.gateType, draft.provider, draft.requiredValue, draft.gateRuleId ?? ""].join(":")
        ))
        .sort()
        .join("|"),
    [gateDrafts],
  );

  const creatorAgeOver18Verified = creatorVerificationState?.ageOver18Verified ?? false;
  const hasAdultMinimumAgeGate =
    activeMembershipMode === "gated"
    && minimumAgeEnabled
    && Number.isInteger(minimumAge)
    && minimumAge >= 18
    && minimumAge <= 125;
  const effectiveDefaultAgeGatePolicy: CommunityDefaultAgeGatePolicy =
    hasAdultMinimumAgeGate ? "18_plus" : activeDefaultAgeGatePolicy;

  const creatorAgeRequirementMet =
    effectiveDefaultAgeGatePolicy !== "18_plus" || creatorAgeOver18Verified;
  const creatorCanCreate = deferCreatorVerification || creatorAgeRequirementMet;
  const { copy } = useRouteMessages();
  const cc = copy.createCommunity.composer;



  const activeGateDrafts: IdentityGateDraft[] = [
    ...(nationalityEnabled && nationalityRequiredValues.length > 0 && nationalityRequiredValues.every(isCountryCode)
      ? [{ gateType: "nationality" as const, provider: "self" as const, requiredValues: nationalityRequiredValues }]
      : []),
    ...(minimumAgeEnabled && Number.isInteger(minimumAge) && minimumAge >= 18 && minimumAge <= 125
      ? [{ gateType: "minimum_age" as const, provider: "self" as const, minimumAge }]
      : []),
    ...(walletScoreEnabled && Number.isFinite(minimumWalletScore) && minimumWalletScore >= 0 && minimumWalletScore <= 100
      ? [{ gateType: "wallet_score" as const, provider: "passport" as const, minimumScore: minimumWalletScore }]
      : []),
    ...(genderEnabled
      ? [{ gateType: "gender" as const, provider: "self" as const, requiredValue: genderRequiredValue }]
      : []),
    ...(erc721Enabled && isAddress(erc721ContractAddress.trim())
      ? [{
        gateType: "erc721_holding" as const,
        chainNamespace: "eip155:1" as const,
        contractAddress: erc721ContractAddress.trim(),
      }]
      : []),
    ...(courtyardInventoryEnabled && isValidCourtyardInventoryDraft(courtyardInventoryDraft)
      ? [{
        ...courtyardInventoryDraft,
        contractAddress: courtyardInventoryDraft.contractAddress.trim(),
        assetFilter: {
          category: courtyardInventoryDraft.assetFilter.category,
          franchise: courtyardInventoryDraft.assetFilter.franchise?.trim() || undefined,
          subject: courtyardInventoryDraft.assetFilter.subject?.trim() || undefined,
          brand: courtyardInventoryDraft.assetFilter.brand?.trim() || undefined,
          model: courtyardInventoryDraft.assetFilter.model?.trim() || undefined,
          reference: courtyardInventoryDraft.assetFilter.reference?.trim() || undefined,
          set: courtyardInventoryDraft.assetFilter.set?.trim() || undefined,
          year: courtyardInventoryDraft.assetFilter.year?.trim() || undefined,
          grader: courtyardInventoryDraft.assetFilter.grader?.trim() || undefined,
          grade: courtyardInventoryDraft.assetFilter.grade?.trim() || undefined,
          condition: courtyardInventoryDraft.assetFilter.condition?.trim() || undefined,
        },
      }]
      : []),
  ];

  React.useEffect(() => {
    logCreateCommunityGateDebug("syncGateDraftsFromProps", {
      gateDrafts,
      gateDraftsSyncKey,
    });
    const nextNationalityGate = gateDrafts.find((draft) => draft.gateType === "nationality");
    setNationalityEnabled(Boolean(nextNationalityGate));
    setNationalityRequiredValues(nextNationalityGate?.requiredValues ?? []);

    const nextMinimumAgeGate = gateDrafts.find((draft) => draft.gateType === "minimum_age");
    setMinimumAgeEnabled(Boolean(nextMinimumAgeGate));
    setMinimumAge(nextMinimumAgeGate?.minimumAge ?? 30);

    const nextWalletScoreGate = gateDrafts.find((draft) => draft.gateType === "wallet_score");
    setWalletScoreEnabled(Boolean(nextWalletScoreGate));
    setMinimumWalletScore(nextWalletScoreGate?.minimumScore ?? 20);

    const nextGenderGate = gateDrafts.find((draft) => draft.gateType === "gender");
    setGenderEnabled(Boolean(nextGenderGate));
    setGenderRequiredValue(nextGenderGate?.requiredValue ?? "F");

    const nextErc721Gate = gateDrafts.find((draft) => draft.gateType === "erc721_holding");
    setErc721Enabled(Boolean(nextErc721Gate));
    setErc721ContractAddress(nextErc721Gate?.contractAddress ?? "");

    const nextCourtyardInventoryGate = gateDrafts.find((draft) => draft.gateType === "erc721_inventory_match");
    setCourtyardInventoryEnabled(Boolean(nextCourtyardInventoryGate));
    setCourtyardInventoryDraft(nextCourtyardInventoryGate ?? createDefaultCourtyardInventoryDraft());
  }, [gateDraftsSyncKey]);

  const handleStepClick = React.useCallback((step: number) => {
    if (step >= 1 && step <= activeStep) setActiveStep(step as ComposerStep);
  }, [activeStep]);

  const handleNext = React.useCallback(() => {
    setActiveStep((s) => Math.min(s + 1, 3) as ComposerStep);
  }, []);

  const handleBack = React.useCallback(() => {
    setActiveStep((s) => Math.max(s - 1, 1) as ComposerStep);
  }, []);

  const handleCreate = React.useCallback(() => {
    if (!onCreate) return;

    setSubmitting(true);
    void onCreate({
      avatarFile: activeAvatarFile,
      avatarRef: activeAvatarRef.trim() || null,
      bannerFile: activeBannerFile,
      bannerRef: activeBannerRef.trim() || null,
      displayName: activeDisplayName.trim(),
      databaseRegion: activeDatabaseRegion,
      description: activeDescription.trim() || null,
      membershipMode: activeMembershipMode,
      defaultAgeGatePolicy: effectiveDefaultAgeGatePolicy,
      allowAnonymousIdentity: activeAllowAnonymousIdentity,
      anonymousIdentityScope: activeAnonymousScope,
      gateDrafts: activeGateDrafts,
    })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : cc.createError);
      })
      .finally(() => {
        setSubmitting(false);
      });
  }, [
    onCreate,
    activeAvatarFile,
    activeAvatarRef,
    activeBannerFile,
    activeBannerRef,
    activeDisplayName,
    activeDatabaseRegion,
    activeDescription,
    activeMembershipMode,
    activeDefaultAgeGatePolicy,
    activeAllowAnonymousIdentity,
    activeAnonymousScope,
    activeGateDrafts,
  ]);

  const erc721GateValid = !erc721Enabled || isAddress(erc721ContractAddress.trim());
  const courtyardInventoryGateValid = !courtyardInventoryEnabled || isValidCourtyardInventoryDraft(courtyardInventoryDraft);
  const walletScoreGateValid = !walletScoreEnabled || (Number.isFinite(minimumWalletScore) && minimumWalletScore >= 0 && minimumWalletScore <= 100);
  const gateDraftsValid = activeMembershipMode !== "gated" || (activeGateDrafts.length > 0 && erc721GateValid && courtyardInventoryGateValid && walletScoreGateValid);

  const canCreateCommunity = React.useMemo(
    () =>
      !!onCreate &&
      creatorCanCreate &&
      activeDisplayName.trim().length > 0 &&
      gateDraftsValid,
    [
      onCreate,
      creatorCanCreate,
      activeDisplayName,
      gateDraftsValid,
    ],
  );

  const canProceed = React.useMemo(() => {
    switch (activeStep) {
      case 1:
        return activeDisplayName.trim().length > 0;
      case 2:
        if (!deferCreatorVerification && !creatorAgeRequirementMet) return false;
        return gateDraftsValid;
      case 3:
        return canCreateCommunity;
      default:
        return false;
    }
  }, [
    activeStep,
    activeDisplayName,
    gateDraftsValid,
    canCreateCommunity,
    creatorAgeRequirementMet,
    deferCreatorVerification,
  ]);

  const membershipLabel = ({
    open: cc.membershipOpenLabel,
    request: cc.membershipRequestLabel,
    gated: cc.membershipGatedLabel,
  })[activeMembershipMode];
  const databaseRegionLabel = ({
    auto: cc.databaseRegionUsEast,
    "aws-us-east-1": cc.databaseRegionUsEast,
    "aws-us-east-2": cc.databaseRegionUsCentral,
    "aws-us-west-2": cc.databaseRegionUsWest,
    "aws-eu-west-1": cc.databaseRegionEurope,
    "aws-ap-south-1": cc.databaseRegionIndia,
    "aws-ap-northeast-1": cc.databaseRegionJapan,
  })[activeDatabaseRegion];
  const gateRequirementSummary = activeGateDrafts.length > 0
    ? activeGateDrafts
        .map((draft) =>
          formatGateRequirement(
            draft.gateType === "erc721_holding"
              ? { gate_type: draft.gateType, chain_namespace: draft.chainNamespace, contract_address: draft.contractAddress }
              : draft.gateType === "erc721_inventory_match"
                ? {
                  gate_type: draft.gateType,
                  chain_namespace: draft.chainNamespace,
                  contract_address: draft.contractAddress,
                  inventory_provider: draft.inventoryProvider,
                  min_quantity: draft.minQuantity,
                  asset_filter_label: describeCourtyardInventoryDraft(draft).replace(/^\d+ Courtyard /u, ""),
                  asset_category: draft.assetFilter.category,
                }
              : draft.gateType === "nationality"
                ? { gate_type: draft.gateType, required_values: draft.requiredValues }
                : draft.gateType === "minimum_age"
                  ? { gate_type: draft.gateType, required_minimum_age: draft.minimumAge }
                  : draft.gateType === "wallet_score"
                    ? { gate_type: draft.gateType, minimum_score: draft.minimumScore }
                    : { gate_type: draft.gateType, required_value: draft.requiredValue },
            { audience: "admin" },
          ),
        )
        .join(", ")
    : null;
  const previewDisplayName = activeDisplayName.trim() || cc.previewFallback;
  const previewAvatarOverride = useCommunityPreviewMedia(activeAvatarFile, activeAvatarRef);
  const previewAvatarSrc = React.useMemo(
    () => resolveCommunityAvatarSrc({
      avatarSrc: previewAvatarOverride,
      communityId: "draft-community",
      displayName: previewDisplayName,
    }),
    [previewAvatarOverride, previewDisplayName],
  );
  const previewBannerOverride = useCommunityPreviewMedia(activeBannerFile, activeBannerRef);
  const previewBannerSrc = React.useMemo(
    () => resolveCommunityBannerSrc({
      bannerSrc: previewBannerOverride,
      communityId: "draft-community",
      displayName: previewDisplayName,
    }),
    [previewBannerOverride, previewDisplayName],
  );
  const creatorVerificationMessage = deferCreatorVerification
    ? null
    : !creatorAgeRequirementMet
      ? cc.ageVerificationRequired
      : null;

  return (
    <div className={cn("mx-auto w-full max-w-6xl space-y-4", isMobile && "mx-0 max-w-none space-y-5")}>
      <Type as="h2" variant="h1" className="hidden md:block">{cc.title}</Type>
      {creatorVerificationMessage ? (
        <div className="rounded-[var(--radius-lg)] border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <Type as="p" variant="body-strong" className="">{cc.verificationRequired}</Type>
          <FormNote className="mt-1">{creatorVerificationMessage}</FormNote>
        </div>
      ) : null}

      {!isMobile ? (
        <Stepper
          currentStep={activeStep}
          onStepClick={handleStepClick}
          steps={[
            { label: cc.stepCommunity },
            { label: cc.stepAccess },
            { label: cc.stepReview },
          ]}
        />
      ) : null}

      <Card className={cn("overflow-hidden border-border bg-background shadow-none", isMobile && "overflow-visible border-0 bg-transparent")}>
        <CardContent className={cn("space-y-8 p-6 md:p-7", isMobile && "space-y-7 p-0")}>
          {activeStep === 1 ? (
            <Section title="">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.95fr)]">
                <div className="grid content-start gap-4">
                  <div>
                    <FieldLabel label={cc.displayNameLabel} />
                    <Input
                      className="h-12 rounded-[var(--radius-lg)]"
                      onChange={(e) => setActiveDisplayName(e.target.value)}
                      placeholder={cc.displayNamePlaceholder}
                      value={activeDisplayName}
                    />
                  </div>

                  <div>
                    <FieldLabel label={cc.descriptionLabel} />
                    <Textarea
                      className="min-h-32"
                      onChange={(e) => setActiveDescription(e.target.value)}
                      placeholder={cc.descriptionPlaceholder}
                      value={activeDescription}
                    />
                  </div>

                  <div>
                    <FieldLabel label={cc.databaseRegionLabel} />
                    <Select
                      onValueChange={(value) => setActiveDatabaseRegion(value as CommunityDatabaseRegion)}
                      value={activeDatabaseRegion}
                    >
                      <SelectTrigger className="h-12 rounded-[var(--radius-lg)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATABASE_REGION_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {({
                              auto: cc.databaseRegionUsEast,
                              "aws-us-east-1": cc.databaseRegionUsEast,
                              "aws-us-east-2": cc.databaseRegionUsCentral,
                              "aws-us-west-2": cc.databaseRegionUsWest,
                              "aws-eu-west-1": cc.databaseRegionEurope,
                              "aws-ap-south-1": cc.databaseRegionIndia,
                              "aws-ap-northeast-1": cc.databaseRegionJapan,
                            })[option]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="hidden rounded-[var(--radius-lg)] border border-border-soft bg-card px-5 py-5 lg:block">
                  <Type as="h3" variant="h4" className="mb-4">{cc.preview}</Type>
                  <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border-soft bg-background">
                    <div
                      className="h-36 w-full border-b border-border-soft bg-cover bg-center"
                      style={{
                        backgroundColor: "color-mix(in oklab, var(--primary) 18%, var(--card))",
                        backgroundImage: `linear-gradient(135deg, color-mix(in oklab, var(--primary) 24%, transparent), color-mix(in oklab, var(--background) 18%, transparent)), url(${previewBannerSrc})`,
                      }}
                    />
                    <div className="-mt-8 flex items-end gap-5 bg-card px-5 pb-5">
                      <Avatar
                        className="h-24 w-24 border-4 border-card bg-card"
                        fallback={previewDisplayName}
                        size="lg"
                        src={previewAvatarSrc}
                      />
                      <div className="min-w-0 space-y-1 pb-3">
                        <p className="truncate text-2xl font-semibold text-foreground">
                          {previewDisplayName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={cn("border-t border-border-soft pt-6 lg:col-span-2", isMobile && "border-t-0 pt-1")}>
                  <Section title="">
                    <div className="grid gap-4 md:grid-cols-2">
                      <MediaPicker
                        accept={acceptedCommunityImageTypes}
                        file={activeAvatarFile}
                        label={cc.avatarLabel}
                        onRemove={() => setActiveAvatarFile(null)}
                        onSelect={(file) => {
                          setActiveAvatarFile(file);
                          if (file) {
                            setActiveAvatarRef("");
                          }
                        }}
                      />
                      <MediaPicker
                        accept={acceptedCommunityImageTypes}
                        file={activeBannerFile}
                        label={cc.bannerLabel}
                        onRemove={() => setActiveBannerFile(null)}
                        onSelect={(file) => {
                          setActiveBannerFile(file);
                          if (file) {
                            setActiveBannerRef("");
                          }
                        }}
                      />
                    </div>
                  </Section>
                </div>

              </div>
            </Section>
          ) : null}

          {activeStep === 2 ? (
            <>
              <Section title={cc.membershipSection}>
                <SegmentedControl
                  onChange={(value) => setActiveMembershipMode(value as CommunityMembershipMode)}
                  options={{
                    open: { label: cc.membershipOpenLabel, detail: cc.membershipOpenDetail },
                    request: { label: cc.membershipRequestLabel, detail: cc.membershipRequestDetail },
                    gated: { label: cc.membershipGatedLabel, detail: cc.membershipGatedDetail },
                  }}
                  value={activeMembershipMode}
                />

                {!hasAdultMinimumAgeGate ? (
                  <div className="space-y-2">
                    <CheckboxRow
                      checked={activeDefaultAgeGatePolicy === "18_plus"}
                      id="community-18-plus"
                      label={cc.ageGateLabel}
                      onCheckedChange={(checked) =>
                        setActiveDefaultAgeGatePolicy(checked ? "18_plus" : "none")
                      }
                    />
                    {activeDefaultAgeGatePolicy === "18_plus" && !deferCreatorVerification && !creatorAgeOver18Verified ? (
                      <FormNote tone="warning">
                        {cc.creatorAgeRequired}
                      </FormNote>
                    ) : null}
                  </div>
                ) : null}

                {activeMembershipMode === "gated" ? (
                  <div className={cn("space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-5 py-4", isMobile && "rounded-none border-0 bg-transparent px-0 py-0")}>
                    <FormSectionHeading title={cc.gateChecksTitle} />

                    {activeGateDrafts.length === 0 ? (
                      <FormNote tone="warning">{cc.gateChecksDescription}</FormNote>
                    ) : null}

                    <CheckboxCard
                      checked={nationalityEnabled}
                      description={cc.nationalityDescription}
                      title={cc.nationalityTitle}
                      onCheckedChange={(checked) => {
                        logCreateCommunityGateDebug("toggleNationalityGate", {
                          previous: nationalityEnabled,
                          next: checked,
                        });
                        setNationalityEnabled(checked);
                      }}
                    />

                    {nationalityEnabled ? (
                      <div className="space-y-2 border-l-2 border-primary pl-4">
                        <FieldLabel label={cc.allowedNationalityLabel} />
                        <NationalityMultiPicker
                          onChange={(codes) => {
                            logCreateCommunityGateDebug("selectNationality", {
                              previous: nationalityRequiredValues,
                              next: codes,
                            });
                            setNationalityRequiredValues(codes);
                          }}
                          values={nationalityRequiredValues}
                        />
                        {nationalityRequiredValues.some((value) => !isCountryCode(value)) ? (
                          <FormNote tone="warning">{cc.selectValidCountry}</FormNote>
                        ) : null}
                      </div>
                    ) : null}

                    <CheckboxCard
                      checked={minimumAgeEnabled}
                      description={cc.minimumAgeDescription}
                      title={cc.minimumAgeTitle}
                      onCheckedChange={setMinimumAgeEnabled}
                    />

                    {minimumAgeEnabled ? (
                      <div className="space-y-2 border-l-2 border-primary pl-4">
                        <FieldLabel label={cc.minimumAgeLabel} />
                        <NumericStepper
                          max={125}
                          min={18}
                          value={minimumAge}
                          onChange={setMinimumAge}
                        />
                        {(!Number.isInteger(minimumAge) || minimumAge < 18 || minimumAge > 125) ? (
                          <FormNote tone="warning">{cc.minimumAgeInvalid}</FormNote>
                        ) : null}
                      </div>
                    ) : null}

                    <CheckboxCard
                      checked={walletScoreEnabled}
                      description={cc.walletScoreDescription}
                      title={cc.walletScoreTitle}
                      onCheckedChange={setWalletScoreEnabled}
                    />

                    {walletScoreEnabled ? (
                      <div className="space-y-2 border-l-2 border-primary pl-4">
                        <FieldLabel label={cc.walletScoreLabel} />
                        <NumericStepper
                          max={100}
                          min={0}
                          value={minimumWalletScore}
                          onChange={setMinimumWalletScore}
                        />
                        {(!Number.isFinite(minimumWalletScore) || minimumWalletScore < 0 || minimumWalletScore > 100) ? (
                          <FormNote tone="warning">{cc.walletScoreInvalid}</FormNote>
                        ) : null}
                      </div>
                    ) : null}

                    <CheckboxCard
                      checked={erc721Enabled}
                      description={cc.erc721Description}
                      title={cc.erc721Title}
                      onCheckedChange={setErc721Enabled}
                    />

                    {erc721Enabled ? (
                      <div className="space-y-2 border-l-2 border-primary pl-4">
                        <FieldLabel label={cc.collectionContractLabel} />
                        <Input
                          className="h-12 rounded-[var(--radius-lg)]"
                          onChange={(event) => setErc721ContractAddress(event.target.value)}
                          placeholder={cc.collectionContractPlaceholder}
                          value={erc721ContractAddress}
                        />
                        {erc721ContractAddress.trim().length > 0 && !isAddress(erc721ContractAddress.trim()) ? (
                          <FormNote tone="warning">{cc.invalidContractAddress}</FormNote>
                        ) : null}
                      </div>
                    ) : null}

                    <CheckboxCard
                      checked={courtyardInventoryEnabled}
                      description={cc.courtyardDescription}
                      title={cc.courtyardTitle}
                      onCheckedChange={setCourtyardInventoryEnabled}
                    />

                    {courtyardInventoryEnabled && courtyardInventoryGroups !== undefined ? (
                      <div className="space-y-4 border-l-2 border-primary pl-4">
                        <CourtyardWalletGateBuilder
                          groups={courtyardInventoryGroups}
                          loading={courtyardInventoryLoading}
                          quantity={courtyardInventoryDraft.minQuantity}
                          selectedGroup={resolveSelectedCourtyardGroup(courtyardInventoryDraft, courtyardInventoryGroups)}
                          onQuantityChange={(value) => setCourtyardInventoryDraft((draft) => ({ ...draft, minQuantity: value }))}
                          onSelectGroup={(group) => setCourtyardInventoryDraft({
                            gateType: "erc721_inventory_match",
                            chainNamespace: "eip155:137",
                            contractAddress: COURTYARD_POLYGON_REGISTRY,
                            inventoryProvider: "courtyard",
                            minQuantity: 1,
                            assetFilter: {
                              category: group.category,
                              franchise: group.franchise,
                              subject: group.subject,
                              brand: group.brand,
                              model: group.model,
                              reference: group.reference,
                              set: group.set,
                              year: group.year,
                              grader: group.grader,
                              grade: group.grade,
                              condition: group.condition,
                            },
                          })}
                        />
                      </div>
                    ) : courtyardInventoryEnabled ? (
                      <FormNote tone="warning">{cc.courtyardCatalogUnavailable}</FormNote>
                    ) : null}
                  </div>
                ) : null}
              </Section>

              <Section className={cn("border-t border-border-soft pt-8", isMobile && "border-t-0 pt-1")} title={cc.identityAccessSection}>
                <div className="space-y-5">
                  <CheckboxRow
                    checked={activeAllowAnonymousIdentity}
                    id="community-allow-anonymous-posting"
                    label={cc.allowAnonymousPosting}
                    onCheckedChange={setActiveAllowAnonymousIdentity}
                  />

                  {activeAllowAnonymousIdentity ? (
                    <div className="space-y-3 border-s border-border-soft ps-4">
                      <Type as="p" variant="label" className="">{cc.anonymousScopeLabel}</Type>
                      <div className="space-y-2">
                        {([
                          { key: "community_stable" as const, label: cc.anonymousCommunityStableLabel, detail: cc.anonymousCommunityStableDetail },
                          { key: "thread_stable" as const, label: cc.anonymousThreadStableLabel, detail: cc.anonymousThreadStableDetail },
                        ]).map((option) => (
                          <OptionCard
                            key={option.key}
                            description={option.detail}
                            selected={option.key === activeAnonymousScope}
                            title={option.label}
                            onClick={() => setActiveAnonymousScope(option.key)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                </div>
              </Section>
            </>
          ) : null}

          {activeStep === 3 ? (
            <CommunityReviewStep
              ageGateLabel={effectiveDefaultAgeGatePolicy === "18_plus" ? "18+" : cc.none}
              anonymousPostingLabel={activeAllowAnonymousIdentity ? cc.enabled : cc.disabled}
              anonymousScopeLabel={
                activeAllowAnonymousIdentity && activeAnonymousScope !== "post_ephemeral"
                  ? ({
                    community_stable: cc.anonymousCommunityStableLabel,
                    thread_stable: cc.anonymousThreadStableLabel,
                  })[activeAnonymousScope]
                  : undefined
              }
              avatarLabel={
                activeAvatarFile?.name ||
                (activeAvatarRef.trim() ? cc.savedImage : cc.generatedDefault)
              }
              bannerLabel={
                activeBannerFile?.name ||
                (activeBannerRef.trim() ? cc.savedImage : cc.generatedDefault)
              }
              copy={cc}
              creatorVerificationMessage={creatorVerificationMessage}
              databaseRegionLabel={databaseRegionLabel}
              description={activeDescription}
              displayName={activeDisplayName}
              gateRequirementSummary={gateRequirementSummary}
              membershipLabel={membershipLabel}

            />
          ) : null}
        </CardContent>

        <CardFooter className={cn("justify-end border-t border-border-soft p-5", isMobile && "border-t-0 px-0 pb-0 pt-2")}>
          <div className={cn("flex gap-3", isMobile && "w-full justify-end")}>
            {activeStep > 1 ? (
              <Button onClick={handleBack} variant="secondary">
                {cc.back}
              </Button>
            ) : null}
            {activeStep < 3 ? (
              <Button disabled={!canProceed} onClick={handleNext}>
                {cc.next}
              </Button>
            ) : (
              <Button disabled={!canCreateCommunity} loading={submitting} onClick={handleCreate}>{cc.createCommunityAction}</Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
