export type PirateSponsoredIntent =
  | {
      type: "pirate.follow.apply";
      followed: boolean;
      slot: string;
      targetAddress: `0x${string}`;
    }
  | {
      type: "pirate.follow.create-list-records";
      followed: boolean;
      slot: string;
      targetAddress: `0x${string}`;
    }
  | {
      type: "pirate.follow.mint-primary-list";
      slot: string;
    };

export interface PirateSponsoredTransactionEnvelope {
  data: `0x${string}`;
  to: `0x${string}`;
  value?: string;
}

export interface PirateSponsoredIntentRequest {
  authorizationSignature?: string;
  chainId: number;
  intent: PirateSponsoredIntent;
  privyWalletId?: string;
  transaction: PirateSponsoredTransactionEnvelope;
  walletAddress: `0x${string}`;
}

export type PirateSponsoredIntentSender = (
  request: PirateSponsoredIntentRequest,
) => Promise<`0x${string}`>;

export type PirateSponsoredRelayErrorCode =
  | "invalid_request"
  | "relay_failed"
  | "session_mismatch"
  | "unauthorized"
  | "unsupported_chain"
  | "unsupported_intent"
  | "wallet_needs_migration"
  | "wallet_not_found";

export interface PirateSponsoredRelaySuccess {
  txHash: `0x${string}`;
}

export interface PirateSponsoredRelayFailure {
  error: PirateSponsoredRelayErrorCode;
  message: string;
}

export type PirateSponsoredRelayResponse =
  | PirateSponsoredRelayFailure
  | PirateSponsoredRelaySuccess;

export function isPirateSponsoredRelayFailure(
  value: PirateSponsoredRelayResponse,
): value is PirateSponsoredRelayFailure {
  return "error" in value;
}
