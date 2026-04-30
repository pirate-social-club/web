import { beforeEach, describe, expect, test } from "bun:test";
import { baseSepolia, optimismSepolia } from "viem/chains";
import type { Address } from "viem";

const VIEWER_ADDRESS = `0x${"22".repeat(20)}` as const;
const TARGET_ADDRESS = `0x${"11".repeat(20)}` as const;

import.meta.env.VITE_PIRATE_APP_ENV = "staging";
const { __testOnly } = await import("./efp-write");

const TEST_EFP_CONFIG = {
  accountMetadata: "0xDAf8088C4DCC8113F49192336cd594300464af8D" as Address,
  apiUrl: "https://api.ethfollow.xyz/api/v1",
  environment: "testnet" as const,
  listRegistry: "0xDdD39d838909bdFF7b067a5A42DC92Ad4823a26d" as Address,
  listMinter: "0x0c3301561B8e132fe18d97E69d95F5f1F2849f9b" as Address,
  primaryListChainId: baseSepolia.id,
  listRecordsByChain: {
    [baseSepolia.id]: "0x63B4e2Bb1E9b9D02AEF3Dc473c5B4b590219FA5e" as Address,
    [optimismSepolia.id]: "0x2f644bfec9C8E9ad822744E17d9Bf27A42e039fE" as Address,
  },
  rpcUrlsByChainId: {},
};

describe("EFP sponsored follow writes", () => {
  beforeEach(() => {
    import.meta.env.VITE_PIRATE_APP_ENV = "staging";
    import.meta.env.VITE_BASE_NETWORK = "base-sepolia";
    import.meta.env.VITE_EFP_ENVIRONMENT = "testnet";
  });

  test("maps an existing Base Sepolia list write to a sponsored apply intent", () => {
    const [transaction] = __testOnly.buildFollowTransactions(
      VIEWER_ADDRESS,
      TARGET_ADDRESS,
      { chainId: baseSepolia.id, slot: 9n },
      false,
      TEST_EFP_CONFIG,
    );

    expect(transaction?.functionName).toBe("applyListOps");
    expect(__testOnly.canSponsorFollowTransaction(transaction!, TEST_EFP_CONFIG)).toBe(true);
    expect(__testOnly.buildSponsoredFollowIntent(transaction!, TARGET_ADDRESS, false)).toEqual({
      type: "pirate.follow.apply",
      followed: false,
      slot: "9",
      targetAddress: TARGET_ADDRESS,
    });
  });

  test("maps first-follow setup writes to records and mint intents", () => {
    const transactions = __testOnly.buildFollowTransactions(
      VIEWER_ADDRESS,
      TARGET_ADDRESS,
      undefined,
      true,
      TEST_EFP_CONFIG,
    );

    expect(transactions).toHaveLength(2);
    expect(transactions[0]?.functionName).toBe("setMetadataValuesAndApplyListOps");
    expect(transactions[1]?.functionName).toBe("mintPrimaryListNoMeta");
    expect(__testOnly.buildSponsoredFollowIntent(transactions[0]!, TARGET_ADDRESS, true)).toEqual({
      type: "pirate.follow.create-list-records",
      followed: true,
      slot: (transactions[0]?.args[0] as bigint).toString(),
      targetAddress: TARGET_ADDRESS,
    });
    expect(__testOnly.buildSponsoredFollowIntent(transactions[1]!, TARGET_ADDRESS, true)).toEqual({
      type: "pirate.follow.mint-primary-list",
      slot: (transactions[0]?.args[0] as bigint).toString(),
    });
  });

  test("does not sponsor non-primary EFP storage chains", () => {
    const [transaction] = __testOnly.buildFollowTransactions(
      VIEWER_ADDRESS,
      TARGET_ADDRESS,
      { chainId: optimismSepolia.id, slot: 9n },
      true,
      TEST_EFP_CONFIG,
    );

    expect(transaction?.functionName).toBe("applyListOps");
    expect(__testOnly.canSponsorFollowTransaction(transaction!, TEST_EFP_CONFIG)).toBe(false);
  });
});
