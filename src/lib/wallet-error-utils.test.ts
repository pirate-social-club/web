import { describe, expect, test } from "bun:test";

import { getWalletTransactionErrorMessage } from "./wallet-error-utils";

describe("getWalletTransactionErrorMessage", () => {
  test("collapses viem user rejection diagnostics", () => {
    const error = new Error(
      "User rejected the request.\n\nRequest Arguments: chain: Base Sepolia data: 0x123\n\nContract Call: address: 0xabc\nDocs: https://viem.sh/docs/contract/writeContract\nDetails: User rejected the request.\nVersion: viem@2.48.1",
    );

    expect(getWalletTransactionErrorMessage(error, "Follow failed.")).toBe("Transaction cancelled.");
  });

  test("keeps concise wallet failures", () => {
    expect(getWalletTransactionErrorMessage(new Error("Insufficient funds."), "Fallback")).toBe("Insufficient funds.");
  });

  test("falls back for long diagnostics that are not user-facing", () => {
    const message = `Transaction failed. ${"x".repeat(220)} Contract Call: address: 0xabc`;

    expect(getWalletTransactionErrorMessage(new Error(message), "Fallback")).toBe("Fallback");
  });
});
