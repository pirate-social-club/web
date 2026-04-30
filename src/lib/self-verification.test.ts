import { describe, expect, test } from "bun:test";

import {
  buildSelfVerificationCallbackHref,
  getSelfCallbackCleanHref,
  getSelfCallbackSessionId,
  getSelfVerificationLaunchHref,
  hasSelfCallbackParams,
  parseSelfCallback,
} from "./self-verification";

describe("self verification helpers", () => {
  test("builds a universal launch href from Self session data", () => {
    const href = getSelfVerificationLaunchHref({
      app_name: "Pirate",
      disclosures: { nationality: true },
      endpoint: "https://api.pirate.test/verification-sessions/ver_123/self-callback",
      endpoint_type: "https",
      scope: "community_join",
      session_id: "ss_123",
      user: "00000000-0000-4000-8000-000000000001",
      user_id_type: "uuid",
      user_defined_data: "{\"verification_session_id\":\"ver_123\"}",
      version: 2,
    });
    expect(href === null).toBe(false);
    const url = new URL(href ?? "");
    expect(url.origin).toBe("https://redirect.self.xyz");
    const selfApp = JSON.parse(url.searchParams.get("selfApp") ?? "{}") as {
      appName?: string;
      disclosures?: { nationality?: boolean };
      endpoint?: string;
      endpointType?: string;
      sessionId?: string;
      scope?: string;
      userDefinedData?: string;
      userId?: string;
      chainID?: number;
      deeplinkCallback?: string;
      devMode?: boolean;
      header?: string;
      logoBase64?: string;
      version?: number;
    };
    expect(selfApp.appName).toBe("Pirate");
    expect(selfApp.disclosures).toEqual({ nationality: true });
    expect(selfApp.endpoint).toBe("https://api.pirate.test/verification-sessions/ver_123/self-callback");
    expect(selfApp.endpointType).toBe("https");
    expect(selfApp.sessionId).toBe("ss_123");
    expect(selfApp.scope).toBe("community_join");
    expect(selfApp.userDefinedData).toBe("{\"verification_session_id\":\"ver_123\"}");
    expect(selfApp.userId).toBe("00000000-0000-4000-8000-000000000001");
    expect({
      chainID: selfApp.chainID,
      deeplinkCallback: selfApp.deeplinkCallback,
      devMode: selfApp.devMode,
      header: selfApp.header,
      logoBase64: selfApp.logoBase64,
      version: selfApp.version,
    }).toEqual({
      chainID: 42220,
      deeplinkCallback: "",
      devMode: false,
      header: "",
      logoBase64: "",
      version: 2,
    });
  });

  test("includes deeplink callback when Self provides one", () => {
    const href = getSelfVerificationLaunchHref({
      app_name: "Pirate",
      deeplink_callback: "https://pirate.localhost/c/cmt_123?from=self",
      disclosures: { nationality: true },
      endpoint: "https://api.pirate.test/verification-sessions/ver_123/self-callback",
      endpoint_type: "https",
      scope: "community_join",
      session_id: "ss_123",
      user: "00000000-0000-4000-8000-000000000001",
      user_id_type: "uuid",
    });
    const url = new URL(href ?? "");
    const selfApp = JSON.parse(url.searchParams.get("selfApp") ?? "{}") as { deeplinkCallback?: string };
    expect(selfApp.deeplinkCallback).toBe("https://pirate.localhost/c/cmt_123?from=self");
  });

  test("overrides Self launch callback for mobile web return flow", () => {
    const href = getSelfVerificationLaunchHref({
      app_name: "Pirate",
      deeplink_callback: "https://api.pirate.test/unused",
      disclosures: { nationality: true },
      endpoint: "https://api.pirate.test/verification-sessions/ver_123/self-callback",
      endpoint_type: "https",
      scope: "community_join",
      session_id: "ss_123",
      user: "00000000-0000-4000-8000-000000000001",
      user_id_type: "uuid",
    }, {
      deeplinkCallback: "https://pirate.localhost/c/cmt_123?self_verification_session_id=ver_123",
    });
    const url = new URL(href ?? "");
    const selfApp = JSON.parse(url.searchParams.get("selfApp") ?? "{}") as { deeplinkCallback?: string };
    expect(selfApp.deeplinkCallback).toBe("https://pirate.localhost/c/cmt_123?self_verification_session_id=ver_123");
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
      user: "user_123",
      user_id_type: "uuid",
    })).toBeNull();
    expect(getSelfVerificationLaunchHref({
      app_name: "Pirate",
      disclosures: {},
      endpoint: "https://self.xyz/verify",
      endpoint_type: "https",
      scope: "community_join",
      session_id: "",
      user: "00000000-0000-4000-8000-000000000001",
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

  test("extracts a proof from callback hash parameters", () => {
    expect(parseSelfCallback(new URL("https://pirate.localhost/c/cmt_123#proof=proof_123"))).toEqual({
      proof: "proof_123",
      status: "completed",
    });
    expect(parseSelfCallback(new URL("https://pirate.localhost/c/cmt_123#/verify?proof=proof_456"))).toEqual({
      proof: "proof_456",
      status: "completed",
    });
  });

  test("builds and cleans mobile callback URLs", () => {
    const callbackHref = buildSelfVerificationCallbackHref(
      "https://pirate.localhost/c/cmt_123?tab=join&proof=old#proof=old",
      "ver_123",
    );
    expect(callbackHref).toBe("https://pirate.localhost/c/cmt_123?tab=join&self_verification_session_id=ver_123");
    expect(getSelfCallbackCleanHref(new URL(`${callbackHref}&proof=proof_123`))).toBe("/c/cmt_123?tab=join");
  });

  test("detects callback params and session ids directly", () => {
    const url = new URL("https://pirate.localhost/c/cmt_123?tab=join#self_verification_session_id=ver_123");
    expect(hasSelfCallbackParams(url)).toBe(true);
    expect(getSelfCallbackSessionId(url)).toBe("ver_123");
    expect(hasSelfCallbackParams(new URL("https://pirate.localhost/c/cmt_123?tab=join"))).toBe(false);
  });
});
