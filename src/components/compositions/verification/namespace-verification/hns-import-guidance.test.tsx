import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  copyableHnsRecordValue,
  describeHnsRecord,
  getHnsImportActionLabel,
  HnsImportGuidance,
  hnsImportHasUnsupportedRecords,
  hnsImportNeedsPublishAcknowledgement,
} from "./hns-import-guidance";
import type { HnsImportChallengePayload } from "../verify-namespace-modal/verify-namespace-modal.types";

const records = [
  { type: "NS", ns: "ns1.pirate." },
  { type: "TXT", txt: ["pirate-verification=proof"] },
  { type: "SYNTH4", address: "198.51.100.23" },
];

const dsRecord = {
  type: "DS",
  keyTag: 49194,
  algorithm: 13,
  digestType: 2,
  digest: "C74E61F29F60B98EB8A31C8A6286C1F45F418A26A42EB92C332176EA875CFDF2",
};

const payload: HnsImportChallengePayload = {
  kind: "hns_import",
  publish_plan: {
    version: "hns_import_publish_v1",
    replacement_semantics: "complete_resource",
    current_records: records,
    preserved_records: records,
    removed_conflicts: [],
    added_records: [],
    replacement_records: records,
    preserved_unknown_record_types: [],
    acknowledgement_required: true,
  },
  observed_chain_anchor: {
    network: "main",
    height: 342_431,
    block_hash: "fixture",
    median_time: 1_785_000_000,
  },
  observation: {
    state: "waiting_for_update",
    current_height: 342_431,
  },
};

const acknowledgedPayload: HnsImportChallengePayload = {
  ...payload,
  replacement_acknowledged_at: "2026-08-08T12:00:00.000Z",
};

const unsupportedPayload: HnsImportChallengePayload = {
  ...payload,
  publish_plan: {
    ...payload.publish_plan,
    replacement_records: [
      ...records,
      { type: "TXT", txt: ["chunk-a", "chunk-b"] },
    ],
  },
};

