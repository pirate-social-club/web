import { describe, expect, test } from "bun:test";

import {
  hasProfileWallet,
  profileWalletChainSections,
  resolveProfileTab,
} from "./profile-page.model";
import { profileComments, profilePosts, walletChainSections, baseProfileProps } from "./profile-page-fixtures";

describe("profile page model", () => {
  test("only exposes wallet when deterministic wallet data exists", () => {
    expect(hasProfileWallet({ stats: [] })).toBe(false);
    expect(hasProfileWallet({ stats: [], walletAddress: "0xabc" })).toBe(true);
    expect(resolveProfileTab("wallet", false)).toBe("overview");
    expect(resolveProfileTab("wallet", true)).toBe("wallet");
    expect(resolveProfileTab("book", false, false)).toBe("overview");
    expect(resolveProfileTab("book", false, true)).toBe("book");
  });

  test("groups wallet assets by chain for the embedded WalletHub", () => {
    const sections = profileWalletChainSections([
      { assetId: "eth", label: "ETH", value: "1.2", fiatValue: "$3,000" },
      { assetId: "usdc", chainId: "base", label: "USDC", value: "20", fiatValue: "$20" },
      { assetId: "base-eth", chainId: "base", label: "ETH", value: "0.2" },
    ], "0xabc");
    expect(sections).toHaveLength(2);
    expect(sections[0]?.chainId).toBe("ethereum");
    expect(sections[1]?.tokens).toHaveLength(2);
    expect(sections[1]?.walletAddress).toBe("0xabc");
  });

  test("keeps the complete offline profile fixture breadth", () => {
    expect(profilePosts.map((item) => item.post.content.type)).toEqual(["image", "text", "video"]);
    expect(profileComments).toHaveLength(3);
    expect(profileComments[2]?.viewerVote).toBe("down");
    expect(walletChainSections.map((section) => section.chainId)).toEqual(["ethereum", "story", "bitcoin", "solana", "tempo", "cosmos"]);
    expect(baseProfileProps.rightRail.verificationItems).toHaveLength(4);
  });
});
