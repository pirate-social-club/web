import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { CommunityNamespaceVerificationPage } from "./community-namespace-verification-page";
import type {
  HnsImportChallengePayload,
  NamespaceVerificationCallbacks,
  NamespaceVerificationStartResult,
} from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";
import type { ApiCommunityNamespaceAttachment } from "@/lib/api/client-api-types";

installDomGlobals();
afterEach(cleanup);
window.matchMedia = (() => ({
  matches: false,
  media: "",
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => true,
})) as typeof window.matchMedia;

function payload(challenge: string): HnsImportChallengePayload {
  return {
    kind: "hns_import",
    publish_plan: {
      version: "hns_import_publish_v1",
      replacement_semantics: "complete_resource",
      current_records: [{ type: "TXT", txt: ["existing=record"] }],
      preserved_records: [{ type: "TXT", txt: ["existing=record"] }],
      removed_conflicts: [],
      added_records: [{ type: "TXT", txt: [challenge] }],
      replacement_records: [
        { type: "TXT", txt: ["existing=record"] },
        { type: "TXT", txt: [challenge] },
      ],
      preserved_unknown_record_types: [],
      acknowledgement_required: true,
    },
    observed_chain_anchor: {
      network: "main",
      height: 342_468,
      block_hash: "ab".repeat(32),
      median_time: 1_785_000_000,
    },
    observation: {
      state: "waiting_for_update",
      current_height: 342_468,
    },
  };
}

function session(
  status: NamespaceVerificationStartResult["status"],
  hnsImportPayload: HnsImportChallengePayload,
): NamespaceVerificationStartResult {
  return {
    namespaceVerificationSessionId: "nvs_expired_fixture",
    family: "hns",
    rootLabel: "fixture-root",
    challengeHost: "fixture-root",
    challengeTxtValue: null,
    challengePayload: null,
    hnsImportPayload,
    challengeExpiresAt: null,
    status,
    operationClass: null,
    pirateDnsAuthorityVerified: false,
    setupNameservers: ["ns1.pirate.", "ns2.pirate."],
  };
}

