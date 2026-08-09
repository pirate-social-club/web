import { describe, expect, test } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { CommunityNamespaceVerificationPage } from "./community-namespace-verification-page";
import type {
  HnsImportChallengePayload,
  NamespaceVerificationCallbacks,
  NamespaceVerificationStartResult,
} from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";
import type { ApiCommunityNamespaceAttachment } from "@/lib/api/client-api-types";

installDomGlobals();
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
  test("offers the signed import and preselects the attached root", async () => {
    const callbacks: NamespaceVerificationCallbacks = {
      onStartSession: async () => session("challenge_required", payload("pirate-verification=nch_upgrade")),
      onCompleteSession: async () => ({
        status: "challenge_pending",
        namespaceVerificationId: null,
        failureReason: null,
      }),
      onGetSession: async () => session("challenge_required", payload("pirate-verification=nch_upgrade")),
    };
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

    fireEvent.click(view.getByRole("button", { name: "Complete HNS setup" }));

    expect(view.getByDisplayValue("fixture-root")).toBeTruthy();
    expect(view.getByText("Connect Name")).toBeTruthy();
  });
});
