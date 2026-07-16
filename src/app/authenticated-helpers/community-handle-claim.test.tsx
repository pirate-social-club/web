import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import type {
  CommunityHandle,
  CommunityHandlePaymentInstructions,
  CommunityHandleQuote,
} from "@pirate/api-contracts";
import type { Hex } from "viem";

import { ApiError } from "@/lib/api/client";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { installDomGlobals } from "@/test/setup-dom";

import { useCommunityHandleClaimController } from "./community-handle-claim";

installDomGlobals();

function createQuote(overrides: Partial<CommunityHandleQuote> = {}): CommunityHandleQuote {
  return {
    id: "hcq_test",
    object: "community_handle_quote",
    community: "com_cmt_test",
    namespace: "ns_test",
    desired_label: "amira",
    label: "amira",
    label_normalized: "amira",
    eligible: true,
    availability: "available",
    reason: null,
    price_cents: 0,
    currency: "USD",
    pricing_model: "free",
    pricing_tier: "free",
    payment_instructions: null,
    quote_ttl_seconds: 600,
    quoted_at: 1,
    expires_at: 2,
    ...overrides,
  };
}

function createHandle(overrides: Partial<CommunityHandle> = {}): CommunityHandle {
  return {
    id: "ch_test",
    object: "community_handle",
    community: "com_cmt_test",
    namespace: "ns_test",
    user: "usr_test",
    label: "amira",
    label_normalized: "amira",
    status: "active",
    issuance_source: "claim",
    quote: "hcq_test",
    price_cents: 0,
    currency: "USD",
    pricing_model: "free",
    pricing_tier: "free",
    settlement_wallet_attachment: null,
    funding_tx_ref: null,
    settlement_tx_ref: null,
    lease_started_at: null,
    lease_expires_at: null,
    created: 1,
    ...overrides,
  };
}

function createPaymentInstructions(): CommunityHandlePaymentInstructions {
  return {
    chain: {
      chain_namespace: "eip155",
      chain_id: 84532,
      display_name: "Base Sepolia",
    },
    token_address: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
    recipient_address: "0x5000000000000000000000000000000000000005",
    amount_atomic: "5000000",
    amount_display: "5.00",
  };
}

function createWallet(): PirateConnectedEvmWallet {
  return {
    address: "0x1000000000000000000000000000000000000001",
    getEthereumProvider: async () => ({}),
    switchChain: async () => undefined,
  };
}

