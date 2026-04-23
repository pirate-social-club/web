import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { parseHTML } from "linkedom";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { api } from "@/lib/api";

import type { SaveCommunityAction } from "./community-moderation-save";
import { useCommunityContentPolicyState } from "./use-community-content-policy-state";

const { document, window } = parseHTML("<!DOCTYPE html><html><body></body></html>");
(globalThis as any).document = document;
(globalThis as any).window = window;
(globalThis as any).navigator = window.navigator;

type RuleBody = {
  rules: Array<{
    rule_id: string | null;
    title: string;
    body: string;
    report_reason: string;
    position: number;
    status: "active" | "archived";
  }>;
};

type ReferenceLinksBody = {
  reference_links: Array<{
    community_reference_link_id: string | null;
    label: string | null;
    platform: string;
    position: number;
    url: string;
  }>;
};

type LabelPolicyBody = {
  label_enabled: boolean;
  require_label_on_top_level_posts: boolean;
  definitions: Array<{
    label_id: string | null;
    label: string;
    color_token: string | null;
    status: "active" | "archived";
    position: number;
  }>;
};

function createCommunity(overrides: Partial<ApiCommunity> = {}): ApiCommunity {
  return {
    community_id: "community-1",
    display_name: "Test Community",
    community_profile: {
      rules: [{
        rule_id: "rule-1",
        title: "Be civil",
        body: "No harassment.",
        report_reason: "Incivility",
        position: 0,
        status: "active",
      }],
      resource_links: [],
    },
    reference_links: [{
      community_reference_link_id: "link-1",
      label: "Site",
      metadata: { display_name: "Official site" },
      platform: "official_website",
      url: "https://example.com",
      verified: true,
    }],
    label_policy: {
      label_enabled: true,
      require_label_on_top_level_posts: true,
      definitions: [{
        label_id: "label-1",
        label: "News",
        color_token: "#f97316",
        position: 0,
        status: "active",
      }],
    },
    ...overrides,
  } as ApiCommunity;
}

function installCommunityApiMocks() {
  const calls = {
    updateLabelPolicy: [] as Array<{ communityId: string; body: LabelPolicyBody }>,
    updateReferenceLinks: [] as Array<{ communityId: string; body: ReferenceLinksBody }>,
    updateRules: [] as Array<{ communityId: string; body: RuleBody }>,
  };

  const communities = api.communities as unknown as {
    updateLabelPolicy: (communityId: string, body: LabelPolicyBody) => Promise<ApiCommunity>;
    updateReferenceLinks: (communityId: string, body: ReferenceLinksBody) => Promise<ApiCommunity>;
    updateRules: (communityId: string, body: RuleBody) => Promise<ApiCommunity>;
  };

  communities.updateRules = async (communityId, body) => {
    calls.updateRules.push({ communityId, body });
    return createCommunity({
      community_profile: {
        rules: body.rules.map((rule, index) => ({
          ...rule,
          rule_id: rule.rule_id ?? `rule-${index + 1}`,
        })),
        resource_links: [],
      },
    });
  };
  communities.updateReferenceLinks = async (communityId, body) => {
    calls.updateReferenceLinks.push({ communityId, body });
    return createCommunity({
      reference_links: body.reference_links.map((link, index) => ({
        community_reference_link_id: link.community_reference_link_id ?? `link-${index + 1}`,
        label: link.label,
        metadata: { display_name: link.label },
        platform: link.platform,
        url: link.url,
        verified: false,
      })),
    } as Partial<ApiCommunity>);
  };
  communities.updateLabelPolicy = async (communityId, body) => {
    calls.updateLabelPolicy.push({ communityId, body });
    return createCommunity({
      label_policy: {
        label_enabled: body.label_enabled,
        require_label_on_top_level_posts: body.require_label_on_top_level_posts,
        definitions: body.definitions.map((definition, index) => ({
          ...definition,
          label_id: definition.label_id ?? `label-${index + 1}`,
          color_token: definition.color_token,
        })),
      },
    } as Partial<ApiCommunity>);
  };

  return calls;
}

