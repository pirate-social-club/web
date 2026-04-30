import { describe, expect, test } from "bun:test";
import { baseSepolia, optimismSepolia } from "viem/chains";

const VIEWER_ADDRESS = `0x${"22".repeat(20)}` as const;
const TARGET_ADDRESS = `0x${"11".repeat(20)}` as const;

import.meta.env.VITE_PIRATE_APP_ENV = "staging";
const { __testOnly } = await import("./efp-write");

describe("EFP sponsored follow writes", () => {
  test("maps an existing Base Sepolia list write to a sponsored apply intent", () => {
    const [transaction] = __testOnly.buildFollowTransactions(
      VIEWER_ADDRESS,
      TARGET_ADDRESS,
      { chainId: baseSepolia.id, slot: 9n },
      false,
    );

    expect(transaction?.functionName).toBe("applyListOps");
    expect(__testOnly.canSponsorFollowTransaction(transaction!)).toBe(true);
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
    );

    expect(transaction?.functionName).toBe("applyListOps");
    expect(__testOnly.canSponsorFollowTransaction(transaction!)).toBe(false);
  });
});
