"use client";

import * as React from "react";

import { toast } from "@/components/primitives/sonner";
import {
  describeCourtyardInventoryDraft,
} from "@/lib/courtyard-inventory-gates";
import { resolveCommunityAvatarSrc, resolveCommunityBannerSrc } from "@/lib/default-community-media";
import { formatGateRequirement } from "@/lib/identity-gates";
import { useIsMobile } from "@/hooks/use-mobile";

import { defaultRouteCopy } from "../../system/route-copy-defaults";
import { useCommunityPreviewMedia } from "./create-community-composer.sections";
import type {
  AnonymousIdentityScope,
  CommunityDatabaseRegion,
  CommunityDefaultAgeGatePolicy,
  CommunityMembershipMode,
  ComposerStep,
  CreateCommunityComposerProps,
} from "./create-community-composer.types";
import { useCommunityGateState } from "./use-community-gate-state";

export function useCreateCommunityComposerController({
  avatarRef = "",
  bannerRef = "",
  displayName = "",
  databaseRegion = "aws-us-east-1",
  description = "",
  gateDrafts = [],
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
  const [submitting, setSubmitting] = React.useState(false);

  const gateState = useCommunityGateState(gateDrafts, activeMembershipMode);
  const creatorAgeOver18Verified = creatorVerificationState?.ageOver18Verified ?? false;
  const hasAdultMinimumAgeGate =
    activeMembershipMode === "gated"
    && gateState.minimumAgeEnabled
    && Number.isInteger(gateState.minimumAge)
    && gateState.minimumAge >= 18
    && gateState.minimumAge <= 125;
  const effectiveDefaultAgeGatePolicy: CommunityDefaultAgeGatePolicy =
    hasAdultMinimumAgeGate ? "18_plus" : activeDefaultAgeGatePolicy;

  const creatorAgeRequirementMet =
    effectiveDefaultAgeGatePolicy !== "18_plus" || creatorAgeOver18Verified;
  const creatorCanCreate = deferCreatorVerification || creatorAgeRequirementMet;
  const copy = defaultRouteCopy;
  const cc = copy.createCommunity.composer;

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
      gateDrafts: gateState.activeGateDrafts,
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
    gateState.activeGateDrafts,
    cc.createError,
  ]);

  const canCreateCommunity = React.useMemo(
    () =>
      !!onCreate &&
      creatorCanCreate &&
      activeDisplayName.trim().length > 0 &&
      gateState.gateDraftsValid,
    [
      onCreate,
      creatorCanCreate,
      activeDisplayName,
      gateState.gateDraftsValid,
    ],
  );

  const canProceed = React.useMemo(() => {
    switch (activeStep) {
      case 1:
        return activeDisplayName.trim().length > 0;
      case 2:
        if (!deferCreatorVerification && !creatorAgeRequirementMet) return false;
        return gateState.gateDraftsValid;
      case 3:
        return canCreateCommunity;
      default:
        return false;
    }
  }, [
    activeStep,
    activeDisplayName,
    gateState.gateDraftsValid,
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
  const gateRequirementSummary = gateState.activeGateDrafts.length > 0
    ? gateState.activeGateDrafts
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

  return {
    access: {
      activeAllowAnonymousIdentity,
      activeAnonymousScope,
      activeDefaultAgeGatePolicy,
      activeMembershipMode,
      creatorAgeOver18Verified,
      courtyardInventoryGroups,
      courtyardInventoryLoading,
      deferCreatorVerification,
      gateState,
      hasAdultMinimumAgeGate,
      setActiveAllowAnonymousIdentity,
      setActiveAnonymousScope,
      setActiveDefaultAgeGatePolicy,
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
