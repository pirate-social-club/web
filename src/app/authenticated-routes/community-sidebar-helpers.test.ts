import { describe, expect, test } from "bun:test";

import { buildCommunitySidebarRequirements } from "./community-sidebar-helpers";

describe("buildCommunitySidebarRequirements", () => {
  test("localizes nationality requirements for Arabic", () => {
    expect(buildCommunitySidebarRequirements({
      locale: "ar",
      gateSummaries: [{ gate_type: "nationality", required_value: "PS" }],
    })).toEqual(["جنسية فلسطين"]);
  });

  test("localizes common verification labels for Arabic", () => {
    expect(buildCommunitySidebarRequirements({
      locale: "ar",
      defaultAgeGatePolicy: "18_plus",
      gateSummaries: [
        { gate_type: "unique_human", required_value: null },
        { gate_type: "wallet_score", required_value: null, minimum_score: 20 },
      ],
    })).toEqual(["18+", "فحص الهوية", "درجة Passport 20+"]);
  });

  test("falls back to English labels when locale is omitted", () => {
    expect(buildCommunitySidebarRequirements({
      gateSummaries: [{ gate_type: "nationality", required_value: "PS" }],
    })).toEqual(["Palestine nationality"]);
  });

  test("renders ethereum nft requirement labels", () => {
    expect(buildCommunitySidebarRequirements({
      gateSummaries: [{ gate_type: "erc721_holding", contract_address: "0x1111111111111111111111111111111111111111" }],
    })).toEqual(["Ethereum NFT holder"]);
  });
});