describe("useCommunityHandleClaimController", () => {
  test("quotes and claims a free handle", async () => {
    const claimBodies: unknown[] = [];
    const api = {
      quoteHandle: async () => createQuote(),
      claimHandle: async (_communityId: string, body: unknown) => {
        claimBodies.push(body);
        return createHandle();
      },
    };

    const { result } = renderHook(() => useCommunityHandleClaimController({
      api,
      communityId: "cmt_test",
      connectedWallets: [],
      debounceMs: 0,
    }));

    act(() => result.current.onSearchChange("amira"));
    await waitFor(() => expect(result.current.searchResult?.availability).toBe("available"));

    await act(async () => {
      await result.current.onClaim();
    });

    expect(claimBodies).toEqual([{ quote: "hcq_test" }]);
    expect(result.current.phase).toBe("success");
    expect(result.current.claimedLabel).toBe("amira");
  });

  test("binds quotes to the selected namespace", async () => {
    const quoteBodies: unknown[] = [];
    const api = {
      quoteHandle: async (_communityId: string, body: unknown) => {
        quoteBodies.push(body);
        return createQuote();
      },
      claimHandle: async () => createHandle(),
    };

    const { result } = renderHook(() => useCommunityHandleClaimController({
      api,
      communityId: "cmt_test",
      namespaceVerificationId: "nv_charizard",
      connectedWallets: [],
      debounceMs: 0,
    }));

    act(() => result.current.onSearchChange("ash"));
    await waitFor(() => expect(result.current.searchResult?.availability).toBe("available"));

    expect(quoteBodies).toEqual([{
      desired_label: "ash",
      namespace_verification: "nv_charizard",
    }]);
  });

  test("runs USDC checkout before claiming a paid handle", async () => {
    const instructions = createPaymentInstructions();
    const claimBodies: unknown[] = [];
    const checkoutInputs: CommunityHandlePaymentInstructions[] = [];
    const api = {
      quoteHandle: async () => createQuote({
        price_cents: 500,
        pricing_model: "flat_by_length",
        pricing_tier: "standard",
        payment_instructions: instructions,
      }),
      claimHandle: async (_communityId: string, body: unknown) => {
        claimBodies.push(body);
        return createHandle({
          price_cents: 500,
          pricing_model: "flat_by_length",
          pricing_tier: "standard",
          funding_tx_ref: "0xfunded",
        });
      },
    };

    const { result } = renderHook(() => useCommunityHandleClaimController({
      api,
      communityId: "cmt_test",
      connectedWallets: [createWallet()],
      primaryWalletAddress: "0x1000000000000000000000000000000000000001",
      settlementWalletAttachmentId: "wa_test",
      debounceMs: 0,
      executeCheckout: async ({ paymentInstructions }) => {
        checkoutInputs.push(paymentInstructions);
        return "0xfunded" as Hex;
      },
    }));

    act(() => result.current.onSearchChange("amira"));
    await waitFor(() => expect(result.current.searchResult?.priceCents).toBe(500));

    await act(async () => {
      await result.current.onClaim();
    });

    expect(checkoutInputs).toEqual([instructions]);
    expect(claimBodies).toEqual([{
      quote: "hcq_test",
      settlement_wallet_attachment: "wa_test",
      funding_tx_ref: "0xfunded",
      settlement_tx_ref: "0xfunded",
    }]);
    expect(result.current.phase).toBe("success");
  });

  test("never pays or claims an ineligible available quote", async () => {
    let checkoutCalls = 0;
    let claimCalls = 0;
    const api = {
      quoteHandle: async () => createQuote({
        eligible: false,
        availability: "available",
        reason: "A Bitcoin Taproot wallet is required for protocol-issued names",
        price_cents: 500,
        payment_instructions: createPaymentInstructions(),
      }),
      claimHandle: async () => {
        claimCalls += 1;
        return createHandle();
      },
    };

    const { result } = renderHook(() => useCommunityHandleClaimController({
      api,
      communityId: "cmt_test",
      connectedWallets: [createWallet()],
      primaryWalletAddress: "0x1000000000000000000000000000000000000001",
      settlementWalletAttachmentId: "wa_test",
      debounceMs: 0,
      executeCheckout: async () => {
        checkoutCalls += 1;
        return "0xfunded" as Hex;
      },
    }));

    act(() => result.current.onSearchChange("amira"));
    await waitFor(() => expect(result.current.searchResult?.availability).toBe("unavailable"));

    await act(async () => {
      await result.current.onClaim();
    });

    expect(result.current.searchResult?.reason).toBe("A Bitcoin Taproot wallet is required for protocol-issued names");
    expect(checkoutCalls).toBe(0);
    expect(claimCalls).toBe(0);
    expect(result.current.phase).toBe("confirm");
  });

  test("maps structured claim conflicts back into the search result", async () => {
    const api = {
      quoteHandle: async () => createQuote(),
      claimHandle: async () => {
        throw new ApiError("conflict", "You already have an active name in this community", 409, false, {
          availability: "viewer_has_claim",
          reason: "You already have an active name in this community",
        });
      },
    };

    const { result } = renderHook(() => useCommunityHandleClaimController({
      api,
      communityId: "cmt_test",
      connectedWallets: [],
      debounceMs: 0,
    }));

    act(() => result.current.onSearchChange("amira"));
    await waitFor(() => expect(result.current.searchResult?.availability).toBe("available"));

    await act(async () => {
      await result.current.onClaim();
    });

    expect(result.current.phase).toBe("confirm");
    expect(result.current.searchResult?.availability).toBe("viewer_has_claim");
    expect(result.current.searchResult?.reason).toBe("You already have an active name in this community");
  });

  test("shows a friendly error when the wallet transaction is rejected", async () => {
    const instructions = createPaymentInstructions();
    const api = {
      quoteHandle: async () => createQuote({
        price_cents: 500,
        pricing_model: "flat_by_length",
        pricing_tier: "standard",
        payment_instructions: instructions,
      }),
      claimHandle: async () => createHandle(),
    };

    const { result } = renderHook(() => useCommunityHandleClaimController({
      api,
      communityId: "cmt_test",
      connectedWallets: [createWallet()],
      primaryWalletAddress: "0x1000000000000000000000000000000000000001",
      settlementWalletAttachmentId: "wa_test",
      debounceMs: 0,
      executeCheckout: async () => {
        throw new Error("User rejected the request.\n\nRequest Arguments: chain: Base Sepolia");
      },
    }));

    act(() => result.current.onSearchChange("amira"));
    await waitFor(() => expect(result.current.searchResult?.priceCents).toBe(500));

    await act(async () => {
      await result.current.onClaim();
    });

    expect(result.current.phase).toBe("confirm");
    expect(result.current.error).toBe("Transaction cancelled.");
  });

  test("shows a retry-specific error when server funding confirmation times out", async () => {
    const instructions = createPaymentInstructions();
    const api = {
      quoteHandle: async () => createQuote({
        price_cents: 500,
        pricing_model: "flat_by_length",
        pricing_tier: "standard",
        payment_instructions: instructions,
      }),
      claimHandle: async () => {
        throw new ApiError(
          "funding_confirmation_timeout",
          "Funding transaction confirmation timed out",
          504,
          true,
          {
            funding_tx_ref: "0xfunded",
            timeout_ms: 15000,
          },
        );
      },
    };

    const { result } = renderHook(() => useCommunityHandleClaimController({
      api,
      communityId: "cmt_test",
      connectedWallets: [createWallet()],
      primaryWalletAddress: "0x1000000000000000000000000000000000000001",
      settlementWalletAttachmentId: "wa_test",
      debounceMs: 0,
      executeCheckout: async () => "0xfunded" as Hex,
    }));

    act(() => result.current.onSearchChange("amira"));
    await waitFor(() => expect(result.current.searchResult?.priceCents).toBe(500));

    await act(async () => {
      await result.current.onClaim();
    });

    expect(result.current.phase).toBe("confirm");
    expect(result.current.error).toBe("We could not confirm your payment in time. Try claiming again with the same transaction.");
  });

  test("debounces quote requests while typing", async () => {
    const labels: string[] = [];
    const api = {
      quoteHandle: async (_communityId: string, body: { desired_label: string }) => {
        labels.push(body.desired_label);
        return createQuote({ desired_label: body.desired_label, label: body.desired_label, label_normalized: body.desired_label });
      },
      claimHandle: async () => createHandle(),
    };

    const { result } = renderHook(() => useCommunityHandleClaimController({
      api,
      communityId: "cmt_test",
      connectedWallets: [],
      debounceMs: 20,
    }));

    act(() => {
      result.current.onSearchChange("a");
      result.current.onSearchChange("am");
      result.current.onSearchChange("ami");
      result.current.onSearchChange("amira");
    });

    await waitFor(() => expect(result.current.searchResult?.availability).toBe("available"));

    expect(labels).toEqual(["amira"]);
  });
});
