import { describe, expect, test } from "bun:test";

import {
  findRecoverableNamespace,
  isHnsNativeRoutingLive,
} from "./community-namespace-verification-page";
import type { ApiCommunityNamespaceAttachment } from "@/lib/api/client-api-types";

const primary: ApiCommunityNamespaceAttachment = {
  namespace_verification: "nv_old",
  namespace_role: "primary",
  family: "hns",
  root_label: "dankmeme",
  route_slug: "dankmeme",
  verification_status: "stale",
};

const mirror: ApiCommunityNamespaceAttachment = {
  namespace_verification: "nv_fresh",
  namespace_role: "mirror",
  family: "hns",
  root_label: "dankmeme",
  route_slug: "dankmeme",
  verification_status: "verified",
};

describe("findRecoverableNamespace", () => {
  test("selects a verified mirror for the same stale primary root", () => {
    expect(findRecoverableNamespace({
      attachedNamespaceVerificationId: "nv_old",
      namespaceAttachments: [primary, mirror],
    })?.namespace_verification).toBe("nv_fresh");
  });

  test("does not offer an unrelated verified mirror", () => {
    expect(findRecoverableNamespace({
      attachedNamespaceVerificationId: "nv_old",
      namespaceAttachments: [primary, { ...mirror, root_label: "other" }],
    })).toBeNull();
  });

  test("does not offer recovery when the primary is still verified", () => {
    expect(findRecoverableNamespace({
      attachedNamespaceVerificationId: "nv_old",
      namespaceAttachments: [{ ...primary, verification_status: "verified" }, mirror],
    })).toBeNull();
  });
});

describe("isHnsNativeRoutingLive", () => {
  test("does not treat ownership verification as live native routing", () => {
    expect(isHnsNativeRoutingLive({ ...primary, verification_status: "verified" })).toBe(false);
  });

  test("requires the read-time routing projection", () => {
    expect(isHnsNativeRoutingLive({
      ...primary,
      verification_status: "verified",
      delegation: {
        pirate_web_routing_allowed: true,
        pirate_subdomain_issuance_allowed: true,
        delegation_security: "secure",
        observation_fresh: true,
        routing_withheld_reason: null,
        signature_expiry_warning: false,
      },
    })).toBe(true);
  });
});
