"use client";

import type { Address, Hex } from "viem";

import { getPirateNetworkConfig } from "@/lib/network-config";

import {
  EFP_READ_TIMEOUT_MS,
  accountMetadataAbi,
  applyListOp,
  asPositiveInt,
  createEfpPublicClient,
  decodePrimaryListId,
  decodeStorageLocation,
  fetchJson,
  getPrimaryListRecordsAddress,
  isEffectiveFollow,
  listRecordsAbi,
  listRegistryAbi,
  normalizeAddress,
  type FollowStatusResponse,
  type OnChainFollowSummary,
  type OnChainListEntry,
  type ProfileListsResponse,
  type ProfileStatsResponse,
  withTimeout,
} from "./efp-shared";

export async function fetchProfileLists(address: Address): Promise<ProfileListsResponse> {
  return await fetchJson<ProfileListsResponse>(`/users/${address}/lists?cache=fresh`);
}

export async function fetchFollowStatus(
  viewerAddress: Address,
  targetAddress: Address,
): Promise<boolean> {
  const response = await fetchJson<FollowStatusResponse>(
    `/users/${viewerAddress}/${targetAddress}/buttonState?cache=fresh`,
  );

  return Boolean(response.state?.follow);
}

export async function getListStorageLocation(listId: string) {
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

export async function getPrimaryListIdForAddress(address: Address): Promise<string | null> {
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

export async function getListUser(chainId: number, slot: bigint): Promise<Address | null> {
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

export async function resolvePrimaryListStorageForAddress(
  address: Address,
): Promise<{ chainId: number; listId: string; slot: bigint } | null> {
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

export async function getAllListOps(chainId: number, slot: bigint): Promise<Hex[]> {
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

export async function buildOnChainListStateForAddress(
  address: Address,
): Promise<Map<Address, OnChainListEntry>> {
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

export async function fetchViewerFollowStateOnChain(
  viewerAddress: Address,
  targetAddress: Address,
): Promise<boolean> {
  const entries = await buildOnChainListStateForAddress(viewerAddress);
  return isEffectiveFollow(entries.get(targetAddress));
}

export async function fetchProfileFollowSummaryOnChain(
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
    const stats = await fetchJson<ProfileStatsResponse>(
      `/users/${target}/stats?live=true&cache=fresh`,
    );
    return {
      followerCount: Math.max(0, asPositiveInt(stats.followers_count)),
      followingCount: Math.max(0, asPositiveInt(stats.following_count)),
    };
  } catch {
    return { followerCount: 0, followingCount: 0 };
  }
}
