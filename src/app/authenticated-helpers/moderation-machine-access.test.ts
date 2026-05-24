import { describe, expect, test } from "bun:test";

import {
  buildCommunityModerationPath,
  buildCommunityModerationSections,
  type CommunityModerationSection,
} from "@/app/authenticated-helpers/moderation-helpers";
import { getCommunityModerationTitle } from "@/app/authenticated-helpers/moderation-route-helpers";

const mockCopy = {
  nav: {
    profile: "Profile",
    rules: "Rules",
    links: "Links",
    labels: "Labels",
    donations: "Donations",
    pricing: "Pricing",
    gates: "Gates",
    safety: "Safety",
    agents: "Agents",
    machineAccess: "Machine access",
    namespace: "Namespace verification",
    communitySection: "Community",
    accessSection: "Access",
    verificationSection: "Verification",
  },
};

describe("machine-access moderation wiring", () => {
  test("assistant is in the section type and builds a path", () => {
    const section: CommunityModerationSection = "assistant";
    const path = buildCommunityModerationPath("gld_123", section);

    expect(path).toBe("/c/gld_123/mod/assistant");
  });

  test("getCommunityModerationTitle returns the assistant label", () => {
    expect(getCommunityModerationTitle("assistant", mockCopy)).toBe("Assistant");
  });

  test("buildCommunityModerationSections includes assistant in the Access group", () => {
    const sections = buildCommunityModerationSections(null, "gld_123", mockCopy);
    const accessSection = sections.find((s) => s.label === "Access");
    const assistantItem = accessSection?.items.find(
      (item) => item.label === "Assistant",
    );

    expect(accessSection == null).toBe(false);
    expect(assistantItem == null).toBe(false);
    expect(assistantItem!.active).toBe(false);
  });

  test("assistant sidebar item is active when passed as activeSection", () => {
    const sections = buildCommunityModerationSections("assistant", "gld_123", mockCopy);
    const accessSection = sections.find((s) => s.label === "Access");
    const assistantItem = accessSection!.items.find(
      (item) => item.label === "Assistant",
    );

    expect(assistantItem!.active).toBe(true);
  });

  test("machine-access is in the section type and builds a path", () => {
    const section: CommunityModerationSection = "machine-access";
    const path = buildCommunityModerationPath("gld_123", section);

    expect(path).toBe("/c/gld_123/mod/machine-access");
  });

  test("telegram is in the section type and builds a path", () => {
    const section: CommunityModerationSection = "telegram";
    const path = buildCommunityModerationPath("gld_123", section);

    expect(path).toBe("/c/gld_123/mod/telegram");
  });

  test("getCommunityModerationTitle returns the telegram label", () => {
    expect(getCommunityModerationTitle("telegram", mockCopy)).toBe("Telegram");
  });

  test("buildCommunityModerationSections includes telegram in the Access group", () => {
    const sections = buildCommunityModerationSections(null, "gld_123", mockCopy);
    const accessSection = sections.find((s) => s.label === "Access");
    const telegramItem = accessSection?.items.find(
      (item) => item.label === "Telegram",
    );

    expect(accessSection == null).toBe(false);
    expect(telegramItem == null).toBe(false);
    expect(telegramItem!.active).toBe(false);
  });

  test("telegram sidebar item is active when passed as activeSection", () => {
    const sections = buildCommunityModerationSections("telegram", "gld_123", mockCopy);
    const accessSection = sections.find((s) => s.label === "Access");
    const telegramItem = accessSection!.items.find(
      (item) => item.label === "Telegram",
    );

    expect(telegramItem!.active).toBe(true);
  });

  test("getCommunityModerationTitle returns the machine-access nav label", () => {
    expect(getCommunityModerationTitle("machine-access", mockCopy)).toBe("Machine access");
  });

  test("buildCommunityModerationSections includes machine-access in the Access group", () => {
    const sections = buildCommunityModerationSections(null, "gld_123", mockCopy);
    const accessSection = sections.find((s) => s.label === "Access");
    const machineAccessItem = accessSection?.items.find(
      (item) => item.label === "Machine access",
    );

    expect(accessSection == null).toBe(false);
    expect(machineAccessItem == null).toBe(false);
    expect(machineAccessItem!.active).toBe(false);
  });

  test("machine-access sidebar item is active when passed as activeSection", () => {
    const sections = buildCommunityModerationSections("machine-access", "gld_123", mockCopy);
    const accessSection = sections.find((s) => s.label === "Access");
    const machineAccessItem = accessSection!.items.find(
      (item) => item.label === "Machine access",
    );

    expect(machineAccessItem!.active).toBe(true);
  });

  test("machine-access is distinct from agents in the sidebar", () => {
    const sections = buildCommunityModerationSections("machine-access", "gld_123", mockCopy);
    const accessSection = sections.find((s) => s.label === "Access");
    const labels = accessSection!.items.map((item) => item.label);

    expect(labels).toContain("Agents");
    expect(labels).toContain("Assistant");
    expect(labels).toContain("Telegram");
    expect(labels).toContain("Machine access");
    expect(labels.indexOf("Assistant") < labels.indexOf("Telegram")).toBe(true);
    expect(labels.indexOf("Telegram") < labels.indexOf("Machine access")).toBe(true);
    expect(labels.indexOf("Agents") < labels.indexOf("Machine access")).toBe(true);
  });
});
