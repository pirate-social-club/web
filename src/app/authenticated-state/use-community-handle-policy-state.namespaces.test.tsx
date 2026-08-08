import { afterEach, describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { installDomGlobals } from "@/test/setup-dom";
import type { CommunityHandle, CommunityHandlePolicy, UpdateCommunityHandlePolicyRequest } from "@pirate/api-contracts";

import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { ApiCommunityNamespaceAttachment } from "@/lib/api/client-api-types";

import {
  formatHandleNamespaceSuffix,
  useCommunityHandlePolicyState,
} from "./use-community-handle-policy-state";

installDomGlobals();

const originalConfirm = globalThis.confirm;

afterEach(() => {
  globalThis.confirm = originalConfirm;
});

const primaryNamespace: ApiCommunityNamespaceAttachment = {
  namespace_verification: "nv_primary",
  namespace_role: "primary",
  family: "hns",
  root_label: "pokemon",
  route_slug: "pokemon",
  verification_status: "verified",
  delegation: {
    pirate_web_routing_allowed: true,
    pirate_subdomain_issuance_allowed: true,
    delegation_security: "secure",
    observation_fresh: true,
    routing_withheld_reason: null,
    signature_expiry_warning: false,
  },
};

const mirrorNamespace: ApiCommunityNamespaceAttachment = {
  namespace_verification: "nv_mirror",
  namespace_role: "mirror",
  family: "spaces",
  root_label: "collectors",
  route_slug: "pokemon",
  verification_status: "verified",
};

const staleNamespace: ApiCommunityNamespaceAttachment = {
  namespace_verification: "nv_stale",
  namespace_role: "mirror",
  family: "hns",
  root_label: "charizard",
  route_slug: "pokemon",
  verification_status: "stale",
};

function policyFor(namespaceVerification: string | null): CommunityHandlePolicy {
  return {
    revision: namespaceVerification === "nv_mirror" ? 7 : 3,
    claims_enabled: namespaceVerification !== "nv_mirror",
    claim_gate_mode: "none",
    claim_gate_expression_ref: null,
    claim_gate_expression: null,
    eligibility_timing: "claim_time",
    policy_template: "standard",
    pricing_model: "flat_by_length",
    label_claim_rules: [],
    settings: {},
  } as unknown as CommunityHandlePolicy;
}

type Selector = { namespaceVerification?: string | null } | undefined;

function installHandleApiMocks({
  policyResolver,
  updateResolver,
}: {
  policyResolver?: (namespaceVerification: string | null) => Promise<CommunityHandlePolicy>;
  updateResolver?: (
    body: UpdateCommunityHandlePolicyRequest,
    namespaceVerification: string | null,
  ) => Promise<CommunityHandlePolicy>;
} = {}) {
  const calls = {
    getPolicy: [] as Array<string | null>,
    list: [] as Array<string | null>,
    reserve: [] as Array<{ label: string; namespaceVerification: string | null }>,
    update: [] as Array<{ body: UpdateCommunityHandlePolicyRequest; namespaceVerification: string | null }>,
  };

  const communities = api.communities as unknown as {
    getHandlePolicy: (communityId: string, selector?: Selector) => Promise<CommunityHandlePolicy>;
    listHandles: (
      communityId: string,
      params?: { status?: CommunityHandle["status"] | null; namespaceVerification?: string | null },
    ) => Promise<{ handles: CommunityHandle[] }>;
    reserveHandle: (
      communityId: string,
      body: { desired_label: string },
      selector?: Selector,
    ) => Promise<CommunityHandle>;
    updateHandlePolicy: (
      communityId: string,
      body: UpdateCommunityHandlePolicyRequest,
      selector?: Selector,
    ) => Promise<CommunityHandlePolicy>;
  };

  communities.getHandlePolicy = (_communityId, selector) => {
    const namespaceVerification = selector?.namespaceVerification ?? null;
    calls.getPolicy.push(namespaceVerification);
    return policyResolver
      ? policyResolver(namespaceVerification)
      : Promise.resolve(policyFor(namespaceVerification));
  };
  communities.listHandles = (_communityId, params) => {
    calls.list.push(params?.namespaceVerification ?? null);
    return Promise.resolve({ handles: [] });
  };
  communities.reserveHandle = (_communityId, body, selector) => {
    calls.reserve.push({
      label: body.desired_label,
      namespaceVerification: selector?.namespaceVerification ?? null,
    });
    return Promise.resolve({ id: "hdl_1" } as CommunityHandle);
  };
  communities.updateHandlePolicy = (_communityId, body, selector) => {
    const namespaceVerification = selector?.namespaceVerification ?? null;
    calls.update.push({ body, namespaceVerification });
    return updateResolver
      ? updateResolver(body, namespaceVerification)
      : Promise.resolve(policyFor(namespaceVerification));
  };

  return calls;
}

function renderPolicyHook(namespaces: ApiCommunityNamespaceAttachment[] | undefined) {
  return renderHook(() => useCommunityHandlePolicyState({
    communityId: "community-1",
    enabled: true,
    namespaces,
  }));
}

describe("useCommunityHandlePolicyState namespace scoping", () => {
  test("defaults to the verified primary and scopes policy and handle loads to it", async () => {
    const calls = installHandleApiMocks();
    const { result } = renderPolicyHook([staleNamespace, mirrorNamespace, primaryNamespace]);

    await waitFor(() => expect(result.current.selectedHandleNamespaceVerification).toBe("nv_primary"));
    await waitFor(() => expect(result.current.policyLoading).toBe(false));

    expect(calls.getPolicy.at(-1)).toBe("nv_primary");
    await waitFor(() => expect(calls.list.at(-1)).toBe("nv_primary"));
    expect(result.current.handleNamespaces.map((ns) => ns.namespace_verification))
      .toEqual(["nv_mirror", "nv_primary"]);
    expect(result.current.selectedHandleNamespace?.root_label).toBe("pokemon");
  });

  test("switching to a mirror reloads its policy and scopes save and reserve", async () => {
    const calls = installHandleApiMocks();
    const { result } = renderPolicyHook([primaryNamespace, mirrorNamespace]);

    await waitFor(() => expect(result.current.selectedHandleNamespaceVerification).toBe("nv_primary"));
    await waitFor(() => expect(result.current.policyLoading).toBe(false));

    act(() => {
      result.current.selectHandleNamespace("nv_mirror");
    });

    await waitFor(() => expect(result.current.policyLoading).toBe(false));
    expect(result.current.selectedHandleNamespaceVerification).toBe("nv_mirror");
    expect(calls.getPolicy.at(-1)).toBe("nv_mirror");
    // Mirror policy has claims disabled; the draft must reflect the mirror, not the primary.
    await waitFor(() => expect(result.current.draft.claimsEnabled).toBe(false));

    act(() => {
      result.current.setDraft({ ...result.current.draft, claimsEnabled: true });
    });
    await waitFor(() => expect(result.current.hasChanges).toBe(true));
    act(() => {
      result.current.handleSave();
    });
    await waitFor(() => expect(calls.update).toHaveLength(1));
    expect(calls.update[0]?.namespaceVerification).toBe("nv_mirror");
    expect(calls.update[0]?.body.expected_revision).toBe(7);
    await waitFor(() => expect(result.current.saving).toBe(false));

    await act(async () => {
      await result.current.handleReserve("crown");
    });
    expect(calls.reserve).toEqual([{ label: "crown", namespaceVerification: "nv_mirror" }]);
    await waitFor(() => expect(calls.list.at(-1)).toBe("nv_mirror"));
  });

  test("a dirty draft blocks switching unless the moderator confirms discarding", async () => {
    installHandleApiMocks();
    const { result } = renderPolicyHook([primaryNamespace, mirrorNamespace]);

    await waitFor(() => expect(result.current.selectedHandleNamespaceVerification).toBe("nv_primary"));
    await waitFor(() => expect(result.current.policyLoading).toBe(false));

    act(() => {
      result.current.setDraft({ ...result.current.draft, claimsEnabled: false });
    });
    await waitFor(() => expect(result.current.hasChanges).toBe(true));

    globalThis.confirm = () => false;
    act(() => {
      result.current.selectHandleNamespace("nv_mirror");
    });
    expect(result.current.selectedHandleNamespaceVerification).toBe("nv_primary");
    expect(result.current.draft.claimsEnabled).toBe(false);

    globalThis.confirm = () => true;
    act(() => {
      result.current.selectHandleNamespace("nv_mirror");
    });
    await waitFor(() => expect(result.current.selectedHandleNamespaceVerification).toBe("nv_mirror"));
    await waitFor(() => expect(result.current.policyLoading).toBe(false));
    await waitFor(() => expect(result.current.hasChanges).toBe(false));
  });

  test("rejects switching to an unattached or unverified namespace", async () => {
    installHandleApiMocks();
    const { result } = renderPolicyHook([primaryNamespace, staleNamespace]);

    await waitFor(() => expect(result.current.selectedHandleNamespaceVerification).toBe("nv_primary"));

    act(() => {
      result.current.selectHandleNamespace("nv_stale");
    });
    act(() => {
      result.current.selectHandleNamespace("nv_other");
    });
    expect(result.current.selectedHandleNamespaceVerification).toBe("nv_primary");
  });

  test("sends no namespace selector when attachments are unavailable", async () => {
    const calls = installHandleApiMocks();
    const { result } = renderPolicyHook(undefined);

    await waitFor(() => expect(result.current.policyLoading).toBe(false));
    expect(result.current.selectedHandleNamespaceVerification).toBeNull();
    expect(calls.getPolicy).toEqual([null]);
    await waitFor(() => expect(calls.list).toEqual([null]));
  });

  test("ignores a stale policy response that resolves after switching namespaces", async () => {
    let resolvePrimary: ((policy: CommunityHandlePolicy) => void) | null = null;
    installHandleApiMocks({
      policyResolver: (namespaceVerification) => {
        if (namespaceVerification === "nv_primary") {
          return new Promise((resolve) => { resolvePrimary = resolve; });
        }
        return Promise.resolve(policyFor(namespaceVerification));
      },
    });
    const { result } = renderPolicyHook([primaryNamespace, mirrorNamespace]);

    await waitFor(() => expect(result.current.selectedHandleNamespaceVerification).toBe("nv_primary"));

    act(() => {
      result.current.selectHandleNamespace("nv_mirror");
    });
    await waitFor(() => expect(result.current.policyLoading).toBe(false));
    await waitFor(() => expect(result.current.draft.claimsEnabled).toBe(false));

    // The primary's slow response arrives after the mirror is selected; it must not clobber the draft.
    await act(async () => {
      resolvePrimary?.({ ...policyFor("nv_primary"), claims_enabled: true } as CommunityHandlePolicy);
      await Promise.resolve();
    });
    expect(result.current.draft.claimsEnabled).toBe(false);
    expect(result.current.policy?.claims_enabled).toBe(false);
  });

  test("preserves a stale draft and supports load-latest or explicit overwrite", async () => {
    const currentPolicy = {
      ...policyFor("nv_primary"),
      claims_enabled: true,
      revision: 4,
    } as CommunityHandlePolicy;
    const latestPolicy = { ...currentPolicy, claims_enabled: false, revision: 6 } as CommunityHandlePolicy;
    let attempts = 0;
    const calls = installHandleApiMocks({
      updateResolver: (body) => {
        attempts += 1;
        if (attempts === 1) {
          return Promise.reject(new ApiError(
            "conflict",
            "Community handle policy has changed",
            409,
            false,
            { current_policy: currentPolicy },
          ));
        }
        if (attempts === 3) {
          return Promise.reject(new ApiError(
            "conflict",
            "Community handle policy has changed",
            409,
            false,
            { current_policy: latestPolicy },
          ));
        }
        return Promise.resolve({
          ...currentPolicy,
          claims_enabled: body.claims_enabled ?? currentPolicy.claims_enabled,
          revision: 5,
        } as CommunityHandlePolicy);
      },
    });
    const { result } = renderPolicyHook([primaryNamespace]);

    await waitFor(() => expect(result.current.policyLoading).toBe(false));
    act(() => {
      result.current.setDraft({ ...result.current.draft, claimsEnabled: false });
    });
    await waitFor(() => expect(result.current.hasChanges).toBe(true));
    act(() => result.current.handleSave());
    await waitFor(() => expect(result.current.policyConflict?.revision).toBe(4));
    expect(result.current.draft.claimsEnabled).toBe(false);
    expect(calls.update[0]?.body.expected_revision).toBe(3);

    act(() => result.current.handleOverwritePolicyConflict());
    await waitFor(() => expect(calls.update).toHaveLength(2));
    expect(calls.update[1]?.body.expected_revision).toBe(4);
    await waitFor(() => expect(result.current.policy?.revision).toBe(5));
    expect(result.current.policyConflict).toBeNull();

    // A later conflict can be resolved by replacing the draft with the server copy.
    act(() => {
      result.current.setDraft({ ...result.current.draft, claimsEnabled: true });
    });
    await waitFor(() => expect(result.current.hasChanges).toBe(true));
    act(() => result.current.handleSave());
    await waitFor(() => expect(result.current.policyConflict?.revision).toBe(6));
    expect(result.current.draft.claimsEnabled).toBe(true);

    act(() => result.current.handleLoadLatestPolicy());
    expect(result.current.policyConflict).toBeNull();
    expect(result.current.policy?.revision).toBe(6);
    expect(result.current.draft.claimsEnabled).toBe(false);
  });
});

describe("formatHandleNamespaceSuffix", () => {
  test("uses family-aware prefixes", () => {
    expect(formatHandleNamespaceSuffix(primaryNamespace)).toBe(".pokemon");
    expect(formatHandleNamespaceSuffix(mirrorNamespace)).toBe("@collectors");
  });
});
