import { describe, expect, test } from "bun:test";

import { getLocaleMessages } from "@/locales";
import { formatRequirementSummarySentence } from "./community-membership-gate-panel";

describe("formatRequirementSummarySentence", () => {
  test("renders a localized flat OR sentence", () => {
    expect(formatRequirementSummarySentence(
      [{ mode: "any", text: "Palm scan or Browser anti-bot check" }],
      "en",
      getLocaleMessages("en", "gates").panel,
    )).toBe("Either Palm scan or Browser anti-bot check is accepted.");
    expect(formatRequirementSummarySentence(
      [{ mode: "any", text: "فحص الكف أو فحص المتصفح" }],
      "ar",
      getLocaleMessages("ar", "gates").panel,
    )).toBe("يكفي استيفاء أحد الخيارات التالية: فحص الكف أو فحص المتصفح.");
  });

  test("keeps required groups when alternatives are also present", () => {
    expect(formatRequirementSummarySentence(
      [
        { mode: "all", text: "Real person check" },
        { mode: "any", text: "Palm scan or Browser anti-bot check" },
      ],
      "en",
      getLocaleMessages("en", "gates").panel,
    )).toBe("Complete Real person check. Also complete one of: Palm scan or Browser anti-bot check.");
    expect(formatRequirementSummarySentence(
      [
        { mode: "all", text: "真人验证" },
        { mode: "any", text: "掌纹扫描或浏览器检查" },
      ],
      "zh",
      getLocaleMessages("zh", "gates").panel,
    )).toBe("完成真人验证，并满足以下任一项：掌纹扫描或浏览器检查。");
  });

  test("treats separate alternative groups as conjunctive obligations", () => {
    expect(formatRequirementSummarySentence(
      [
        { mode: "any", text: "Palm scan or Browser anti-bot check" },
        { mode: "any", text: "Passport score or NFT holding" },
      ],
      "en",
      getLocaleMessages("en", "gates").panel,
    )).toBe("Complete one option from each group: Palm scan or Browser anti-bot check and Passport score or NFT holding.");
  });
});