function createSaveCommunityMock() {
  const calls: Array<{ successMessage: string; failureMessage: string }> = [];
  const saveCommunity: SaveCommunityAction = async (
    action,
    savingSetter,
    successMessage,
    failureMessage,
  ) => {
    calls.push({ successMessage, failureMessage });
    savingSetter(true);
    try {
      return await action();
    } finally {
      savingSetter(false);
    }
  };

  return { calls, saveCommunity };
}

function renderContentHook({
  community = createCommunity(),
  saveCommunity = createSaveCommunityMock().saveCommunity,
}: {
  community?: ApiCommunity | null;
  saveCommunity?: SaveCommunityAction;
} = {}) {
  return renderHook(() => useCommunityContentPolicyState({ community, saveCommunity }));
}

describe("useCommunityContentPolicyState", () => {
  test("initializes rule, link, and label drafts from the community record", async () => {
    installCommunityApiMocks();
    const { result } = renderContentHook();

    await waitFor(() => expect(result.current.ruleName).toBe("Be civil"));

    expect(result.current.description).toBe("No harassment.");
    expect(result.current.reportReason).toBe("Incivility");
    expect(result.current.links).toHaveLength(1);
    expect(result.current.links[0]?.label).toBe("Site");
    expect(result.current.labelsEnabled).toBe(true);
    expect(result.current.labels[0]?.label).toBe("News");
  });

  test("saves rules through the injected community save boundary", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const { result } = renderContentHook({ saveCommunity: save.saveCommunity });

    await waitFor(() => expect(result.current.ruleName).toBe("Be civil"));

    act(() => {
      result.current.setRuleName("Stay on topic");
      result.current.setDescription("Posts should match the community.");
      result.current.setReportReason("");
    });
    act(() => {
      result.current.handleSaveRules();
    });

    await waitFor(() => expect(calls.updateRules).toHaveLength(1));

    expect(save.calls).toEqual([{
      successMessage: "Rules saved.",
      failureMessage: "Could not save rules.",
    }]);
    expect(calls.updateRules[0]).toEqual({
      communityId: "community-1",
      body: {
        rules: [{
          rule_id: "rule-1",
          title: "Stay on topic",
          body: "Posts should match the community.",
          report_reason: "Stay on topic",
          position: 0,
          status: "active",
        }],
      },
    });
  });

  test("saves trimmed non-empty reference links", async () => {
    const calls = installCommunityApiMocks();
    const { result } = renderContentHook();

    await waitFor(() => expect(result.current.links).toHaveLength(1));

    act(() => {
      result.current.setLinks([
        {
          id: "draft-1",
          label: " Main ",
          platform: "official_website",
          url: " https://pirate.example ",
          verified: false,
        },
        {
          id: "draft-2",
          label: "Blank",
          platform: "x",
          url: " ",
          verified: false,
        },
      ]);
    });
    act(() => {
      result.current.handleSaveLinks();
    });

    await waitFor(() => expect(calls.updateReferenceLinks).toHaveLength(1));

    expect(calls.updateReferenceLinks[0]).toEqual({
      communityId: "community-1",
      body: {
        reference_links: [{
          community_reference_link_id: null,
          label: "Main",
          platform: "official_website",
          position: 0,
          url: "https://pirate.example",
        }],
      },
    });
  });

  test("validates labels and saves normalized label definitions", async () => {
    const calls = installCommunityApiMocks();
    const { result } = renderContentHook();

    await waitFor(() => expect(result.current.labels).toHaveLength(1));

    act(() => {
      result.current.setLabels([
        { id: "draft-1", label: " Update ", color: " #00ff00 ", status: "active" },
      ]);
      result.current.setLabelsEnabled(true);
    });

    expect(result.current.labelsValidationError).toBeNull();

    act(() => {
      result.current.handleSaveLabels();
    });

    await waitFor(() => expect(calls.updateLabelPolicy).toHaveLength(1));

    expect(calls.updateLabelPolicy[0]).toEqual({
      communityId: "community-1",
      body: {
        label_enabled: true,
        require_label_on_top_level_posts: true,
        definitions: [{
          label_id: null,
          label: "Update",
          color_token: "#00ff00",
          status: "active",
          position: 0,
        }],
      },
    });
  });
});
