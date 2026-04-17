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

const EFP_READ_TIMEOUT_MS = 4_000;

const listRegistryAbi = [
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getListStorageLocation",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const accountMetadataAbi = [
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

const listRecordsAbi = [
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

const listMinterAbi = [
  {
    inputs: [{ internalType: "bytes", name: "listStorageLocation", type: "bytes" }],
    name: "mintPrimaryListNoMeta",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

interface ProfileListsResponse {
  primary_list?: string | null;
}

interface FollowStatusResponse {
  state?: {
    follow?: boolean;
  };
}

interface ProfileStatsResponse {
  followers_count?: number;
  following_count?: number;
}

interface OnChainFollowSummary {
  followerCount: number | null;
  followingCount: number;
}

interface FollowWriteTransaction {
  abi: typeof listMinterAbi | typeof listRecordsAbi;
  address: Address;
  args: readonly unknown[];
  chainId: number;
  functionName: "mintPrimaryListNoMeta" | "applyListOps" | "setMetadataValuesAndApplyListOps";
}

function resolveEfpChain(chainId: number) {
  if (chainId === base.id) return base;
  if (chainId === baseSepolia.id) return baseSepolia;
  if (chainId === optimism.id) return optimism;
  if (chainId === optimismSepolia.id) return optimismSepolia;
  if (chainId === mainnet.id) return mainnet;
  if (chainId === sepolia.id) return sepolia;
  throw new Error(`Unsupported EFP chain (${chainId}).`);
}

function normalizeAddress(value: string | null | undefined): Address | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!isAddress(trimmed)) {
    return null;
  }

  return trimmed.toLowerCase() as Address;
}

function createEfpPublicClient(chainId: number) {
  const chain = resolveEfpChain(chainId);
  const rpcUrl = getPirateNetworkConfig().efp.rpcUrlsByChainId[chainId] ?? chain.rpcUrls.default.http[0];

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("EFP request timed out."));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
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
  );

  if (!response.ok) {
    throw new Error(`EFP request failed (${response.status}).`);
  }

  return await response.json() as T;
}

async function fetchProfileLists(address: Address): Promise<ProfileListsResponse> {
  return await fetchJson<ProfileListsResponse>(`/users/${address}/lists?cache=fresh`);
}

async function fetchFollowStatus(
  viewerAddress: Address,
  targetAddress: Address,
): Promise<boolean> {
  const response = await fetchJson<FollowStatusResponse>(
    `/users/${viewerAddress}/${targetAddress}/buttonState?cache=fresh`,
  );

  return Boolean(response.state?.follow);
}

