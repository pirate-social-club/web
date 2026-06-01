import type { IdentityGateDraft } from "@/components/compositions/community/create-composer/create-community-composer.types";
import { isPowExclusiveGateType } from "@/components/compositions/community/create-composer/identity-gate-definitions";

export type GateMatchMode = "all" | "any";

export function normalizeGateDraftsForMatchMode(
  drafts: IdentityGateDraft[],
  gateMatchMode: GateMatchMode,
): IdentityGateDraft[] {
  if (gateMatchMode === "any") {
    return drafts;
  }
  const hasPow = drafts.some((draft) => draft.gateType === "altcha_pow");
  const hasPowExclusiveGate = drafts.some((draft) => isPowExclusiveGateType(draft.gateType));
  if (!hasPow || !hasPowExclusiveGate) {
    return drafts;
  }
  return drafts.filter((draft) => draft.gateType !== "altcha_pow");
}

export function upsertGateDraftForMatchMode(
  drafts: IdentityGateDraft[],
  nextDraft: IdentityGateDraft,
  gateMatchMode: GateMatchMode,
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
      ...drafts.filter((draft) => !isPowExclusiveGateType(draft.gateType) && draft.gateType !== "altcha_pow"),
      preserved,
    ];
  }
  const withoutConflicts = isPowExclusiveGateType(nextDraft.gateType)
    ? drafts.filter((draft) => draft.gateType !== "altcha_pow")
    : drafts;
  return [
    ...withoutConflicts.filter((draft) => draft.gateType !== nextDraft.gateType),
    preserved,
  ];
}

export function removeGateDraft(
  drafts: IdentityGateDraft[],
  gateType: IdentityGateDraft["gateType"],
): IdentityGateDraft[] {
  return drafts.filter((draft) => draft.gateType !== gateType);
}

export function shouldResetMatchModeAfterRemovingPowFallback(
  drafts: IdentityGateDraft[],
  gateMatchMode: GateMatchMode,
): boolean {
  if (gateMatchMode !== "any") {
    return false;
  }
  return removeGateDraft(drafts, "altcha_pow").length <= 1;
}
