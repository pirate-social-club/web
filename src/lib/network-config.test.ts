import { describe, expect, test } from "bun:test";
import { base, baseSepolia } from "viem/chains";

import { resolvePirateNetworkConfig } from "./network-config";

function env(values: Record<string, string | undefined>) {
  return (name: string): string | null => {
    const value = values[name];
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  };
}

function expectErrorMessage(action: () => unknown, message: string) {
  try {
    action();
  } catch (error) {
    expect(error instanceof Error ? error.message : String(error)).toContain(message);
    return;
  }

  throw new Error(`Expected action to throw: ${message}`);
}

describe("network config", () => {
  test("defaults non-production environments to test networks", () => {
    const config = resolvePirateNetworkConfig(env({
      VITE_PIRATE_APP_ENV: "staging",
    }));

    expect(config.appEnvironment).toBe("staging");
    expect(config.base.chainId).toBe(baseSepolia.id);
    expect(config.story.chainId).toBe(1315);
    expect(config.efp.environment).toBe("testnet");
  });

  test("rejects explicit mainnet selections outside production", () => {
    expectErrorMessage(() => resolvePirateNetworkConfig(env({
      VITE_PIRATE_APP_ENV: "dev",
      VITE_BASE_NETWORK: "base-mainnet",
    })), "VITE_BASE_NETWORK cannot select Base Mainnet");

    expectErrorMessage(() => resolvePirateNetworkConfig(env({
      VITE_PIRATE_APP_ENV: "staging",
      VITE_STORY_NETWORK: "story-mainnet",
    })), "VITE_STORY_NETWORK cannot select Story Mainnet");

    expectErrorMessage(() => resolvePirateNetworkConfig(env({
      VITE_PIRATE_APP_ENV: "staging",
      VITE_EFP_ENVIRONMENT: "mainnet",
    })), "VITE_EFP_ENVIRONMENT cannot select EFP Mainnet");
  });

  test("allows explicit mainnet selections in production", () => {
    const config = resolvePirateNetworkConfig(env({
      VITE_PIRATE_APP_ENV: "prod",
      VITE_BASE_NETWORK: "base-mainnet",
      VITE_EFP_ENVIRONMENT: "mainnet",
      VITE_STORY_NETWORK: "story-mainnet",
    }));

    expect(config.appEnvironment).toBe("prod");
    expect(config.base.chainId).toBe(base.id);
    expect(config.story.chainId).toBe(1514);
    expect(config.efp.environment).toBe("mainnet");
  });
});
