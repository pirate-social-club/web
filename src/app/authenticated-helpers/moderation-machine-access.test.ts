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
  test("machine-access is in the section type and builds a path", () => {
    const section: CommunityModerationSection = "machine-access";
    const path = buildCommunityModerationPath("gld_123", section);

    expect(path).toBe("/c/gld_123/mod/machine-access");
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
    expect(labels).toContain("Machine access");
    expect(labels.indexOf("Agents") < labels.indexOf("Machine access")).toBe(true);
  });
});
