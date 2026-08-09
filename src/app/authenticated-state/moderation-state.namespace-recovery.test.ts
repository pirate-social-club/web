import { describe, expect, test } from "bun:test";

import { namespaceRoleForCompletedVerification } from "./moderation-state";

const stalePrimary = {
  namespace_verification: "nv_old",
  namespace_role: "primary" as const,
  family: "hns" as const,
  root_label: "dankmeme",
  route_slug: "dankmeme",
  verification_status: "stale" as const,
};

describe("namespaceRoleForCompletedVerification", () => {
  test("promotes a rebuilt verification when the attached primary is stale", () => {
    expect(namespaceRoleForCompletedVerification({
      currentNamespaceVerificationId: "nv_old",
      completedNamespaceVerificationId: "nv_rebuilt",
      completedFamily: "hns",
      completedRootLabel: "dankmeme",
      attachments: [stalePrimary],
    })).toBe("primary");
  });

  test("keeps an additional verification as a mirror when the primary is verified", () => {
    expect(namespaceRoleForCompletedVerification({
      currentNamespaceVerificationId: "nv_old",
      completedNamespaceVerificationId: "nv_other",
      completedFamily: "hns",
      completedRootLabel: "other",
      attachments: [{ ...stalePrimary, verification_status: "verified" }],
    })).toBe("mirror");
  });

  test("does not promote when the current primary cannot be established", () => {
    expect(namespaceRoleForCompletedVerification({
      currentNamespaceVerificationId: "nv_old",
      completedNamespaceVerificationId: "nv_rebuilt",
      completedFamily: "hns",
      completedRootLabel: "dankmeme",
      attachments: [],
    })).toBe("mirror");
  });

  test("promotes a signed import for the same root while the legacy primary is still verified", () => {
    expect(namespaceRoleForCompletedVerification({
      currentNamespaceVerificationId: "nv_old",
      completedNamespaceVerificationId: "nv_imported",
      completedFamily: "hns",
      completedRootLabel: "dankmeme",
      attachments: [{ ...stalePrimary, verification_status: "verified" }],
    })).toBe("primary");
  });

  test("does not change same-root Spaces replacement behavior", () => {
    expect(namespaceRoleForCompletedVerification({
      currentNamespaceVerificationId: "nv_old",
      completedNamespaceVerificationId: "nv_other",
      completedFamily: "spaces",
      completedRootLabel: "dankmeme",
      attachments: [{ ...stalePrimary, family: "spaces", verification_status: "verified" }],
    })).toBe("mirror");
  });
});
