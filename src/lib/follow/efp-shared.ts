"use client";

import {
  createPublicClient,
  createWalletClient,
  custom,
  encodePacked,
  fromHex,
  hexToString,
  http,
  isAddress,
  keccak256,
  toHex,
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
import { withTimeout } from "@/lib/promise-utils";

export { withTimeout };

export const EFP_READ_TIMEOUT_MS = 4_000;

export const listRegistryAbi = [
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getListStorageLocation",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const accountMetadataAbi = [
  {
    inputs: [
      { internalType: "address", name: "addr", type: "address" },
      { internalType: "string", name: "key", type: "string" },
    ],
    name: "getValue",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const listRecordsAbi = [
  {
    inputs: [{ internalType: "uint256", name: "slot", type: "uint256" }],
    name: "getAllListOps",
    outputs: [{ internalType: "bytes[]", name: "", type: "bytes[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "slot", type: "uint256" }],
    name: "getListUser",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "slot", type: "uint256" },
      { internalType: "bytes[]", name: "ops", type: "bytes[]" },
    ],
    name: "applyListOps",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "slot", type: "uint256" },
      {
        components: [
          { internalType: "string", name: "key", type: "string" },
          { internalType: "bytes", name: "value", type: "bytes" },
        ],
        internalType: "struct IEFPListMetadata.KeyValue[]",
        name: "records",
        type: "tuple[]",
      },
      { internalType: "bytes[]", name: "ops", type: "bytes[]" },
    ],
    name: "setMetadataValuesAndApplyListOps",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const listMinterAbi = [
  {
    inputs: [{ internalType: "bytes", name: "listStorageLocation", type: "bytes" }],
    name: "mintPrimaryListNoMeta",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export interface ProfileListsResponse {
  primary_list?: string | null;
}

export interface FollowStatusResponse {
  state?: {
    follow?: boolean;
  };
}

export interface ProfileStatsResponse {
  followers_count?: number;
  following_count?: number;
}

export interface OnChainFollowSummary {
  followerCount: number | null;
  followingCount: number;
}

export interface FollowWriteTransaction {
  abi: typeof listMinterAbi | typeof listRecordsAbi;
  address: Address;
  args: readonly unknown[];
  chainId: number;
  functionName: "mintPrimaryListNoMeta" | "applyListOps" | "setMetadataValuesAndApplyListOps";
}

export type OnChainListEntry = {
  followed: boolean;
  tags: Set<string>;
};

export function resolveEfpChain(chainId: number) {
  if (chainId === base.id) return base;
  if (chainId === baseSepolia.id) return baseSepolia;
  if (chainId === optimism.id) return optimism;
  if (chainId === optimismSepolia.id) return optimismSepolia;
  if (chainId === mainnet.id) return mainnet;
  if (chainId === sepolia.id) return sepolia;
  throw new Error(`Unsupported EFP chain (${chainId}).`);
}

export function normalizeAddress(value: string | null | undefined): Address | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!isAddress(trimmed)) {
    return null;
  }

  return trimmed.toLowerCase() as Address;
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

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const { efp } = getPirateNetworkConfig();
  const response = await withTimeout(
    fetch(`${efp.apiUrl}${path}`, {
      cache: "default",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      ...init,
    }),
    EFP_READ_TIMEOUT_MS,
    "EFP request timed out.",
  );

  if (!response.ok) {
    throw new Error(`EFP request failed (${response.status}).`);
  }

  return await response.json() as T;
}

export function asPositiveInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 0;
}

export function createFollowListOp(targetAddress: Address, followed: boolean) {
  return encodePacked(
    ["uint8", "uint8", "uint8", "address"],
    [1, followed ? 1 : 2, 1, targetAddress],
  );
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

export function generateListNonce(): bigint {
  const entropy = `${Date.now()}-${Math.random()}-${Math.random()}`;
  const hash = keccak256(toHex(entropy));
  return BigInt(hash) & ((1n << 255n) - 1n);
}

export function createMintStorageLocation(slot: bigint) {
  const { efp } = getPirateNetworkConfig();
  return encodePacked(
    ["uint8", "uint8", "uint256", "address", "uint256"],
    [1, 1, BigInt(efp.primaryListChainId), getPrimaryListRecordsAddress(), slot],
  );
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