describe("CommunityNamespaceVerificationPage expired HNS recovery", () => {
  test("requests restart and renders the fresh replacement list", async () => {
    const expiredPayload = payload("pirate-verification=nch_expired");
    const freshPayload = payload("pirate-verification=nch_fresh");
    let restarted = false;
    let restartInput: Parameters<NamespaceVerificationCallbacks["onCompleteSession"]>[0] | null = null;
    const callbacks: NamespaceVerificationCallbacks = {
      onStartSession: async () => session("challenge_required", freshPayload),
      onCompleteSession: async (input) => {
        restartInput = input;
        restarted = true;
        return {
          status: "challenge_required",
          namespaceVerificationId: null,
          failureReason: null,
          hnsImportPayload: freshPayload,
        };
      },
      onGetSession: async () => {
        if (restarted) throw new Error("Status reconciliation unavailable");
        return session("expired", expiredPayload);
      },
    };
    const view = render(
      <CommunityNamespaceVerificationPage
        activeSessionId="nvs_expired_fixture"
        callbacks={callbacks}
        initialRootLabel="fixture-root"
      />,
    );

    const action = await view.findByRole("button", { name: "Get a new record list" });
    fireEvent.click(action);

    await waitFor(() => {
      expect(view.getByText("pirate-verification=nch_fresh")).toBeTruthy();
      expect(view.getByText("Status reconciliation unavailable")).toBeTruthy();
    });
    expect(restartInput).toMatchObject({
      namespaceVerificationSessionId: "nvs_expired_fixture",
      family: "hns",
      restartChallenge: true,
    });
    expect(view.queryByText("pirate-verification=nch_expired")).toBeNull();
    expect(view.queryByText("Session expired")).toBeNull();
    expect(view.queryByRole("button", { name: "Get a new record list" })).toBeNull();
  });

  test("keeps the expired payload and renders the typed restart error", async () => {
    const expiredPayload = payload("pirate-verification=nch_expired");
    const callbacks: NamespaceVerificationCallbacks = {
      onStartSession: async () => session("challenge_required", expiredPayload),
      onCompleteSession: async () => { throw new Error("Verifier contract is unavailable"); },
      onGetSession: async () => session("expired", expiredPayload),
    };
    const view = render(
      <CommunityNamespaceVerificationPage
        activeSessionId="nvs_expired_fixture"
        callbacks={callbacks}
        initialRootLabel="fixture-root"
      />,
    );

    fireEvent.click(await view.findByRole("button", { name: "Get a new record list" }));

    await waitFor(() => {
      expect(view.getByText("Verifier contract is unavailable")).toBeTruthy();
    });
    expect(view.getByText("Session expired")).toBeTruthy();
    expect(view.queryByText("Publish these records")).toBeNull();
    expect(view.getByRole("button", { name: "Get a new record list" })).toBeTruthy();
  });

  test("preserves unsupported payload records while hiding self-service publish", async () => {
    const unsupportedPayload = payload("pirate-verification=nch_chunked");
    unsupportedPayload.publish_plan.replacement_records.push({
      type: "TXT",
      txt: ["chunk-one", "chunk-two"],
    });
    const callbacks: NamespaceVerificationCallbacks = {
      onStartSession: async () => session("challenge_required", unsupportedPayload),
      onCompleteSession: async () => ({
        status: "challenge_pending",
        namespaceVerificationId: null,
        failureReason: null,
      }),
      onGetSession: async () => session("challenge_required", unsupportedPayload),
    };
    const view = render(
      <CommunityNamespaceVerificationPage
        activeSessionId="nvs_expired_fixture"
        callbacks={callbacks}
        initialRootLabel="fixture-root"
      />,
    );

    expect(await view.findByText("Unsupported records")).toBeTruthy();
    expect(unsupportedPayload.publish_plan.replacement_records.at(-1)).toEqual({
      type: "TXT",
      txt: ["chunk-one", "chunk-two"],
    });
    expect(view.queryByRole("button", { name: /I published all records/u })).toBeNull();
  });
});

