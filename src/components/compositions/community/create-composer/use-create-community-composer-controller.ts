"use client";

import * as React from "react";
import { isAddress } from "viem";

import { toast } from "@/components/primitives/sonner";
import {
  describeCourtyardInventoryDraft,
  isValidCourtyardInventoryDraft,
} from "@/lib/courtyard-inventory-gates";
import { resolveCommunityAvatarSrc, resolveCommunityBannerSrc } from "@/lib/default-community-media";
import { formatGateRequirement } from "@/lib/identity-gates";
import { useIsMobile } from "@/hooks/use-mobile";
import { logger } from "@/lib/logger";

import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { useCommunityPreviewMedia } from "./create-community-composer.sections";
import type {
  AnonymousIdentityScope,
  CommunityDatabaseRegion,
  CommunityDefaultAgeGatePolicy,
  CommunityMembershipMode,
  ComposerStep,
  CreateCommunityComposerProps,
  IdentityGateDraft,
} from "./create-community-composer.types";

const DEFAULT_MEMBERSHIP_MODE: CommunityMembershipMode = "gated";

function getInvalidGateDraftReason(draft: IdentityGateDraft): string | null {
  if (draft.gateType === "erc721_holding") {
    return isAddress(draft.contractAddress.trim()) ? null : "invalid_erc721_contract";
  }
  if (draft.gateType === "erc721_inventory_match") {
    return isValidCourtyardInventoryDraft(draft) ? null : "invalid_courtyard_inventory";
  }
  if (draft.gateType === "wallet_score") {
    return Number.isFinite(draft.minimumScore) && draft.minimumScore >= 0 && draft.minimumScore <= 100
      ? null
      : "invalid_wallet_score";
  }
  return null;
}

function isValidGateDraft(draft: IdentityGateDraft): boolean {
  return getInvalidGateDraftReason(draft) == null;
}

function summarizeGateDraftForLog(draft: IdentityGateDraft): Record<string, unknown> {
  switch (draft.gateType) {
    case "wallet_score":
      return { gateType: draft.gateType, provider: draft.provider, minimumScore: draft.minimumScore };
    case "nationality":
      return { gateType: draft.gateType, provider: draft.provider, requiredValues: draft.requiredValues };
    case "minimum_age":
      return { gateType: draft.gateType, provider: draft.provider, minimumAge: draft.minimumAge };
    case "gender":
      return { gateType: draft.gateType, provider: draft.provider, requiredValue: draft.requiredValue };
    case "unique_human":
      return { gateType: draft.gateType, provider: draft.provider };
    case "erc721_holding":
      return {
        gateType: draft.gateType,
        chainNamespace: draft.chainNamespace,
        hasContractAddress: draft.contractAddress.trim().length > 0,
        contractAddressValid: isAddress(draft.contractAddress.trim()),
      };
    case "erc721_inventory_match":
      return {
        gateType: draft.gateType,
        chainNamespace: draft.chainNamespace,
        inventoryProvider: draft.inventoryProvider,
        minQuantity: draft.minQuantity,
        valid: isValidCourtyardInventoryDraft(draft),
      };
  }
}