describe("HnsImportGuidance", () => {
  test("per-record values match form-based publisher fields", () => {
    expect(copyableHnsRecordValue(records[0])).toBe("ns1.pirate.");
    expect(copyableHnsRecordValue(dsRecord)).toBe(
      "49194 13 2 C74E61F29F60B98EB8A31C8A6286C1F45F418A26A42EB92C332176EA875CFDF2",
    );
    expect(copyableHnsRecordValue(records[2])).toBe("198.51.100.23");
    expect(copyableHnsRecordValue({ type: "GLUE4", ns: "ns1.example.", address: "203.0.113.10" })).toBe("ns1.example. 203.0.113.10");
  });

  test("every Bob-supported type renders readably; the rest are unsupported", () => {
    expect(describeHnsRecord(records[0])).toEqual({ kind: "standard", type: "NS", value: "ns1.pirate." });
    expect(describeHnsRecord(records[2])).toEqual({ kind: "standard", type: "SYNTH4", value: "198.51.100.23" });
    expect(describeHnsRecord({ type: "TXT", txt: ["a", "b"] })).toEqual({
      kind: "advanced",
      type: "TXT",
      detail: "TXT (2 chunks)",
    });
    expect(hnsImportHasUnsupportedRecords(payload)).toBe(false);
    expect(hnsImportHasUnsupportedRecords(unsupportedPayload)).toBe(true);
  });

  test("uses an explicit publish CTA before switching to status checks", () => {
    expect(getHnsImportActionLabel(payload)).toBe("I published all records, check the chain");
    expect(hnsImportNeedsPublishAcknowledgement(payload)).toBe(true);
    expect(getHnsImportActionLabel(acknowledgedPayload)).toBe("Check status");
    expect(hnsImportNeedsPublishAcknowledgement(acknowledgedPayload)).toBe(false);
  });

  test("publish step is a title and centered per-record copy rows, nothing else", () => {
    const markup = renderToStaticMarkup(
      <HnsImportGuidance
        payload={payload}
      />,
    );

    expect(markup).toContain("Publish these records");
    expect(markup).toContain("198.51.100.23");
    expect(markup.match(/Copy \w+ value/g)).toHaveLength(records.length);
    expect(markup).not.toContain("·");
    expect(markup).not.toContain("—");
    expect(markup).not.toContain("Copy all");
    expect(markup).not.toContain("In Bob Wallet");
    expect(markup).not.toContain('{"type":"SYNTH4"');
    expect(markup).not.toContain("Connect .");
    expect(markup).not.toContain('type="checkbox"');
    expect(markup).not.toContain("Freedom");
    expect(markup).not.toContain("Denuo");
    expect(markup).not.toContain("Pirate route");
  });

  test("unsupported records block publishing instead of rendering rows", () => {
    const markup = renderToStaticMarkup(
      <HnsImportGuidance
        payload={unsupportedPayload}
      />,
    );

    expect(markup).toContain("Unsupported records");
    expect(markup).toContain("records that Bob Wallet cannot preserve");
    expect(markup).toContain("Contact support before publishing an update.");
    expect(markup).toContain('data-tone="action"');
    expect(markup).not.toContain("Publish these records");
    expect(markup).not.toContain("ns1.pirate.");
    expect(markup).not.toContain("Copy");
    expect(markup).not.toContain("sendupdate");
    expect(markup).not.toContain("Advanced");
    expect(markup).not.toContain("&quot;");
  });

  test("watch state reports an observation without first-person wording", () => {
    const markup = renderToStaticMarkup(
      <HnsImportGuidance
        payload={acknowledgedPayload}
      />,
    );

    expect(markup).toContain("Update not confirmed yet");
    expect(markup).toContain("Check again after it confirms.");
    expect(markup).toContain('data-tone="waiting"');
    expect(markup).not.toContain("We ");
    expect(markup).not.toContain("we ");
  });

  test("commit state explains the wait in one sentence plus the eta", () => {
    const markup = renderToStaticMarkup(
      <HnsImportGuidance
        payload={{
          ...acknowledgedPayload,
          update_observed_height: 342_433,
          target_tree_boundary: 342_468,
          observation: {
            state: "pending_tree_commit",
            current_height: 342_440,
            target_tree_boundary: 342_468,
          },
        }}
      />,
    );

    expect(markup).toContain("Transaction confirmed");
    expect(markup).toContain("Handshake is finalizing the update. Check again in about 5 hours.");
    expect(markup).not.toContain("342,440");
    expect(markup).not.toContain("342,468");
    expect(markup).not.toContain("36 blocks");
    expect(markup).not.toContain("tree commit");
  });

  test("delegation state reports the observation without claiming a cause", () => {
    const markup = renderToStaticMarkup(
      <HnsImportGuidance
        payload={{
          ...acknowledgedPayload,
          update_observed_height: 342_433,
          observation: {
            state: "delegation_not_secure",
            current_height: 342_470,
          },
        }}
      />,
    );

    expect(markup).toContain("Records confirmed");
    expect(markup).toContain("Secure delegation isn&#x27;t available yet");
    expect(markup).not.toContain("lags");
    expect(markup).not.toContain("pending");
  });

  test("mismatch annotates differences with pills and never offers unexpected records for copy", () => {
    const markup = renderToStaticMarkup(
      <HnsImportGuidance
        payload={{
          ...acknowledgedPayload,
          observation: {
            state: "resource_mismatch",
            current_height: 342_468,
            missing_records: [records[1]],
            unexpected_records: [{ type: "NS", ns: "old-nameserver.invalid." }],
          },
        }}
      />,
    );

    expect(markup).toContain("Published records don&#x27;t match");
    expect(markup).toContain("Publish the full list again as one update. A partial fix won&#x27;t work.");
    expect(markup).toContain('data-tone="action"');
    expect(markup.match(/Copy \w+ value/g)).toHaveLength(records.length);
    expect(markup).toContain(">Missing</span>");
    expect(markup).toContain(">Unexpected</span>");
    expect(markup).not.toContain("·");
    expect(markup).not.toContain("—");
  });

  test("renders expiry as an actionable session state", () => {
    const markup = renderToStaticMarkup(
      <HnsImportGuidance
        expired
        payload={payload}
      />,
    );

    expect(markup).toContain("Session expired");
    expect(markup).toContain("Generate a fresh list before publishing.");
    expect(markup).toContain('data-tone="action"');
    expect(markup).not.toContain("Publish these records");
  });

  test("done state is a bare confirmation", () => {
    const markup = renderToStaticMarkup(
      <HnsImportGuidance
        payload={{
          ...acknowledgedPayload,
          update_observed_height: 342_433,
          observation: {
            state: "secure",
            current_height: 342_470,
          },
        }}
      />,
    );

    expect(markup).toContain("Setup complete");
    expect(markup).toContain('data-tone="done"');
    expect(markup).not.toContain("Publish these records");
  });
});