describe("CommunityNamespaceVerificationPage legacy HNS import", () => {
  const callbacks: NamespaceVerificationCallbacks = {
    onStartSession: async () => session("challenge_required", payload("pirate-verification=nch_upgrade")),
    onCompleteSession: async () => ({
      status: "challenge_pending",
      namespaceVerificationId: null,
      failureReason: null,
    }),
    onGetSession: async () => session("challenge_required", payload("pirate-verification=nch_upgrade")),
  };

  test("presents recovery as incomplete setup and preselects the attached root", async () => {
    const legacyPrimary: ApiCommunityNamespaceAttachment = {
      namespace_verification: "nv_legacy",
      namespace_role: "primary",
      family: "hns",
      root_label: "fixture-root",
      route_slug: "fixture-root",
      verification_status: "verified",
      hns_setup_status: "legacy_import_required",
      delegation: null,
    };
    const view = render(
      <CommunityNamespaceVerificationPage
        attachedNamespaceVerificationId="nv_legacy"
        attachedRouteSlug="fixture-root"
        callbacks={callbacks}
        namespaceAttachments={[legacyPrimary]}
      />,
    );

    expect(view.getByRole("heading", { name: "HNS setup incomplete" })).toBeTruthy();
    expect(view.getByText("Publish Pirate HNS records")).toBeTruthy();
    expect(view.queryByText("Attached name namespaces")).toBeNull();

    fireEvent.click(view.getByRole("button", { name: "Generate HNS records" }));

    expect(view.getByDisplayValue("fixture-root")).toBeTruthy();
    expect(view.getByText("Connect Name")).toBeTruthy();
  });

  test("shows secure setup waiting for native route activation", () => {
    const pendingPrimary: ApiCommunityNamespaceAttachment = {
      namespace_verification: "nv_pending",
      namespace_role: "primary",
      family: "hns",
      root_label: "fixture-root",
      route_slug: "fixture-root",
      verification_status: "verified",
      hns_setup_status: "setup_complete",
      delegation: {
        pirate_web_routing_allowed: false,
        pirate_subdomain_issuance_allowed: true,
        delegation_security: "secure",
        observation_fresh: true,
        routing_withheld_reason: "canonical_activation_pending",
        signature_expiry_warning: false,
        canonical_routing_eligible: false,
        routing_hard_denied: false,
      },
    };
    const view = render(
      <CommunityNamespaceVerificationPage
        attachedNamespaceVerificationId="nv_pending"
        attachedRouteSlug="fixture-root"
        callbacks={callbacks}
        namespaceAttachments={[pendingPrimary]}
      />,
    );

    expect(view.getByRole("heading", { name: "HNS setup pending" })).toBeTruthy();
    expect(view.getByText("Enable native route")).toBeTruthy();
    expect(view.queryByText("Attached name namespaces")).toBeNull();
    expect(view.getByLabelText("HNS setup progress").nextElementSibling).toBe(
      view.getByLabelText("HNS setup details"),
    );
  });

  test("makes drifted and stale delegations actionable", () => {
    const attentionPrimary: ApiCommunityNamespaceAttachment = {
      namespace_verification: "nv_attention",
      namespace_role: "primary",
      family: "hns",
      root_label: "fixture-root",
      route_slug: "fixture-root",
      verification_status: "verified",
      hns_setup_status: "setup_complete",
      delegation: {
        pirate_web_routing_allowed: false,
        pirate_subdomain_issuance_allowed: false,
        delegation_security: "drifted",
        observation_fresh: true,
        routing_withheld_reason: "delegation_drifted",
        signature_expiry_warning: false,
        canonical_routing_eligible: false,
        routing_hard_denied: false,
      },
    };
    const renderPage = (primary: ApiCommunityNamespaceAttachment) => (
      <CommunityNamespaceVerificationPage
        attachedNamespaceVerificationId="nv_attention"
        attachedRouteSlug="fixture-root"
        callbacks={callbacks}
        namespaceAttachments={[primary]}
      />
    );
    const view = render(renderPage(attentionPrimary));

    expect(view.getByRole("heading", { name: "HNS delegation needs attention" })).toBeTruthy();
    expect(view.getByText(/no longer matches Pirate's expected nameserver or DNSSEC records/u)).toBeTruthy();
    expect(view.getByText(/contact Pirate support/u)).toBeTruthy();

    view.rerender(renderPage({
      ...attentionPrimary,
      delegation: {
        ...attentionPrimary.delegation!,
        delegation_security: "pending",
        observation_fresh: false,
        routing_withheld_reason: "observation_stale",
      },
    }));

    expect(view.getByText(/latest delegation check is stale/u)).toBeTruthy();
    expect(view.getByText(/if this persists, contact Pirate support/u)).toBeTruthy();
  });

  test("shows attachment management only after the native route is live", () => {
    const livePrimary: ApiCommunityNamespaceAttachment = {
      namespace_verification: "nv_live",
      namespace_role: "primary",
      family: "hns",
      root_label: "fixture-root",
      route_slug: "fixture-root",
      verification_status: "verified",
      hns_setup_status: "setup_complete",
      delegation: {
        pirate_web_routing_allowed: true,
        pirate_subdomain_issuance_allowed: true,
        delegation_security: "secure",
        observation_fresh: true,
        routing_withheld_reason: null,
        signature_expiry_warning: false,
        canonical_routing_eligible: true,
        routing_hard_denied: false,
      },
    };
    const view = render(
      <CommunityNamespaceVerificationPage
        attachedNamespaceVerificationId="nv_live"
        attachedRouteSlug="fixture-root"
        callbacks={callbacks}
        namespaceAttachments={[livePrimary]}
      />,
    );

    expect(view.getByRole("heading", { name: "HNS route live" })).toBeTruthy();
    expect(view.getByText("Attached name namespaces")).toBeTruthy();
    expect(view.getByRole("button", { name: "Attach another namespace" })).toBeTruthy();
  });
});
