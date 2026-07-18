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
import type { GateAtom } from "@pirate/api-contracts";
import {
  createEmptyGateBuilderDraft,
  isGateBuilderDraftSavable,
  parseGatePolicyToTreeDraft,
  serializeGateBuilderTreeDraft,
  type GateBuilderDraftNode,
  type GateBuilderGroupDraft,
} from "@/app/authenticated-helpers/community-gate-tree-draft";
import { serializeIdentityGateDrafts } from "@/app/authenticated-helpers/community-gate-rule-serialization";

import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { useCommunityPreviewMedia } from "./create-community-composer.sections";
import type {
  AnonymousIdentityScope,
  CommunityDatabaseRegion,
  CommunityDefaultAgeGatePolicy,
  CommunityGateMatchMode,
  CommunityMembershipMode,
  ComposerStep,
  CreateCommunityComposerProps,
  IdentityGateDraft,
} from "./create-community-composer.types";

const DEFAULT_MEMBERSHIP_MODE: CommunityMembershipMode = "gated";

function findTreeGate(root: GateBuilderGroupDraft, predicate: (gate: GateAtom) => boolean): GateAtom | null {
  const visit = (node: GateBuilderDraftNode): GateAtom | null => {
    if (node.kind === "rule") return predicate(node.gate) ? node.gate : null;
    for (const child of node.children) {
      const match = visit(child);
      if (match) return match;
    }
    return null;
  };
  return visit(root);
}

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
    case "altcha_pow":
      return { gateType: draft.gateType };
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

function formatGateRequirementList(
  requirements: string[],
  mode: CommunityGateMatchMode,
  locale: string,
): string {
  if (requirements.length <= 1) {
    return requirements[0] ?? "";
  }
  try {
    return new Intl.ListFormat(locale, {
      style: "long",
      type: mode === "any" ? "disjunction" : "conjunction",
    }).format(requirements);
  } catch {
    const separator = mode === "any" ? " or " : " and ";
    return requirements.join(separator);
  }
}

export function useCreateCommunityComposerController({
  avatarRef = "",
  bannerRef = "",
  displayName = "",
  databaseRegion = "aws-us-east-1",
  description = "",
  gateDrafts = [],
  gateMatchMode = "all",
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
  const [activeGateDrafts, setActiveGateDrafts] = React.useState<IdentityGateDraft[]>(
    gateDrafts,
  );
  const [activeGateMatchMode, setActiveGateMatchMode] = React.useState<CommunityGateMatchMode>(gateMatchMode);
  const [activeGateTreeDraft, setActiveGateTreeDraft] = React.useState<GateBuilderGroupDraft>(() => (
    gateDrafts.length > 0
      ? parseGatePolicyToTreeDraft(serializeIdentityGateDrafts(gateDrafts, { mode: gateMatchMode }))
      : createEmptyGateBuilderDraft()
  ));
  const [submitting, setSubmitting] = React.useState(false);

  const creatorAgeOver18Verified = creatorVerificationState?.ageOver18Verified ?? false;
  const minimumAgeDraft = activeGateDrafts.find((d) => d.gateType === "minimum_age");
  const treeMinimumAgeGate = findTreeGate(activeGateTreeDraft, (gate) => gate.type === "minimum_age");
  const treeMinimumAge = treeMinimumAgeGate?.type === "minimum_age" ? treeMinimumAgeGate.minimum_age : undefined;
  const hasAdultMinimumAgeGate =
    activeMembershipMode === "gated"
    && (typeof treeMinimumAge === "number"
      ? Number.isInteger(treeMinimumAge)
        && treeMinimumAge >= 18
        && treeMinimumAge <= 125
      : minimumAgeDraft != null
        && Number.isInteger(minimumAgeDraft.minimumAge)
        && minimumAgeDraft.minimumAge >= 18
        && minimumAgeDraft.minimumAge <= 125);
  const effectiveDefaultAgeGatePolicy: CommunityDefaultAgeGatePolicy =
    hasAdultMinimumAgeGate ? "18_plus" : activeDefaultAgeGatePolicy;

  const creatorAgeRequirementMet =
    effectiveDefaultAgeGatePolicy !== "18_plus" || creatorAgeOver18Verified;
  const creatorCanCreate = deferCreatorVerification || creatorAgeRequirementMet;
  const gateDraftsValid =
    activeMembershipMode !== "gated"
    || isGateBuilderDraftSavable(activeGateTreeDraft);
  const invalidGateDrafts = React.useMemo(
    () => activeGateDrafts.reduce<Array<{ draft: ReturnType<typeof summarizeGateDraftForLog>; reason: string }>>((result, draft) => {
      const reason = getInvalidGateDraftReason(draft);
      if (reason != null) {
        result.push({ draft: summarizeGateDraftForLog(draft), reason });
      }
      return result;
    }, []),
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
      gateMatchMode: activeGateMatchMode,
      gatePolicy: activeMembershipMode === "gated" ? serializeGateBuilderTreeDraft(activeGateTreeDraft) : null,
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
    activeGateMatchMode,
    activeGateTreeDraft,
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
    if (activeMembershipMode === "gated" && serializeGateBuilderTreeDraft(activeGateTreeDraft) == null) {
      reasons.push("gated_membership_requires_gate");
    }
    if (activeMembershipMode === "gated" && !isGateBuilderDraftSavable(activeGateTreeDraft)) {
      reasons.push("invalid_gate_tree");
    }
    return reasons;
  }, [
    activeGateTreeDraft,
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
      gateTreeDraft: activeGateTreeDraft,
      gateMatchMode: activeGateMatchMode,
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
    activeGateMatchMode,
    activeGateTreeDraft,
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
      gateTreeDraft: activeGateTreeDraft,
      });
      return;
    }
    setActiveStep((s) => Math.min(s + 1, 3) as ComposerStep);
  }, [accessStepBlockReasons, activeGateDrafts, activeGateTreeDraft, activeStep, canProceed]);

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
    ? formatGateRequirementList(
      activeReviewGateDrafts.map((draft) =>
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
                      : draft.gateType === "altcha_pow"
                        ? { gate_type: draft.gateType }
                        : { gate_type: draft.gateType, required_value: draft.requiredValue },
          {
            audience: "admin",
            provider: draft.gateType === "unique_human" ? draft.provider : undefined,
          },
        ),
      ),
      activeGateMatchMode,
      locale,
    )
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
      gateMatchMode: activeGateMatchMode,
      gateTreeDraft: activeGateTreeDraft,
      gateDraftsValid,
      hasAdultMinimumAgeGate,
      setActiveAllowAnonymousIdentity,
      setActiveAnonymousScope,
      setActiveDefaultAgeGatePolicy,
      setActiveGateDrafts,
      setActiveGateMatchMode,
      setActiveGateTreeDraft,
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