export function useCreateCommunityComposerController({
  avatarRef = "",
  bannerRef = "",
  displayName = "",
  databaseRegion = "aws-us-east-1",
  description = "",
  gateDrafts = [],
  membershipMode = DEFAULT_MEMBERSHIP_MODE,
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
  const initialMembershipMode = membershipMode;
  const [activeStep, setActiveStep] = React.useState<ComposerStep>(initialStep ?? 1);
  const [activeMembershipMode, setActiveMembershipMode] =
    React.useState<CommunityMembershipMode | null>(initialMembershipMode);
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
  const [activeGateDrafts, setActiveGateDrafts] = React.useState<IdentityGateDraft[]>(gateDrafts);
  const [submitting, setSubmitting] = React.useState(false);

  const creatorAgeOver18Verified = creatorVerificationState?.ageOver18Verified ?? false;
  const minimumAgeDraft = activeGateDrafts.find((d) => d.gateType === "minimum_age");
  const hasAdultMinimumAgeGate =
    activeMembershipMode === "gated"
    && minimumAgeDraft != null
    && Number.isInteger(minimumAgeDraft.minimumAge)
    && minimumAgeDraft.minimumAge >= 18
    && minimumAgeDraft.minimumAge <= 125;
  const effectiveDefaultAgeGatePolicy: CommunityDefaultAgeGatePolicy =
    hasAdultMinimumAgeGate ? "18_plus" : activeDefaultAgeGatePolicy;

  const creatorAgeRequirementMet =
    effectiveDefaultAgeGatePolicy !== "18_plus" || creatorAgeOver18Verified;
  const creatorCanCreate = deferCreatorVerification || creatorAgeRequirementMet;
  const gateDraftsValid =
    activeMembershipMode !== "gated"
    || (activeGateDrafts.length > 0 && activeGateDrafts.every(isValidGateDraft));
  const invalidGateDrafts = React.useMemo(
    () => activeGateDrafts
      .map((draft) => ({ draft: summarizeGateDraftForLog(draft), reason: getInvalidGateDraftReason(draft) }))
      .filter((item) => item.reason != null),
    [activeGateDrafts],
  );
  const { locale } = useUiLocale();
  const copy = React.useMemo(() => getLocaleMessages(locale, "routes"), [locale]);
  const cc = copy.createCommunity.composer;

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
      membershipMode: activeMembershipMode ?? "gated",
      defaultAgeGatePolicy: effectiveDefaultAgeGatePolicy,
      allowAnonymousIdentity: activeAllowAnonymousIdentity,
      anonymousIdentityScope: activeAnonymousScope,
      gateDrafts: activeMembershipMode === "gated" ? activeGateDrafts : [],
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
    effectiveDefaultAgeGatePolicy,
    activeAllowAnonymousIdentity,
    activeAnonymousScope,
    activeGateDrafts,
    cc.createError,
  ]);

  const canCreateCommunity = React.useMemo(
    () =>
      !!onCreate &&
      creatorCanCreate &&
      activeDisplayName.trim().length > 0 &&
      activeMembershipMode != null &&
      gateDraftsValid,
    [
      onCreate,
      creatorCanCreate,
      activeDisplayName,
      activeMembershipMode,
      gateDraftsValid,
    ],
  );

  const canProceed = React.useMemo(() => {
    switch (activeStep) {
      case 1:
        return activeDisplayName.trim().length > 0;
      case 2:
        if (!deferCreatorVerification && !creatorAgeRequirementMet) return false;
        if (activeMembershipMode == null) return false;
        return gateDraftsValid;
      case 3:
        return canCreateCommunity;
      default:
        return false;
    }
  }, [
    activeStep,
    activeDisplayName,
    activeMembershipMode,
    gateDraftsValid,
    canCreateCommunity,
    creatorAgeRequirementMet,
    deferCreatorVerification,
  ]);
  const accessStepBlockReasons = React.useMemo(() => {
    const reasons: string[] = [];
    if (!deferCreatorVerification && !creatorAgeRequirementMet) {
      reasons.push("creator_age_verification_required");
    }
    if (activeMembershipMode == null) {
      reasons.push("membership_mode_required");
    }
    if (activeMembershipMode === "gated" && activeGateDrafts.length === 0) {
      reasons.push("gated_membership_requires_gate");
    }
    if (invalidGateDrafts.length > 0) {
      reasons.push("invalid_gate_drafts");
    }
    return reasons;
  }, [
    activeGateDrafts.length,
    activeMembershipMode,
    creatorAgeRequirementMet,
    deferCreatorVerification,
    invalidGateDrafts,
  ]);

  const nextDisabledReason = React.useMemo(() => {
    if (canProceed) {
      return null;
    }
    if (activeStep === 1) {
      return "display_name_required";
    }
    if (activeStep === 2) {
      return accessStepBlockReasons.join(",") || "access_step_blocked";
    }
    if (activeStep === 3) {
      return "create_requirements_incomplete";
    }
    return "unknown";
  }, [accessStepBlockReasons, activeStep, canProceed]);

  React.useEffect(() => {
    logger.warn("[create-community] composer state", {
      activeStep,
      membershipMode: activeMembershipMode,
      gateDrafts: activeGateDrafts.map(summarizeGateDraftForLog),
      gateDraftsValid,
      invalidGateDrafts,
      defaultAgeGatePolicy: activeDefaultAgeGatePolicy,
      effectiveDefaultAgeGatePolicy,
      creatorAgeOver18Verified,
      creatorAgeRequirementMet,
      canProceed,
      canCreateCommunity,
      nextDisabledReason,
      accessStepBlockReasons: activeStep === 2 ? accessStepBlockReasons : [],
    });
  }, [
    accessStepBlockReasons,
    activeDefaultAgeGatePolicy,
    activeGateDrafts,
    activeMembershipMode,
    activeStep,
    canCreateCommunity,
    canProceed,
    creatorAgeOver18Verified,
    creatorAgeRequirementMet,
    effectiveDefaultAgeGatePolicy,
    gateDraftsValid,
    invalidGateDrafts,
    nextDisabledReason,
  ]);

  const handleNext = React.useCallback(() => {
    if (!canProceed) {
      logger.warn("[create-community] blocked next click", {
        activeStep,
        accessStepBlockReasons: activeStep === 2 ? accessStepBlockReasons : [],
        gateDrafts: activeGateDrafts.map(summarizeGateDraftForLog),
      });
      return;
    }
    setActiveStep((s) => Math.min(s + 1, 3) as ComposerStep);
  }, [accessStepBlockReasons, activeGateDrafts, activeStep, canProceed]);

  const membershipLabel = ({
    open: cc.membershipOpenLabel,
    request: cc.membershipRequestLabel,
    gated: cc.membershipGatedLabel,
  })[activeMembershipMode ?? "gated"];
  const databaseRegionLabel = ({
    auto: cc.databaseRegionUsEast,
    "aws-us-east-1": cc.databaseRegionUsEast,
    "aws-us-east-2": cc.databaseRegionUsCentral,
    "aws-us-west-2": cc.databaseRegionUsWest,
    "aws-eu-west-1": cc.databaseRegionEurope,
    "aws-ap-south-1": cc.databaseRegionIndia,
    "aws-ap-northeast-1": cc.databaseRegionJapan,
  })[activeDatabaseRegion];
  const activeReviewGateDrafts = activeMembershipMode === "gated" ? activeGateDrafts : [];
  const gateRequirementSummary = activeReviewGateDrafts.length > 0
    ? activeReviewGateDrafts
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
                  : draft.gateType === "unique_human"
                    ? { gate_type: draft.gateType, accepted_providers: [draft.provider] }
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

  return {
    access: {
      activeAllowAnonymousIdentity,
      activeAnonymousScope,
      activeDefaultAgeGatePolicy,
      activeMembershipMode,
      creatorAgeOver18Verified,
      gateDrafts: activeGateDrafts,
      gateDraftsValid,
      hasAdultMinimumAgeGate,
      setActiveAllowAnonymousIdentity,
      setActiveAnonymousScope,
      setActiveDefaultAgeGatePolicy,
      setActiveGateDrafts,
      setActiveMembershipMode,
    },
    basics: {
      activeAvatarFile,
      activeBannerFile,
      activeDatabaseRegion,
      activeDescription,
      activeDisplayName,
      previewAvatarSrc,
      previewBannerSrc,
      previewDisplayName,
      setActiveAvatarFile,
      setActiveAvatarRef,
      setActiveBannerFile,
      setActiveBannerRef,
      setActiveDatabaseRegion,
      setActiveDescription,
      setActiveDisplayName,
    },
    canCreateCommunity,
    canProceed,
    copy: cc,
    creatorVerificationMessage,
    effectiveDefaultAgeGatePolicy,
    footer: {
      activeStep,
      canCreateCommunity,
      canProceed,
      handleBack,
      handleCreate,
      handleNext,
      nextDisabledReason,
      submitting,
    },
    isMobile,
    review: {
      anonymousPostingLabel: activeAllowAnonymousIdentity ? cc.enabled : cc.disabled,
      anonymousScopeLabel:
        activeAllowAnonymousIdentity && activeAnonymousScope !== "post_ephemeral"
          ? ({
            community_stable: cc.anonymousCommunityStableLabel,
            thread_stable: cc.anonymousThreadStableLabel,
          })[activeAnonymousScope]
          : undefined,
      avatarLabel:
        activeAvatarFile?.name ||
        (activeAvatarRef.trim() ? cc.savedImage : cc.generatedDefault),
      bannerLabel:
        activeBannerFile?.name ||
        (activeBannerRef.trim() ? cc.savedImage : cc.generatedDefault),
      databaseRegionLabel,
      gateRequirementSummary,
      membershipLabel,
    },
    step: activeStep,
  };
}

export type CreateCommunityComposerController = ReturnType<typeof useCreateCommunityComposerController>;