function asPositiveInt(value: unknown): number {
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

function createFollowListOp(targetAddress: Address, followed: boolean) {
  return encodePacked(
    ["uint8", "uint8", "uint8", "address"],
    [1, followed ? 1 : 2, 1, targetAddress],
  );
}

function decodeStorageLocation(storageLocation: Hex) {
  const chainId = fromHex(`0x${storageLocation.slice(6, 70)}`, "number");
  const slot = BigInt(`0x${storageLocation.slice(-64)}`);

  return { chainId, slot };
}

function decodePrimaryListId(value: Hex): string | null {
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

type OnChainListEntry = {
  followed: boolean;
  tags: Set<string>;
};

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

function applyListOp(entries: Map<Address, OnChainListEntry>, op: Hex): void {
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

function isEffectiveFollow(entry: OnChainListEntry | null | undefined): boolean {
  if (!entry?.followed) {
    return false;
  }

  return !entry.tags.has("block") && !entry.tags.has("mute");
}

function getPrimaryListRecordsAddress(): Address {
  const { efp } = getPirateNetworkConfig();
  const address = efp.listRecordsByChain[efp.primaryListChainId];
  if (!address) {
    throw new Error(`Missing EFP list-records deployment for chain ${efp.primaryListChainId}.`);
  }

  return address;
}

async function getListStorageLocation(listId: string) {
  const { efp } = getPirateNetworkConfig();
  const client = createEfpPublicClient(efp.primaryListChainId);
  const storageLocation = await client.readContract({
    address: efp.listRegistry,
    abi: listRegistryAbi,
    functionName: "getListStorageLocation",
    args: [BigInt(listId)],
  });

  return decodeStorageLocation(storageLocation as Hex);
}

async function getPrimaryListIdForAddress(address: Address): Promise<string | null> {
  const { efp } = getPirateNetworkConfig();
  const client = createEfpPublicClient(efp.primaryListChainId);
  const encoded = await client.readContract({
    address: efp.accountMetadata,
    abi: accountMetadataAbi,
    functionName: "getValue",
    args: [address, "primary-list"],
  });

  return decodePrimaryListId(encoded as Hex);
}

async function getListUser(chainId: number, slot: bigint): Promise<Address | null> {
  const { efp } = getPirateNetworkConfig();
  const recordsAddress = efp.listRecordsByChain[chainId];
  if (!recordsAddress) {
    return null;
  }

  const client = createEfpPublicClient(chainId);
  const user = await client.readContract({
    address: recordsAddress,
    abi: listRecordsAbi,
    functionName: "getListUser",
    args: [slot],
  });

  return normalizeAddress(user as string);
}

async function resolvePrimaryListStorageForAddress(address: Address): Promise<{ chainId: number; listId: string; slot: bigint } | null> {
  const listId = await getPrimaryListIdForAddress(address);
  if (!listId) {
    return null;
  }

  const storage = await getListStorageLocation(listId);
  const listUser = await getListUser(storage.chainId, storage.slot);
  if (listUser !== address) {
    return null;
  }

  return { chainId: storage.chainId, listId, slot: storage.slot };
}

async function getAllListOps(chainId: number, slot: bigint): Promise<Hex[]> {
  const { efp } = getPirateNetworkConfig();
  const recordsAddress = efp.listRecordsByChain[chainId];
  if (!recordsAddress) {
    throw new Error(`Unsupported EFP list-records chain (${chainId}).`);
  }

  const client = createEfpPublicClient(chainId);
  const ops = await client.readContract({
    address: recordsAddress,
    abi: listRecordsAbi,
    functionName: "getAllListOps",
    args: [slot],
  });

  return ops as Hex[];
}

async function buildOnChainListStateForAddress(address: Address): Promise<Map<Address, OnChainListEntry>> {
  const storage = await resolvePrimaryListStorageForAddress(address);
  if (!storage) {
    return new Map();
  }

  const ops = await getAllListOps(storage.chainId, storage.slot);
  const entries = new Map<Address, OnChainListEntry>();
  for (const op of ops) {
    applyListOp(entries, op);
  }

  return entries;
}

async function fetchViewerFollowStateOnChain(
  viewerAddress: Address,
  targetAddress: Address,
): Promise<boolean> {
  const entries = await buildOnChainListStateForAddress(viewerAddress);
  return isEffectiveFollow(entries.get(targetAddress));
}

async function fetchProfileFollowSummaryOnChain(
  address: Address,
): Promise<OnChainFollowSummary> {
  const entries = await buildOnChainListStateForAddress(address);
  let followingCount = 0;

  for (const entry of entries.values()) {
    if (isEffectiveFollow(entry)) {
      followingCount += 1;
    }
  }

  return {
    followerCount: null,
    followingCount,
  };
}

function generateListNonce(): bigint {
  const entropy = `${Date.now()}-${Math.random()}-${Math.random()}`;
  const hash = keccak256(toHex(entropy));

  return BigInt(hash) & ((1n << 255n) - 1n);
}

function createMintStorageLocation(slot: bigint) {
  const { efp } = getPirateNetworkConfig();
  return encodePacked(
    ["uint8", "uint8", "uint256", "address", "uint256"],
    [1, 1, BigInt(efp.primaryListChainId), getPrimaryListRecordsAddress(), slot],
  );
}

function buildFollowTransactions(
  viewerAddress: Address,
  targetAddress: Address,
  existingStorage: { chainId: number; slot: bigint } | undefined,
  followed: boolean,
): FollowWriteTransaction[] {
  const { efp } = getPirateNetworkConfig();
  const op = createFollowListOp(targetAddress, followed);

  if (existingStorage) {
    const recordsAddress = efp.listRecordsByChain[existingStorage.chainId];
    if (!recordsAddress) {
      throw new Error(`Unsupported EFP list-records chain (${existingStorage.chainId}).`);
    }

    return [{
      abi: listRecordsAbi,
      address: recordsAddress,
      args: [existingStorage.slot, [op]],
      chainId: existingStorage.chainId,
      functionName: "applyListOps",
    }];
  }

  const slot = generateListNonce();

  return [
    {
      abi: listRecordsAbi,
      address: getPrimaryListRecordsAddress(),
      args: [slot, [{ key: "user", value: viewerAddress }], [op]],
      chainId: efp.primaryListChainId,
      functionName: "setMetadataValuesAndApplyListOps",
    },
    {
      abi: listMinterAbi,
      address: efp.listMinter,
      args: [createMintStorageLocation(slot)],
      chainId: efp.primaryListChainId,
      functionName: "mintPrimaryListNoMeta",
    },
  ];
}

async function submitTransaction(
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

export async function fetchViewerFollowState(
  viewerAddress: string | null | undefined,
  targetAddress: string | null | undefined,
): Promise<boolean> {
  const { efp } = getPirateNetworkConfig();
  const viewer = normalizeAddress(viewerAddress);
  const target = normalizeAddress(targetAddress);
  if (!viewer || !target) {
    return false;
  }

  if (viewer === target) {
    return true;
  }

  if (efp.environment === "testnet") {
    return await fetchViewerFollowStateOnChain(viewer, target);
  }

  return await fetchFollowStatus(viewer, target);
}

export async function fetchProfileFollowSummary(
  address: string | null | undefined,
): Promise<OnChainFollowSummary> {
  const { efp } = getPirateNetworkConfig();
  const target = normalizeAddress(address);
  if (!target) {
    return { followerCount: efp.environment === "testnet" ? null : 0, followingCount: 0 };
  }

  if (efp.environment === "testnet") {
    try {
      return await fetchProfileFollowSummaryOnChain(target);
    } catch {
      return { followerCount: null, followingCount: 0 };
    }
  }

  try {
    const stats = await fetchJson<ProfileStatsResponse>(`/users/${target}/stats?live=true&cache=fresh`);
    return {
      followerCount: Math.max(0, asPositiveInt(stats.followers_count)),
      followingCount: Math.max(0, asPositiveInt(stats.following_count)),
    };
  } catch {
    return { followerCount: 0, followingCount: 0 };
  }
}

export async function submitFollowAction(
  wallet: PirateConnectedEvmWallet,
  params: { followed: boolean; targetAddress: string },
): Promise<{ txHash: Address }> {
  const { efp } = getPirateNetworkConfig();
  const viewerAddress = normalizeAddress(wallet.address);
  const targetAddress = normalizeAddress(params.targetAddress);

  if (!viewerAddress) {
    throw new Error("Connected wallet is unavailable.");
  }

  if (!targetAddress) {
    throw new Error("Invalid target wallet.");
  }

  if (viewerAddress === targetAddress) {
    throw new Error("Cannot follow yourself.");
  }

  let storage: { chainId: number; slot: bigint } | undefined;
  if (efp.environment === "testnet") {
    try {
      const resolved = await resolvePrimaryListStorageForAddress(viewerAddress);
      storage = resolved ? { chainId: resolved.chainId, slot: resolved.slot } : undefined;
    } catch {
      throw new Error("Unable to load your follow list right now.");
    }
  } else {
    let primaryList: string | null = null;
    try {
      const lists = await fetchProfileLists(viewerAddress);
      primaryList = typeof lists.primary_list === "string" && lists.primary_list.trim().length > 0
        ? lists.primary_list.trim()
        : null;
    } catch {
      throw new Error("Unable to load your follow list right now.");
    }

    storage = primaryList
      ? await getListStorageLocation(primaryList)
      : undefined;
  }
  const transactions = buildFollowTransactions(
    viewerAddress,
    targetAddress,
    storage,
    params.followed,
  );

  let txHash: Address | undefined;
  for (const transaction of transactions) {
    txHash = await submitTransaction(wallet, viewerAddress, transaction);
  }

  if (!txHash) {
    throw new Error("Follow transaction was not submitted.");
  }

  return { txHash };
}
