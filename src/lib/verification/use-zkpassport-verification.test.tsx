import { beforeEach, describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

const startSessionInputs: Array<Record<string, unknown>> = [];

const verificationSession = {
  id: "vs_zkpassport_unique_human",
  launch: {
    zkpassport: {
      binding: "binding",
      dev_mode: true,
      domain: "pirate.sc",
      logo: "https://pirate.sc/favicon.svg",
      name: "Pirate",
      purpose: "Community access",
      requested_capabilities: ["unique_human"],
      scope: "community_join",
      validity_seconds: 300,
      verification_requirements: [],
    },
  },
  requested_capabilities: ["unique_human"],
  status: "pending",
};

mock.module("@/lib/api", () => ({
  useApi: () => ({
    verification: {
      completeSession: async () => ({ ...verificationSession, status: "verified" }),
      getSession: async () => verificationSession,
      startSession: async (input: Record<string, unknown>) => {
        startSessionInputs.push(input);
        return verificationSession;
      },
    },
  }),
}));

mock.module("@zkpassport/sdk", () => ({
  ZKPassport: class {
    async request() {
      const request = {
        bind: () => request,
        disclose: () => request,
        done: () => ({
          onError: () => undefined,
          onProofGenerated: () => undefined,
          onReject: () => undefined,
          onResult: () => undefined,
          url: "https://zkpassport.id/verify",
        }),
        gte: () => request,
      };
      return request;
    }
  },
}));

const { useZkPassportVerification } = await import("./use-zkpassport-verification");

beforeEach(() => {
  startSessionInputs.length = 0;
});

describe("useZkPassportVerification", () => {
  test("preserves unique_human when starting a ZKPassport session", async () => {
    const { result } = renderHook(() => useZkPassportVerification({
      verificationIntent: "community_join",
    }));

    await act(async () => {
      expect(await result.current.startVerification({
        deferOpen: true,
        requestedCapabilities: ["unique_human"],
        unavailableMessage: "Unavailable",
      })).toEqual({ href: "https://zkpassport.id/verify", started: true });
    });

    expect(startSessionInputs).toHaveLength(1);
    expect(startSessionInputs[0]?.requested_capabilities).toEqual(["unique_human"]);
  });
});
