import type { IdentityGateDraft } from "@/components/compositions/community/create-composer/create-community-composer.types";

type HumanityRequirementGroup = {
  antiBotFallback?: Extract<IdentityGateDraft, { gateType: "altcha_pow" }>;
  kind: "humanity";
  uniqueHuman?: Extract<IdentityGateDraft, { gateType: "unique_human" }>;
};

type DocumentAttributesRequirementGroup = {
  gender?: Extract<IdentityGateDraft, { gateType: "gender" }>;
  kind: "document_attributes";
  minimumAge?: Extract<IdentityGateDraft, { gateType: "minimum_age" }>;
  nationality?: Extract<IdentityGateDraft, { gateType: "nationality" }>;
};

type TokenHoldingsRequirementGroup = {
  erc721Holding?: Extract<IdentityGateDraft, { gateType: "erc721_holding" }>;
  courtyardInventory?: Extract<IdentityGateDraft, { gateType: "erc721_inventory_match" }>;
  kind: "token_holdings";
};

type ReputationRequirementGroup = {
  kind: "reputation";
  walletScore?: Extract<IdentityGateDraft, { gateType: "wallet_score" }>;
};

type StandaloneAntiBotRequirementGroup = {
  antiBot: Extract<IdentityGateDraft, { gateType: "altcha_pow" }>;
  kind: "standalone_antibot";
};

type GateRequirementGroup =
  | HumanityRequirementGroup
  | DocumentAttributesRequirementGroup
  | TokenHoldingsRequirementGroup
  | ReputationRequirementGroup
  | StandaloneAntiBotRequirementGroup;

export type GateRequirementGroupsProjection = {
  advancedReasons: string[];
  groups: GateRequirementGroup[];
  normalAuthoringSupported: boolean;
};

export function buildGateRequirementGroupsProjection(
  drafts: readonly IdentityGateDraft[],
  gateMatchMode: "all" | "any",
): GateRequirementGroupsProjection {
  const humanity: HumanityRequirementGroup = { kind: "humanity" };
  const documentAttributes: DocumentAttributesRequirementGroup = { kind: "document_attributes" };
  const tokenHoldings: TokenHoldingsRequirementGroup = { kind: "token_holdings" };
  const reputation: ReputationRequirementGroup = { kind: "reputation" };
  const standaloneAntiBotDrafts: Array<Extract<IdentityGateDraft, { gateType: "altcha_pow" }>> = [];
  const advancedReasons: string[] = [];

  for (const draft of drafts) {
    switch (draft.gateType) {
      case "unique_human":
        humanity.uniqueHuman = draft;
        break;
      case "altcha_pow":
        if (draft.fallbackFor === "unique_human") {
          humanity.antiBotFallback = draft;
        } else {
          standaloneAntiBotDrafts.push(draft);
        }
        break;
      case "nationality":
        documentAttributes.nationality = draft;
        break;
      case "minimum_age":
        documentAttributes.minimumAge = draft;
        break;
      case "gender":
        documentAttributes.gender = draft;
        break;
      case "erc721_holding":
        tokenHoldings.erc721Holding = draft;
        break;
      case "erc721_inventory_match":
        tokenHoldings.courtyardInventory = draft;
        break;
      case "wallet_score":
        reputation.walletScore = draft;
        break;
      default:
        break;
    }
  }

  const groups: GateRequirementGroup[] = [];
  const hasHumanity = Boolean(humanity.uniqueHuman || humanity.antiBotFallback);
  if (hasHumanity) groups.push(humanity);
  if (documentAttributes.nationality || documentAttributes.minimumAge || documentAttributes.gender) {
    groups.push(documentAttributes);
  }
  if (tokenHoldings.erc721Holding || tokenHoldings.courtyardInventory) {
    groups.push(tokenHoldings);
  }
  if (reputation.walletScore) {
    groups.push(reputation);
  }

  for (const antiBot of standaloneAntiBotDrafts) {
    groups.push({ antiBot, kind: "standalone_antibot" });
  }

  if (gateMatchMode === "any" && groups.length > 1) {
    advancedReasons.push("cross_group_or");
  }

  if (humanity.antiBotFallback && !humanity.uniqueHuman) {
    advancedReasons.push("anti_bot_fallback_without_humanity");
  }

  if (standaloneAntiBotDrafts.length > 0 && drafts.length > standaloneAntiBotDrafts.length) {
    advancedReasons.push("standalone_antibot_with_other_requirements");
  }

  return {
    advancedReasons,
    groups,
    normalAuthoringSupported: advancedReasons.length === 0,
  };
}
