"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import type { LabelEditorDefinition } from "@/components/compositions/community-labels-editor/community-labels-editor-page";
import type { CommunityLinkEditorItem } from "@/components/compositions/community-links-editor/community-links-editor-page";
import { useApi } from "@/lib/api";

import type { SaveCommunityAction } from "./community-moderation-save";
import {
  getCommunityLinkDrafts,
} from "./moderation-helpers";

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
  const [requireOnTopLevelPosts, setRequireOnTopLevelPosts] = React.useState(false);
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
    setRequireOnTopLevelPosts(community.label_policy?.require_label_on_top_level_posts === true);
    setLabels(getCommunityLabelDrafts(community));
  }, [community]);

  const labelsValidationError = getLabelValidationError(labelsEnabled, labels);

  const handleSaveRules = React.useCallback(() => {
    if (!community || savingRules) return;
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
    void saveCommunity(
      () => api.communities.updateRules(community.community_id, { rules }),
      setSavingRules,
      "Rules saved.",
      "Could not save rules.",
    );
  }, [api.communities, community, description, reportReason, ruleName, saveCommunity, savingRules]);

  const handleSaveLinks = React.useCallback(() => {
    if (!community || savingLinks) return;
    void saveCommunity(
      () => api.communities.updateReferenceLinks(community.community_id, {
        reference_links: links.filter((link) => link.url.trim()).map((link, index) => ({
          community_reference_link_id: link.id.startsWith("draft-") ? null : link.id,
          label: link.label.trim() || null,
          platform: link.platform as NonNullable<ApiCommunity["reference_links"]>[number]["platform"],
          position: index,
          url: link.url.trim(),
        })),
      }),
      setSavingLinks,
      "Links saved.",
      "Could not save links.",
    ).then((updatedCommunity) => {
      setLinks(getCommunityLinkDrafts(updatedCommunity));
    }).catch(() => undefined);
  }, [api.communities, community, links, saveCommunity, savingLinks]);

  const handleSaveLabels = React.useCallback(() => {
    if (!community || savingLabels || labelsValidationError) return;
    void saveCommunity(
      () => api.communities.updateLabelPolicy(community.community_id, {
        label_enabled: labelsEnabled,
        require_label_on_top_level_posts: labelsEnabled && requireOnTopLevelPosts,
        definitions: labels.map((label, index) => ({
          label_id: label.id.startsWith("draft-") ? null : label.id,
          label: label.label.trim(),
          color_token: label.color.trim() || null,
          status: label.status,
          position: index,
        })),
      }),
      setSavingLabels,
      "Labels saved.",
      "Could not save labels.",
    ).then((updatedCommunity) => {
      setLabelsEnabled(updatedCommunity.label_policy?.label_enabled === true);
      setRequireOnTopLevelPosts(updatedCommunity.label_policy?.require_label_on_top_level_posts === true);
      setLabels(getCommunityLabelDrafts(updatedCommunity));
    }).catch(() => undefined);
  }, [
    api.communities,
    community,
    labels,
    labelsEnabled,
    labelsValidationError,
    requireOnTopLevelPosts,
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
    requireOnTopLevelPosts,
    ruleName,
    savingLabels,
    savingLinks,
    savingRules,
    setDescription,
    setLabels,
    setLabelsEnabled,
    setLinks,
    setReportReason,
    setRequireOnTopLevelPosts,
    setRuleName,
  };
}
