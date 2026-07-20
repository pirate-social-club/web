"use client";

import * as React from "react";
import type {
  CommunityHandle,
  CommunityHandlePolicy,
  UpdateCommunityHandlePolicyRequest,
} from "@pirate/api-contracts";

import {
  gateTreeDraftMatchesPolicy,
  isGateBuilderDraftSavable,
  parseGatePolicyToTreeDraft,
  serializeGateBuilderTreeDraft,
  type GateBuilderGroupDraft,
} from "@/app/authenticated-helpers/community-gate-tree-draft";

import { useApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { ApiCommunityNamespaceAttachment } from "@/lib/api/client-api-types";
import { toast } from "@/components/primitives/sonner";
import { getErrorMessage } from "@/lib/error-utils";

export type HandlePricingMode = "flat" | "premium_short";
export type HandleStatusFilter = "all" | CommunityHandle["status"];

export type HandleLabelClaimRuleDraft = {
  id?: string;
  key: string;
  selectorType: "exact" | "any";
  labelsText: string;
  gateTreeDraft: GateBuilderGroupDraft;
};

export const MAX_LABEL_CLAIM_RULES = 20;

export type HandlePolicyDraft = {
  claimsEnabled: boolean;
  claimGateMode: "none" | "inherit_community" | "explicit";
  claimGateTreeDraft: GateBuilderGroupDraft;
  labelClaimRules: HandleLabelClaimRuleDraft[];
  pricingMode: HandlePricingMode;
  standardPriceCents: number | null;
  premiumPriceCents: number | null;
  premiumMaxLength: number | null;
  minLength: number | null;
  maxLength: number | null;
  reservedLabels: string;
  specialPrices: string;
};

const DEFAULT_STANDARD_PRICE_CENTS = 500;
const DEFAULT_PREMIUM_PRICE_CENTS = 2500;
const DEFAULT_PREMIUM_MAX_LENGTH = 4;
const DEFAULT_MIN_LENGTH = 3;
const DEFAULT_MAX_LENGTH = 32;
const DEFAULT_SPECIAL_PRICE_CENTS_BY_LABEL: Record<string, number> = {
  crown: 100000,
  "xn--2p8h": 100000,
  prince: 50000,
  "xn--tq9h": 50000,
  princess: 50000,
  "xn--6q8h": 50000,
  diamond: 75000,
  "xn--tr8h": 75000,
  ring: 50000,
  "xn--sr8h": 50000,
  "xn--cs8h": 50000,
  "xn--cz8h": 25000,
};
const SPECIAL_LABEL_DISPLAY: Record<string, string> = {
  "xn--2p8h": "👑",
  "xn--tq9h": "🤴",
  "xn--6q8h": "👸",
  "xn--sr8h": "💍",
  "xn--tr8h": "💎",
  "xn--cs8h": "💠",
  "xn--cz8h": "🖕",
};

function labelToDisplay(label: string): string {
  return SPECIAL_LABEL_DISPLAY[label] ?? label;
}

function labelToAscii(label: string): string | null {
  const trimmed = label.trim().toLowerCase();
  if (!trimmed) return null;
  if (/^[a-z0-9-]+$/u.test(trimmed)) return trimmed;
  try {
    return new URL(`https://${trimmed}.invalid`).hostname.split(".")[0]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function formatSpecialPrices(value: Record<string, number> | null | undefined): string {
  return Object.entries(value ?? DEFAULT_SPECIAL_PRICE_CENTS_BY_LABEL)
    .map(([label, cents]) => `${labelToDisplay(label)}: ${(cents / 100).toFixed(2)}`)
    .join("\n");
}

export function parseSpecialPricesText(value: string): Record<string, number> {
  const entries = value
    .split(/\n+/)
    .reduce<Array<readonly [string, number]>>((result, rawLine) => {
      const line = rawLine.trim();
      if (!line) return result;
      const match = line.match(/^([^:,]+)\s*[:,]\s*\$?([0-9]+(?:\.[0-9]{1,2})?)$/u);
      if (!match) return result;
      const label = labelToAscii(match[1] ?? "");
      const dollars = Number(match[2]);
      if (!label || !Number.isFinite(dollars) || dollars < 0) return result;
      result.push([label, Math.round(dollars * 100)] as const);
      return result;
    }, []);
  return Object.fromEntries(entries);
}

function pricingModeFromApi(policy: CommunityHandlePolicy | null): HandlePricingMode {
  if (!policy) return "premium_short";
  if (policy.pricing_model === "free") return "flat";
  if (policy.policy_template === "premium") return "premium_short";
  return "flat";
}

export function parseLabelClaimRuleLabels(labelsText: string): string[] {
  return Array.from(new Set(
    labelsText
      .split(/[\n,\s]+/)
      .map((label) => label.trim().toLowerCase().replace(/^@/, ""))
      .filter((label) => label.length > 0),
  ));
}

function isValidLabelClaimRuleLabel(label: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(label);
}

export function isLabelClaimRuleDraftSavable(rule: HandleLabelClaimRuleDraft): boolean {
  if (!isGateBuilderDraftSavable(rule.gateTreeDraft)) return false;
  if (rule.selectorType === "any") return true;
  const labels = parseLabelClaimRuleLabels(rule.labelsText);
  return labels.length > 0 && labels.length <= 100 && labels.every(isValidLabelClaimRuleLabel);
}

function buildLabelClaimRuleDrafts(policy: CommunityHandlePolicy | null): HandleLabelClaimRuleDraft[] {
  return (policy?.label_claim_rules ?? []).map((rule) => ({
    id: rule.id,
    key: rule.id,
    selectorType: rule.selector.type,
    labelsText: (rule.selector.labels ?? []).join(", "),
    gateTreeDraft: parseGatePolicyToTreeDraft(rule.claim_gate_expression),
  }));
}

export function buildHandlePolicyDraft(policy: CommunityHandlePolicy | null): HandlePolicyDraft {
  const settings = policy?.settings ?? {};
  return {
    claimsEnabled: policy?.claims_enabled ?? true,
    claimGateMode: policy?.claim_gate_mode ?? "none",
    claimGateTreeDraft: parseGatePolicyToTreeDraft(policy?.claim_gate_expression),
    labelClaimRules: buildLabelClaimRuleDrafts(policy),
    pricingMode: pricingModeFromApi(policy),
    standardPriceCents: settings.flat_price_cents ?? DEFAULT_STANDARD_PRICE_CENTS,
    premiumPriceCents: settings.premium_price_cents ?? DEFAULT_PREMIUM_PRICE_CENTS,
    premiumMaxLength: settings.premium_max_length ?? DEFAULT_PREMIUM_MAX_LENGTH,
    minLength: settings.min_length ?? DEFAULT_MIN_LENGTH,
    maxLength: settings.max_length ?? DEFAULT_MAX_LENGTH,
    reservedLabels: (settings.reserved_labels ?? []).join(", "),
    specialPrices: formatSpecialPrices(settings.special_price_cents_by_label),
  };
}

export function buildHandlePolicySavePayload(draft: HandlePolicyDraft): UpdateCommunityHandlePolicyRequest {
  const pricingMode = draft.pricingMode;
  const policyTemplate = pricingMode === "premium_short" ? "premium" : "standard";
  const pricingModel = "flat_by_length";

  const settings: NonNullable<UpdateCommunityHandlePolicyRequest["settings"]> = {};
  if (draft.standardPriceCents != null) {
    settings.flat_price_cents = draft.standardPriceCents;
  }
  if (pricingMode === "premium_short") {
    if (draft.premiumPriceCents != null) {
      settings.premium_price_cents = draft.premiumPriceCents;
    }
    if (draft.premiumMaxLength != null) {
      settings.premium_max_length = draft.premiumMaxLength;
    }
  }
  if (draft.minLength != null) {
    settings.min_length = draft.minLength;
  }
  if (draft.maxLength != null) {
    settings.max_length = draft.maxLength;
  }
  const reservedLabels = draft.reservedLabels
    .split(/[\n,]+/)
    .reduce<string[]>((result, label) => {
      const normalizedLabel = label.trim().toLowerCase();
      if (normalizedLabel.length > 0) {
        result.push(normalizedLabel);
      }
      return result;
    }, []);
  if (reservedLabels.length > 0) {
    settings.reserved_labels = Array.from(new Set(reservedLabels));
  }
  const specialPrices = parseSpecialPricesText(draft.specialPrices);
  if (Object.keys(specialPrices).length > 0) {
    settings.special_price_cents_by_label = specialPrices;
  }
  return {
    policy_template: policyTemplate,
    pricing_model: pricingModel,
    claims_enabled: draft.claimsEnabled,
    claim_gate_mode: draft.claimGateMode,
    claim_gate_expression: draft.claimGateMode === "explicit"
      ? serializeGateBuilderTreeDraft(draft.claimGateTreeDraft)
      : null,
    eligibility_timing: "claim_time",
    label_claim_rules: draft.labelClaimRules.flatMap((rule) => {
      // The save guard blocks unsavable rules; an unserializable draft here means
      // the guard was bypassed, and dropping the rule would silently weaken the
      // policy, so keep the entry out only when there is genuinely no expression.
      const expression = serializeGateBuilderTreeDraft(rule.gateTreeDraft);
      if (!expression) return [];
      return [{
        ...(rule.id ? { id: rule.id } : {}),
        selector: rule.selectorType === "any"
          ? { type: "any" as const, labels: null }
          : { type: "exact" as const, labels: parseLabelClaimRuleLabels(rule.labelsText) },
        claim_gate_expression: expression,
      }];
    }),
    settings,
  };
}

function currentPolicyFromConflict(error: unknown): CommunityHandlePolicy | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const currentPolicy = error.details?.current_policy;
  if (!currentPolicy || typeof currentPolicy !== "object") return null;
  const revision = (currentPolicy as { revision?: unknown }).revision;
  return typeof revision === "number" && Number.isSafeInteger(revision) && revision >= 1
    ? currentPolicy as CommunityHandlePolicy
    : null;
}

export function formatHandleNamespaceSuffix(namespace: ApiCommunityNamespaceAttachment): string {
  return namespace.family === "spaces" ? `@${namespace.root_label}` : `.${namespace.root_label}`;
}

const DISCARD_NAMESPACE_DRAFT_MESSAGE =
  "You have unsaved changes for this namespace. Discard them and switch?";

export function useCommunityHandlePolicyState({
  communityId,
  enabled = true,
  namespaces,
}: {
  communityId: string | null;
  enabled?: boolean;
  namespaces?: ApiCommunityNamespaceAttachment[];
}) {
  const api = useApi();

  const [policy, setPolicy] = React.useState<CommunityHandlePolicy | null>(null);
  const [policyLoading, setPolicyLoading] = React.useState(false);
  const [policyError, setPolicyError] = React.useState<unknown>(null);
  const [draft, setDraft] = React.useState<HandlePolicyDraft>(() => buildHandlePolicyDraft(null));
  const [saving, setSaving] = React.useState(false);
  const [policyConflict, setPolicyConflict] = React.useState<CommunityHandlePolicy | null>(null);
  const [handles, setHandles] = React.useState<CommunityHandle[]>([]);
  const [handlesLoading, setHandlesLoading] = React.useState(false);
  const [handleOpsLoading, setHandleOpsLoading] = React.useState(false);
  const [handleStatusFilter, setHandleStatusFilter] = React.useState<HandleStatusFilter>("all");

  const verifiedNamespaces = React.useMemo(
    () => (namespaces ?? []).filter((namespace) => namespace.verification_status === "verified"),
    [namespaces],
  );
  const [selectedHandleNamespaceVerification, setSelectedHandleNamespaceVerification] =
    React.useState<string | null>(null);

  React.useEffect(() => {
    setSelectedHandleNamespaceVerification((current) => {
      if (current && verifiedNamespaces.some((namespace) => namespace.namespace_verification === current)) {
        return current;
      }
      const primary = verifiedNamespaces.find((namespace) => namespace.namespace_role === "primary");
      return primary?.namespace_verification
        ?? verifiedNamespaces[0]?.namespace_verification
        ?? null;
    });
  }, [verifiedNamespaces]);

  const selectedHandleNamespace = React.useMemo(
    () => verifiedNamespaces.find(
      (namespace) => namespace.namespace_verification === selectedHandleNamespaceVerification,
    ) ?? null,
    [selectedHandleNamespaceVerification, verifiedNamespaces],
  );

  const selectedNamespaceRef = React.useRef(selectedHandleNamespaceVerification);
  selectedNamespaceRef.current = selectedHandleNamespaceVerification;

  const handlesRequestRef = React.useRef(0);
  const loadHandles = React.useCallback(() => {
    const requestId = ++handlesRequestRef.current;
    if (!communityId || !enabled) {
      setHandles([]);
      setHandlesLoading(false);
      return;
    }
    setHandlesLoading(true);
    void api.communities
      .listHandles(communityId, {
        status: handleStatusFilter === "all" ? null : handleStatusFilter,
        namespaceVerification: selectedHandleNamespaceVerification,
      })
      .then((result) => {
        if (handlesRequestRef.current === requestId) setHandles(result.handles);
      })
      .catch((nextError: unknown) => {
        if (handlesRequestRef.current !== requestId) return;
        toast.error(getErrorMessage(nextError, "Could not load community names."));
      })
      .finally(() => {
        if (handlesRequestRef.current === requestId) setHandlesLoading(false);
      });
  }, [api.communities, communityId, enabled, handleStatusFilter, selectedHandleNamespaceVerification]);

  React.useEffect(() => {
    if (!communityId || !enabled) {
      setPolicy(null);
      setPolicyError(null);
      setPolicyLoading(false);
      setDraft(buildHandlePolicyDraft(null));
      setPolicyConflict(null);
      setHandles([]);
      setHandleStatusFilter("all");
      return;
    }

    let cancelled = false;
    setPolicyLoading(true);
    setPolicyError(null);

    void api.communities
      .getHandlePolicy(communityId, { namespaceVerification: selectedHandleNamespaceVerification })
      .then((result) => {
        if (!cancelled) {
          setPolicy(result);
          setDraft(buildHandlePolicyDraft(result));
          setPolicyConflict(null);
        }
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setPolicyError(nextError);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPolicyLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api.communities, communityId, enabled, selectedHandleNamespaceVerification]);

  React.useEffect(() => {
    loadHandles();
  }, [loadHandles]);

  const hasChanges = React.useMemo(() => {
    const savedRules = policy?.label_claim_rules ?? [];
    const labelClaimRulesChanged =
      savedRules.length !== draft.labelClaimRules.length ||
      draft.labelClaimRules.some((rule, index) => {
        const savedRule = savedRules[index];
        if (!savedRule) return true;
        return (
          savedRule.selector.type !== rule.selectorType ||
          (savedRule.selector.labels ?? []).join(",") !== parseLabelClaimRuleLabels(rule.labelsText).join(",") ||
          !gateTreeDraftMatchesPolicy(savedRule.claim_gate_expression, rule.gateTreeDraft)
        );
      });
    const saved = buildHandlePolicyDraft(policy);
    return (
      saved.claimsEnabled !== draft.claimsEnabled ||
      saved.claimGateMode !== draft.claimGateMode ||
      labelClaimRulesChanged ||
      !gateTreeDraftMatchesPolicy(
        policy?.claim_gate_expression,
        draft.claimGateTreeDraft,
      ) ||
      saved.pricingMode !== draft.pricingMode ||
      saved.standardPriceCents !== draft.standardPriceCents ||
      saved.premiumPriceCents !== draft.premiumPriceCents ||
      saved.premiumMaxLength !== draft.premiumMaxLength ||
      saved.minLength !== draft.minLength ||
      saved.maxLength !== draft.maxLength ||
      saved.reservedLabels.trim() !== draft.reservedLabels.trim() ||
      saved.specialPrices.trim() !== draft.specialPrices.trim()
    );
  }, [policy, draft]);

  const saveDraft = React.useCallback((expectedRevision: number) => {
    if (
      !communityId
      || saving
      || !hasChanges
      || (draft.claimGateMode === "explicit" && !isGateBuilderDraftSavable(draft.claimGateTreeDraft))
      || !draft.labelClaimRules.every(isLabelClaimRuleDraftSavable)
    ) return;
    const savedNamespaceVerification = selectedHandleNamespaceVerification;
    setSaving(true);
    setPolicyConflict(null);
    void api.communities
      .updateHandlePolicy(
        communityId,
        { ...buildHandlePolicySavePayload(draft), expected_revision: expectedRevision },
        { namespaceVerification: savedNamespaceVerification },
      )
      .then((updatedPolicy) => {
        if (selectedNamespaceRef.current !== savedNamespaceVerification) return;
        setPolicy(updatedPolicy);
        setDraft(buildHandlePolicyDraft(updatedPolicy));
        toast.success("Names policy saved.");
      })
      .catch((nextError: unknown) => {
        if (selectedNamespaceRef.current !== savedNamespaceVerification) return;
        const currentPolicy = currentPolicyFromConflict(nextError);
        if (currentPolicy) {
          setPolicyConflict(currentPolicy);
          return;
        }
        toast.error(getErrorMessage(nextError, "Could not save names policy."));
      })
      .finally(() => {
        setSaving(false);
      });
  }, [api.communities, communityId, draft, hasChanges, saving, selectedHandleNamespaceVerification]);

  const handleSave = React.useCallback(() => {
    if (policy) saveDraft(policy.revision);
  }, [policy, saveDraft]);

  const handleLoadLatestPolicy = React.useCallback(() => {
    if (!policyConflict) return;
    setPolicy(policyConflict);
    setDraft(buildHandlePolicyDraft(policyConflict));
    setPolicyConflict(null);
  }, [policyConflict]);

  const handleOverwritePolicyConflict = React.useCallback(() => {
    if (policyConflict) saveDraft(policyConflict.revision);
  }, [policyConflict, saveDraft]);

  const handleReserve = React.useCallback(async (desiredLabel: string) => {
    if (!communityId || handleOpsLoading) return;
    const label = desiredLabel.trim();
    if (!label) return;
    setHandleOpsLoading(true);
    try {
      await api.communities.reserveHandle(
        communityId,
        { desired_label: label },
        { namespaceVerification: selectedHandleNamespaceVerification },
      );
      toast.success("Name reserved.");
      loadHandles();
    } catch (nextError) {
      toast.error(getErrorMessage(nextError, "Could not reserve this name."));
    } finally {
      setHandleOpsLoading(false);
    }
  }, [api.communities, communityId, handleOpsLoading, loadHandles, selectedHandleNamespaceVerification]);

  const handleRevoke = React.useCallback(async (handleId: string) => {
    if (!communityId || handleOpsLoading) return;
    setHandleOpsLoading(true);
    try {
      await api.communities.revokeHandle(communityId, handleId, { reason: "admin action" });
      toast.success("Name revoked.");
      loadHandles();
    } catch (nextError) {
      toast.error(getErrorMessage(nextError, "Could not revoke this name."));
    } finally {
      setHandleOpsLoading(false);
    }
  }, [api.communities, communityId, handleOpsLoading, loadHandles]);

  const selectHandleNamespace = React.useCallback((next: string | null) => {
    if (next === selectedNamespaceRef.current) return;
    if (saving) return;
    if (
      next !== null
      && !verifiedNamespaces.some((namespace) => namespace.namespace_verification === next)
    ) return;
    if (hasChanges && !globalThis.confirm(DISCARD_NAMESPACE_DRAFT_MESSAGE)) return;
    setSelectedHandleNamespaceVerification(next);
  }, [hasChanges, saving, verifiedNamespaces]);

  const handlePolicyEditorProps = React.useMemo(() => ({
    namespaceOptions: verifiedNamespaces.map((namespace) => ({
      value: namespace.namespace_verification,
      label: `${formatHandleNamespaceSuffix(namespace)} names${namespace.namespace_role === "primary" ? " (primary)" : ""}`,
    })),
    namespaceSuffix: selectedHandleNamespace
      ? formatHandleNamespaceSuffix(selectedHandleNamespace)
      : null,
    onSelectNamespace: selectHandleNamespace,
    onLoadLatestPolicy: handleLoadLatestPolicy,
    onOverwritePolicyConflict: handleOverwritePolicyConflict,
    policyConflict: Boolean(policyConflict),
    selectedNamespaceVerification: selectedHandleNamespaceVerification,
  }), [
    handleLoadLatestPolicy,
    handleOverwritePolicyConflict,
    policyConflict,
    selectHandleNamespace,
    selectedHandleNamespace,
    selectedHandleNamespaceVerification,
    verifiedNamespaces,
  ]);

  return {
    draft,
    handlePolicyEditorProps,
    handleNamespaces: verifiedNamespaces,
    handleOpsLoading,
    handleLoadLatestPolicy,
    handleOverwritePolicyConflict,
    handleReserve,
    handleRevoke,
    handleSave,
    handleStatusFilter,
    handles,
    handlesLoading,
    hasChanges,
    policy,
    policyConflict,
    policyError,
    policyLoading,
    saving,
    selectHandleNamespace,
    selectedHandleNamespace,
    selectedHandleNamespaceVerification,
    setDraft,
    setHandleStatusFilter,
  };
}
