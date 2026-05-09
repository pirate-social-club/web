import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import type { StoredSession } from "@/lib/api/session-store";

function normalizeWalletAddress(address: unknown): `0x${string}` | null {
  if (typeof address !== "string") return null;
  const normalized = address.trim().toLowerCase();
  return normalized.match(/^0x[a-f0-9]{40}$/) ? (normalized as `0x${string}`) : null;
}

export function getSessionWalletAddresses(session: StoredSession): `0x${string}`[] {
  const addresses: `0x${string}`[] = [];
  const addAddress = (address: unknown) => {
    const normalized = normalizeWalletAddress(address);
    if (normalized && !addresses.includes(normalized)) {
      addresses.push(normalized);
    }
  };

  addAddress(session.profile.primary_wallet_address);
  for (const wallet of session.walletAttachments) {
    addAddress(wallet.wallet_address);
  }

  return addresses;
}

export function getSessionWalletAddress(session: StoredSession): `0x${string}` | null {
  return getSessionWalletAddresses(session)[0] ?? null;
}

export function resolveXmtpWalletAddress(
  session: StoredSession,
  signerWallet?: PirateConnectedEvmWallet | null,
): `0x${string}` | null {
  const sessionWalletAddresses = getSessionWalletAddresses(session);
  const signerAddress = normalizeWalletAddress(signerWallet?.address);
  if (signerAddress && sessionWalletAddresses.includes(signerAddress)) {
    return signerAddress;
  }
  return sessionWalletAddresses[0] ?? null;
}

export function resolveXmtpSignerWallet(
  session: StoredSession,
  connectedWallets: readonly PirateConnectedEvmWallet[],
): PirateConnectedEvmWallet | null {
  const walletAddresses = new Set(getSessionWalletAddresses(session));
  if (walletAddresses.size === 0) return null;
  return connectedWallets.find((wallet) => {
    const address = normalizeWalletAddress(wallet.address);
    return !!address && walletAddresses.has(address);
  }) ?? null;
}
