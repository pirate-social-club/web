import type { CashoutSheetState } from "@/components/compositions/rewards/reward-surfaces";
import { getPirateNetworkConfig } from "@/lib/network-config";

export function formatRewardBalanceCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatRewardCents(cents: number, chainId: number): string {
  void chainId;
  return formatRewardBalanceCents(cents);
}

export function rewardAssetLabel(chainId: number): string {
  if (chainId === 8453) return "";
  if (chainId === 84532) return "Test bounties — no cash value";
  return "Dollar bounties";
}

export function pendingRewardDeadline(expiresAt: number | null): string {
  if (expiresAt == null) return "Verify to claim this bounty.";
  const days = Math.max(1, Math.ceil((expiresAt * 1_000 - Date.now()) / 86_400_000));
  return `Verify within ${days} ${days === 1 ? "day" : "days"} to claim.`;
}

export function baseTxUrl(
  txHash: string | null,
  stage: CashoutSheetState,
): string | undefined {
  if (!txHash || (stage !== "broadcast" && stage !== "confirmed")) return undefined;
  const explorerUrl = getPirateNetworkConfig().base.explorerUrl.replace(/\/$/u, "");
  return `${explorerUrl}/tx/${txHash}`;
}

export function isIdentityConflictError(message: string | null): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("already linked") || normalized.includes("different account");
}
