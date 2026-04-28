"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type { LabelEditorDefinition } from "@/components/compositions/community/labels-editor/community-labels-editor-page";
import type { CommunityLinkEditorItem } from "@/components/compositions/community/links-editor/community-links-editor-page";
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
      id: definition.label_id,
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

export function useCommunityContentPolicyState({
  community,
  saveCommunity,
}: {
  community: ApiCommunity | null;
  saveCommunity: SaveCommunityAction;
}) {
  const api = useApi();
  const [ruleName, setRuleName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [reportReason, setReportReason] = React.useState("");
  const [links, setLinks] = React.useState<CommunityLinkEditorItem[]>([]);
  const [labelsEnabled, setLabelsEnabled] = React.useState(false);
  const [labels, setLabels] = React.useState<LabelEditorDefinition[]>([]);
  const [savingRules, setSavingRules] = React.useState(false);
  const [savingLinks, setSavingLinks] = React.useState(false);
  const [savingLabels, setSavingLabels] = React.useState(false);

  React.useEffect(() => {
    const firstRule = community?.community_profile?.rules?.[0];
    setRuleName(firstRule?.title ?? "");
    setDescription(firstRule?.body ?? "");
    setReportReason(firstRule?.report_reason?.trim() || (firstRule?.title ?? ""));
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
    if (!community) return;
    const existingRules = community.community_profile?.rules ?? [];
    const rules = [
      {
        rule_id: existingRules[0]?.rule_id ?? null,
        title: ruleName,
        body: description,
        report_reason: reportReason.trim() || ruleName.trim(),
        position: 0,
        status: "active" as const,
      },
      ...existingRules.slice(1).map((rule, index) => ({
        rule_id: rule.rule_id,
        title: rule.title,
        body: rule.body,
        report_reason: rule.report_reason?.trim() || rule.title,
        position: index + 1,
        status: rule.status,
      })),
    ];
    void submitCommunitySave({
      action: (currentCommunity) => api.communities.updateRules(currentCommunity.community_id, { rules }),
      community,
      failureMessage: "Could not save rules.",
      saveCommunity,
      saving: savingRules,
      savingSetter: setSavingRules,
      successMessage: "Rules saved.",
    });
  }, [api.communities, community, description, reportReason, ruleName, saveCommunity, savingRules]);

  const handleSaveLinks = React.useCallback(() => {
    void submitCommunitySave({
      action: (currentCommunity) => api.communities.updateReferenceLinks(currentCommunity.community_id, {
        reference_links: links.filter((link) => link.url.trim()).map((link, index) => ({
          community_reference_link_id: link.id.startsWith("draft-") ? null : link.id,
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
      action: (currentCommunity) => api.communities.updateLabelPolicy(currentCommunity.community_id, {
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
    description,
    handleSaveLabels,
    handleSaveLinks,
    handleSaveRules,
    labels,
    labelsEnabled,
    labelsValidationError,
    links,
    reportReason,
    ruleName,
    savingLabels,
    savingLinks,
    savingRules,
    setDescription,
    setLabels,
    setLabelsEnabled,
    setLinks,
    setReportReason,
    setRuleName,
  };
}
