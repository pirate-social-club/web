import * as React from "react";
import { isAddress } from "viem";
import { isCountryCode } from "@/lib/countries";
import {
  COURTYARD_POLYGON_REGISTRY,
  createDefaultCourtyardInventoryDraft,
  isValidCourtyardInventoryDraft,
  type CourtyardWalletInventoryGroup,
} from "@/lib/courtyard-inventory-gates";
import { logger } from "@/lib/logger";

import type {
  AnonymousIdentityScope,
  CommunityDefaultAgeGatePolicy,
  CommunityDatabaseRegion,
  CommunityMembershipMode,
  IdentityGateDraft,
} from "./create-community-composer.types";

function logCreateCommunityGateDebug(event: string, data: Record<string, unknown>) {
  logger.debug("[CreateCommunityComposer]", event, data);
}

export type CommunityGateState = {
  nationalityEnabled: boolean;
  nationalityRequiredValues: string[];
  minimumAgeEnabled: boolean;
  minimumAge: number;
  walletScoreEnabled: boolean;
  minimumWalletScore: number;
  genderEnabled: boolean;
  genderRequiredValue: "M" | "F";
  erc721Enabled: boolean;
  erc721ContractAddress: string;
  courtyardInventoryEnabled: boolean;
  courtyardInventoryDraft: Extract<IdentityGateDraft, { gateType: "erc721_inventory_match" }>;
  activeGateDrafts: IdentityGateDraft[];
  erc721GateValid: boolean;
  courtyardInventoryGateValid: boolean;
  walletScoreGateValid: boolean;
  gateDraftsValid: boolean;
  setNationalityEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setNationalityRequiredValues: React.Dispatch<React.SetStateAction<string[]>>;
  setMinimumAgeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setMinimumAge: React.Dispatch<React.SetStateAction<number>>;
  setWalletScoreEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setMinimumWalletScore: React.Dispatch<React.SetStateAction<number>>;
  setGenderEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setGenderRequiredValue: React.Dispatch<React.SetStateAction<"M" | "F">>;
  setErc721Enabled: React.Dispatch<React.SetStateAction<boolean>>;
  setErc721ContractAddress: React.Dispatch<React.SetStateAction<string>>;
  setCourtyardInventoryEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setCourtyardInventoryDraft: React.Dispatch<React.SetStateAction<Extract<IdentityGateDraft, { gateType: "erc721_inventory_match" }>>>;
};

export function useCommunityGateState(
  gateDrafts: IdentityGateDraft[],
  activeMembershipMode: CommunityMembershipMode,
): CommunityGateState {
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

  const activeGateDrafts = React.useMemo<IdentityGateDraft[]>(
    () => [
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
    ],
    [
      courtyardInventoryDraft,
      courtyardInventoryEnabled,
      erc721ContractAddress,
      erc721Enabled,
      genderEnabled,
      genderRequiredValue,
      minimumAge,
      minimumAgeEnabled,
      minimumWalletScore,
      nationalityEnabled,
      nationalityRequiredValues,
      walletScoreEnabled,
    ],
  );

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

  const erc721GateValid = !erc721Enabled || isAddress(erc721ContractAddress.trim());
  const courtyardInventoryGateValid = !courtyardInventoryEnabled || isValidCourtyardInventoryDraft(courtyardInventoryDraft);
  const walletScoreGateValid = !walletScoreEnabled || (Number.isFinite(minimumWalletScore) && minimumWalletScore >= 0 && minimumWalletScore <= 100);
  const gateDraftsValid = activeMembershipMode !== "gated" || (activeGateDrafts.length > 0 && erc721GateValid && courtyardInventoryGateValid && walletScoreGateValid);

  return {
    nationalityEnabled,
    nationalityRequiredValues,
    minimumAgeEnabled,
    minimumAge,
    walletScoreEnabled,
    minimumWalletScore,
    genderEnabled,
    genderRequiredValue,
    erc721Enabled,
    erc721ContractAddress,
    courtyardInventoryEnabled,
    courtyardInventoryDraft,
    activeGateDrafts,
    erc721GateValid,
    courtyardInventoryGateValid,
    walletScoreGateValid,
    gateDraftsValid,
    setNationalityEnabled,
    setNationalityRequiredValues,
    setMinimumAgeEnabled,
    setMinimumAge,
    setWalletScoreEnabled,
    setMinimumWalletScore,
    setGenderEnabled,
    setGenderRequiredValue,
    setErc721Enabled,
    setErc721ContractAddress,
    setCourtyardInventoryEnabled,
    setCourtyardInventoryDraft,
  };
}

export function resolveSelectedCourtyardGroup(
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

export const DATABASE_REGION_OPTIONS: CommunityDatabaseRegion[] = [
  "aws-us-east-1",
  "aws-us-east-2",
  "aws-us-west-2",
  "aws-eu-west-1",
  "aws-ap-south-1",
  "aws-ap-northeast-1",
];
