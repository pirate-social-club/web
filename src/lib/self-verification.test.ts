import { describe, expect, test } from "bun:test";

import { getSelfVerificationLaunchHref, parseSelfCallback } from "./self-verification";

describe("self verification helpers", () => {
  test("builds a launch href from Self session data", () => {
    expect(getSelfVerificationLaunchHref({
      app_name: "Pirate",
      disclosures: { nationality: true },
      endpoint: "https://self.xyz/verify",
      endpoint_type: "https",
      scope: "community_join",
      session_id: "ss_123",
      user_id: "user_123",
      user_id_type: "uuid",
    })).toBe("https://self.xyz/verify?session_id=ss_123&scope=community_join");
  });

  test("includes deeplink callback when Self provides one", () => {
    expect(getSelfVerificationLaunchHref({
      app_name: "Pirate",
      deeplink_callback: "https://pirate.localhost/c/cmt_123?from=self",
      disclosures: { nationality: true },
      endpoint: "https://self.xyz/verify",
      endpoint_type: "https",
      scope: "community_join",
      session_id: "ss_123",
      user_id: "user_123",
      user_id_type: "uuid",
    })).toBe("https://self.xyz/verify?session_id=ss_123&scope=community_join&deeplink_callback=https%3A%2F%2Fpirate.localhost%2Fc%2Fcmt_123%3Ffrom%3Dself");
  });

  test("returns null when launch data is incomplete", () => {
    expect(getSelfVerificationLaunchHref(null)).toBeNull();
    expect(getSelfVerificationLaunchHref({
      app_name: "Pirate",
      disclosures: {},
      endpoint: "https://self.xyz/verify",
      endpoint_type: "https",
      scope: "",
      session_id: "ss_123",
      user_id: "user_123",
      user_id_type: "uuid",
    })).toBeNull();
  });

  test("extracts a proof from the callback URL", () => {
    expect(parseSelfCallback(new URL("https://pirate.localhost/c/cmt_123?proof=proof_123"))).toEqual({
      proof: "proof_123",
      status: "completed",
    });
  });

  test("extracts an error from the callback URL", () => {
    expect(parseSelfCallback(new URL("https://pirate.localhost/c/cmt_123?error=declined"))).toEqual({
      reason: "declined",
      status: "failed",
    });
  });
});
