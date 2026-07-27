"use client";

import {
  createPublicClient,
  createWalletClient,
  custom,
  fromHex,
  hexToString,
  http,
  type Address,
  type Hex,
} from "viem";
import {
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  sepolia,
} from "viem/chains";

import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { getPirateNetworkConfig } from "@/lib/network-config";

import {
  accountMetadataAbi,
  buildFollowTransactions,
  buildSponsoredFollowIntent,
  listRecordsAbi,
  listRegistryAbi,
  normalizeAddress,
  type FollowWriteTransaction,
} from "@pirate/efp-shared";

export {
  accountMetadataAbi,
  buildFollowTransactions,
  buildSponsoredFollowIntent,




  listRecordsAbi,
  listRegistryAbi,
  normalizeAddress,

  type FollowWriteTransaction,
};

export type OnChainListEntry = {
  followed: boolean;
  tags: Set<string>;
};

function resolveEfpChain(chainId: number) {
  if (chainId === base.id) return base;
  if (chainId === baseSepolia.id) return baseSepolia;
  if (chainId === optimism.id) return optimism;
  if (chainId === optimismSepolia.id) return optimismSepolia;
  if (chainId === mainnet.id) return mainnet;
  if (chainId === sepolia.id) return sepolia;
  throw new Error(`Unsupported EFP chain (${chainId}).`);
}

export function createEfpPublicClient(chainId: number) {
  const chain = resolveEfpChain(chainId);
  const rpcUrl =
    getPirateNetworkConfig().efp.rpcUrlsByChainId[chainId] ?? chain.rpcUrls.default.http[0];

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

export function decodeStorageLocation(storageLocation: Hex) {
  const chainId = fromHex(`0x${storageLocation.slice(6, 70)}`, "number");
  const slot = BigInt(`0x${storageLocation.slice(-64)}`);
  return { chainId, slot };
}

export function decodePrimaryListId(value: Hex): string | null {
  if (!value || value === "0x") {
    return null;
  }

  try {
    const listId = fromHex(value, "bigint");
    return listId > 0n ? listId.toString() : null;
  } catch {
    return null;
  }
}

function parseListOpAddress(op: Hex): Address | null {
  if (op.length < 50) {
    return null;
  }

  return normalizeAddress(`0x${op.slice(10, 50)}`);
}

function parseListOpTag(op: Hex): string | null {
  if (op.length <= 50) {
    return null;
  }

  try {
    const decoded = hexToString(`0x${op.slice(50)}`, { size: undefined }).trim().toLowerCase();
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

export function applyListOp(entries: Map<Address, OnChainListEntry>, op: Hex): void {
  if (!op.startsWith("0x01") || op.length < 10) {
    return;
  }

  const opcode = Number.parseInt(op.slice(4, 6), 16);
  const address = parseListOpAddress(op);
  if (!address) {
    return;
  }

  const current = entries.get(address) ?? { followed: false, tags: new Set<string>() };

  if (opcode === 1) {
    entries.set(address, { followed: true, tags: current.tags });
    return;
  }

  if (opcode === 2) {
    entries.delete(address);
    return;
  }

  const tag = parseListOpTag(op);
  if (!tag) {
    return;
  }

  if (opcode === 3) {
    current.tags.add(tag);
    entries.set(address, current);
    return;
  }

  if (opcode === 4) {
    current.tags.delete(tag);
    entries.set(address, current);
  }
}

export function isEffectiveFollow(entry: OnChainListEntry | null | undefined): boolean {
  if (!entry?.followed) {
    return false;
  }

  return !entry.tags.has("block") && !entry.tags.has("mute");
}

export function getPrimaryListRecordsAddress(): Address {
  const { efp } = getPirateNetworkConfig();
  const address = efp.listRecordsByChain[efp.primaryListChainId];
  if (!address) {
    throw new Error(`Missing EFP list-records deployment for chain ${efp.primaryListChainId}.`);
  }

  return address;
}

export async function submitTransaction(
  wallet: PirateConnectedEvmWallet,
  viewerAddress: Address,
  transaction: FollowWriteTransaction,
): Promise<Address> {
  const chain = resolveEfpChain(transaction.chainId);
  await wallet.switchChain(transaction.chainId);

  const provider = await wallet.getEthereumProvider();
  const walletClient = createWalletClient({
    account: viewerAddress,
    chain,
    transport: custom(provider as never),
  });
  const publicClient = createEfpPublicClient(transaction.chainId);

  const hash = await walletClient.writeContract({
    abi: transaction.abi,
    account: viewerAddress,
    address: transaction.address,
    args: transaction.args,
    chain,
    functionName: transaction.functionName,
  } as never);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 90_000,
  });

  if (receipt.status !== "success") {
    throw new Error("EFP transaction reverted on-chain.");
  }

  return hash;
}
