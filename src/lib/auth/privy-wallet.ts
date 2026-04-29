"use client";

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export interface PirateConnectedEvmWallet {
  address: `0x${string}`;
  getEthereumProvider: () => Promise<unknown>;
  id?: string | null;
  switchChain: (targetChainId: number | string) => Promise<void>;
  walletClientType?: string | null;
}

export function normalizePirateConnectedEvmWallet(
  value: unknown,
): PirateConnectedEvmWallet | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<PirateConnectedEvmWallet> & {
    address?: unknown;
    getEthereumProvider?: unknown;
    id?: unknown;
    switchChain?: unknown;
    walletClientType?: unknown;
  };

  if (typeof candidate.address !== "string" || !ADDRESS_PATTERN.test(candidate.address.trim())) {
    return null;
  }

  if (typeof candidate.getEthereumProvider !== "function") {
    return null;
  }

  if (typeof candidate.switchChain !== "function") {
    return null;
  }

  return {
    address: candidate.address.trim().toLowerCase() as `0x${string}`,
    getEthereumProvider: candidate.getEthereumProvider,
    id: typeof candidate.id === "string" && candidate.id.trim()
      ? candidate.id.trim()
      : null,
    switchChain: candidate.switchChain,
    walletClientType: typeof candidate.walletClientType === "string"
      ? candidate.walletClientType
      : null,
  };
}
