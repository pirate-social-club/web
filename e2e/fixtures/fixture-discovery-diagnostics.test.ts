import { describe, expect, test } from "bun:test";

import {
  fixtureDiagnosticDetail,
  formatFixtureDiscoveryDiagnostics,
} from "./fixture-discovery-diagnostics";

describe("fixture discovery diagnostics", () => {
  test("renders each rejected discovery stage and target", () => {
    expect(formatFixtureDiscoveryDiagnostics([
      { detail: "request timed out", stage: "feed", target: "/feed/home/public" },
      { detail: "claims_enabled is false", stage: "policy", target: "/communities/cmt_1/handle-policy" },
    ])).toBe([
      "- feed /feed/home/public: request timed out",
      "- policy /communities/cmt_1/handle-policy: claims_enabled is false",
    ].join("\n"));
  });

  test("normalizes and bounds thrown details", () => {
    const detail = fixtureDiagnosticDetail(new Error(`first\nsecond ${"x".repeat(600)}`));
    expect(detail.startsWith("first second ")).toBe(true);
    expect(detail.length).toBe(500);
  });

  test("explains an empty diagnostic set", () => {
    expect(formatFixtureDiscoveryDiagnostics([])).toBe("No discovery diagnostics were recorded.");
  });
});
