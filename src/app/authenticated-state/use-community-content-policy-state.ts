"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type { LabelEditorDefinition } from "@/components/compositions/community/labels-editor/community-labels-editor-page";
import type { CommunityLinkEditorItem } from "@/components/compositions/community/links-editor/community-links-editor-page";
import type { RuleDraft } from "@/components/compositions/community/rules-editor/community-rules-editor-page";
import { useApi } from "@/lib/api";

import { submitCommunitySave, type SaveCommunityAction } from "@/app/authenticated-helpers/community-moderation-save";
import {
  getCommunityLinkDrafts,
} from "@/app/authenticated-helpers/moderation-helpers";

function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function getCommunityLabelDrafts(
  community: ApiCommunity | null,
): LabelEditorDefinition[] {
  return community?.label_policy?.definitions
    ?.slice()
    .sort((left, right) => left.position - right.position)
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      color: definition.color_token ?? "#f97316",
      status: definition.status,
    })) ?? [];
}

export function getLabelValidationError(
  labelsEnabled: boolean,
  labels: LabelEditorDefinition[],
): string | null {
  if (!labelsEnabled) {
    return null;
  }

  const seen = new Set<string>();
  for (const label of labels) {
    if (label.status !== "active") {
      continue;
    }

    const normalizedName = label.label.trim().toLowerCase();
    if (!normalizedName) {
      return "Each label needs a name.";
    }
    if (!isValidHexColor(label.color)) {
      return "Each label needs a valid hex color.";
    }
    if (seen.has(normalizedName)) {
      return "Label names must be unique.";
    }
    seen.add(normalizedName);
  }

  return null;
}

export function getCommunityRuleDrafts(community: ApiCommunity | null): RuleDraft[] {
  return (community?.community_profile?.rules ?? []).map((rule) => ({
    id: rule.id,
    existingRuleId: rule.id,
    title: rule.title,
    body: rule.body,
    reportReason: rule.report_reason?.trim() || rule.title,
  }));
}

export function useCommunityContentPolicyState({
  community,
  saveCommunity,
}: {
  community: ApiCommunity | null;
  saveCommunity: SaveCommunityAction;
}) {
  const api = useApi();
  const [rules, setRules] = React.useState<RuleDraft[]>([]);
  const [links, setLinks] = React.useState<CommunityLinkEditorItem[]>([]);
  const [labelsEnabled, setLabelsEnabled] = React.useState(false);
  const [labels, setLabels] = React.useState<LabelEditorDefinition[]>([]);
  const [savingRules, setSavingRules] = React.useState(false);
  const [savingLinks, setSavingLinks] = React.useState(false);
  const [savingLabels, setSavingLabels] = React.useState(false);

  React.useEffect(() => {
    setRules(getCommunityRuleDrafts(community));
  }, [community]);

  React.useEffect(() => {
    if (!community) {
      return;
    }

    setLinks(getCommunityLinkDrafts(community));
    setLabelsEnabled(community.label_policy?.label_enabled === true);
    setLabels(getCommunityLabelDrafts(community));
  }, [community]);

  const labelsValidationError = getLabelValidationError(labelsEnabled, labels);

  const handleSaveRules = React.useCallback(() => {
    if (!community) {
      return;
    }
    const rulesPayload = rules.map((draft, index) => ({
      rule_id: draft.existingRuleId ?? null,
      title: draft.title,
      body: draft.body,
      report_reason: draft.reportReason.trim() || draft.title.trim(),
      position: index,
      status: "active" as const,
    }));
    void submitCommunitySave({
      action: (currentCommunity) => api.communities.updateRules(currentCommunity.id, { rules: rulesPayload }),
      community,
      failureMessage: "Could not save rules.",
      saveCommunity,
      saving: savingRules,
      savingSetter: setSavingRules,
      successMessage: "Rules saved.",
    });
  }, [api.communities, community, rules, saveCommunity, savingRules]);

  const handleSaveLinks = React.useCallback(() => {
    void submitCommunitySave({
      action: (currentCommunity) => api.communities.updateReferenceLinks(currentCommunity.id, {
        reference_links: links.filter((link) => link.url.trim()).map((link, index) => ({
          id: link.id.startsWith("draft-") ? null : link.id,
          label: link.label.trim() || null,
          platform: link.platform as NonNullable<ApiCommunity["reference_links"]>[number]["platform"],
          position: index,
          url: link.url.trim(),
        })),
      }),
      community,
      failureMessage: "Could not save links.",
      onError: () => undefined,
      onSaved: (updatedCommunity) => {
        setLinks(getCommunityLinkDrafts(updatedCommunity));
      },
      saveCommunity,
      saving: savingLinks,
      savingSetter: setSavingLinks,
      swallowError: true,
      successMessage: "Links saved.",
    });
  }, [api.communities, community, links, saveCommunity, savingLinks]);

  const handleSaveLabels = React.useCallback(() => {
    if (labelsValidationError) return;
    void submitCommunitySave({
      action: (currentCommunity) => api.communities.updateLabelPolicy(currentCommunity.id, {
        label_enabled: labelsEnabled,
        require_label_on_top_level_posts: currentCommunity.label_policy?.require_label_on_top_level_posts === true,
        definitions: labels.map((label, index) => ({
          label_id: label.id.startsWith("draft-") ? null : label.id,
          label: label.label.trim(),
          color_token: label.color.trim() || null,
          status: label.status,
          position: index,
        })),
      }),
      community,
      failureMessage: "Could not save labels.",
      onError: () => undefined,
      onSaved: (updatedCommunity) => {
        setLabelsEnabled(updatedCommunity.label_policy?.label_enabled === true);
        setLabels(getCommunityLabelDrafts(updatedCommunity));
      },
      saveCommunity,
      saving: savingLabels,
      savingSetter: setSavingLabels,
      swallowError: true,
      successMessage: "Labels saved.",
    });
  }, [
    api.communities,
    community,
    labels,
    labelsEnabled,
    labelsValidationError,
    saveCommunity,
    savingLabels,
  ]);

  return {
    handleSaveLabels,
    handleSaveLinks,
    handleSaveRules,
    labels,
    labelsEnabled,
    labelsValidationError,
    links,
    rules,
    savingLabels,
    savingLinks,
    savingRules,
    setLabels,
    setLabelsEnabled,
    setLinks,
    setRules,
  };
}
