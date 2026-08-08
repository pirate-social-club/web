import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  copyableHnsResourceRecord,
  formatHnsResourceRecords,
  getHnsImportActionLabel,
  HnsImportGuidance,
  hnsImportNeedsPublishAcknowledgement,
} from "./hns-import-guidance";
import type { HnsImportChallengePayload } from "../verify-namespace-modal/verify-namespace-modal.types";

const records = [
  { type: "NS", ns: "ns1.pirate." },
  { type: "TXT", txt: ["pirate-verification=", "proof"] },
  { type: "SYNTH4", address: "198.51.100.23" },
];

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
    preserved_unknown_record_types: ["SYNTH4"],
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

describe("HnsImportGuidance", () => {
  test("formats the complete resource as one record per line without dropping opaque records", () => {
    expect(formatHnsResourceRecords(records)).toBe([
      "NS  ns1.pirate.",
      '{"type":"TXT","txt":["pirate-verification=","proof"]}',
      '{"type":"SYNTH4","address":"198.51.100.23"}',
    ].join("\n"));
    expect(copyableHnsResourceRecord(records[1])).toBe(JSON.stringify(records[1]));
    expect(copyableHnsResourceRecord(records[2])).toBe(JSON.stringify(records[2]));
  });

  test("uses an explicit publish CTA before switching to status checks", () => {
    expect(getHnsImportActionLabel(payload)).toBe("I published all records — check the chain");
    expect(hnsImportNeedsPublishAcknowledgement(payload)).toBe(true);
    expect(getHnsImportActionLabel({
      ...payload,
      replacement_acknowledged_at: "2026-08-08T12:00:00.000Z",
    })).toBe("Check status");
    expect(hnsImportNeedsPublishAcknowledgement({
      ...payload,
      replacement_acknowledged_at: "2026-08-08T12:00:00.000Z",
    })).toBe(false);
  });

  test("keeps browser readiness claims out of the publish step", () => {
    const markup = renderToStaticMarkup(
      <HnsImportGuidance
        payload={payload}
        rootLabel="fixture-root"
      />,
    );

    expect(markup).toContain("Publish the UPDATE");
    expect(markup).toContain("Phase 1 of 2");
    expect(markup.match(/Copy all records/g)).toHaveLength(1);
    expect(markup).not.toContain('type="checkbox"');
    expect(markup).not.toContain("Copy record 1");
    expect(markup).not.toContain("Freedom");
    expect(markup).not.toContain("Denuo");
    expect(markup).not.toContain("Pirate route");
  });

  test("tells the user to refresh manually while waiting for the mined update", () => {
    const markup = renderToStaticMarkup(
      <HnsImportGuidance
        payload={{
          ...payload,
          replacement_acknowledged_at: "2026-08-08T12:00:00.000Z",
        }}
        rootLabel="fixture-root"
      />,
    );

    expect(markup).toContain("Phase 2 of 2");
    expect(markup).toContain("Pirate does not refresh this page automatically");
    expect(markup).toContain("Check status");
  });

  test("annotates resource differences in one complete replacement list", () => {
    const markup = renderToStaticMarkup(
      <HnsImportGuidance
        payload={{
          ...payload,
          replacement_acknowledged_at: "2026-08-08T12:00:00.000Z",
          observation: {
            state: "resource_mismatch",
            current_height: 342_468,
            missing_records: [records[1]],
            unexpected_records: [{ type: "NS", ns: "old-nameserver.invalid." }],
          },
        }}
        rootLabel="fixture-root"
      />,
    );

    expect(markup.match(/Copy all records/g)).toHaveLength(1);
    expect(markup).toContain("Missing");
    expect(markup).toContain("Unexpected");
    expect(markup).not.toContain("Missing from the committed resource");
    expect(markup).not.toContain("Unexpected in the committed resource");
  });

  test("renders expiry as a session state instead of an observation state", () => {
    const markup = renderToStaticMarkup(
      <HnsImportGuidance
        expired
        payload={payload}
        rootLabel="fixture-root"
      />,
    );

    expect(markup).toContain("This setup session expired");
    expect(markup).not.toContain("Complete replacement resource");
  });
});
