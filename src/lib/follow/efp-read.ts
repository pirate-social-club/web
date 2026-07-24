"use client";

import type { Address, Hex } from "viem";

import { getPirateNetworkConfig } from "@/lib/network-config";

import {
  accountMetadataAbi,
  applyListOp,
  asNonNegativeIntOrNull,
  createEfpPublicClient,
  decodePrimaryListId,
  decodeStorageLocation,
  fetchJson,
  isEffectiveFollow,
  listRecordsAbi,
  listRegistryAbi,
  normalizeAddress,
  type FollowRelationshipResponse,
  type OnChainFollowSummary,
  type OnChainListEntry,
  type ProfileStatsResponse,
} from "./efp-shared";

async function fetchFollowStatus(
  viewerAddress: Address,
  targetAddress: Address,
): Promise<boolean> {
  const response = await fetchJson<FollowRelationshipResponse>(
    `/users/${viewerAddress}/${targetAddress}/relationship?cache=fresh`,
  );

  if (typeof response.state?.is_following !== "boolean") {
    throw new Error("EFP relationship response is missing follow state.");
  }

  return response.state.is_following;
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

async function getPrimaryListIdForAddress(
  address: Address,
): Promise<{ kind: "none" } | { kind: "found"; listId: string } | { kind: "unresolved" }> {
  const { efp } = getPirateNetworkConfig();
  const client = createEfpPublicClient(efp.primaryListChainId);
  const encoded = await client.readContract({
    address: efp.accountMetadata,
    abi: accountMetadataAbi,
    functionName: "getValue",
    args: [address, "primary-list"],
  });

  if (!encoded || encoded === "0x") {
    return { kind: "none" };
  }

  const listId = decodePrimaryListId(encoded as Hex);
  return listId ? { kind: "found", listId } : { kind: "unresolved" };
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

export type PrimaryListStorageResolution =
  | { kind: "none" }
  | { kind: "found"; chainId: number; listId: string; slot: bigint }
  | { kind: "unresolved" };

export async function resolvePrimaryListStorageForAddress(
  address: Address,
): Promise<PrimaryListStorageResolution> {
  const primaryList = await getPrimaryListIdForAddress(address);
  if (primaryList.kind !== "found") {
    return primaryList;
  }

  const storage = await getListStorageLocation(primaryList.listId);
  const listUser = await getListUser(storage.chainId, storage.slot);
  if (!listUser || listUser !== address) {
    return { kind: "unresolved" };
  }

  return {
    kind: "found",
    chainId: storage.chainId,
    listId: primaryList.listId,
    slot: storage.slot,
  };
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

async function buildOnChainListStateForAddress(
  address: Address,
): Promise<Map<Address, OnChainListEntry>> {
  const storage = await resolvePrimaryListStorageForAddress(address);
  if (storage.kind === "none") {
    return new Map();
  }
  if (storage.kind === "unresolved") {
    throw new Error("Unable to resolve EFP primary-list storage.");
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

export async function fetchViewerFollowState(
  viewerAddress: string | null | undefined,
  targetAddress: string | null | undefined,
): Promise<boolean | null> {
  const { efp } = getPirateNetworkConfig();
  const viewer = normalizeAddress(viewerAddress);
  const target = normalizeAddress(targetAddress);
  if (!viewer || !target) {
    return null;
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
    return { followerCount: null, followingCount: null };
  }

  if (efp.environment === "testnet") {
    try {
      return await fetchProfileFollowSummaryOnChain(target);
    } catch {
      return { followerCount: null, followingCount: null };
    }
  }

  try {
    const stats = await fetchJson<ProfileStatsResponse>(
      `/users/${target}/stats?live=true&cache=fresh`,
    );
    const followerCount = asNonNegativeIntOrNull(stats.followers_count);
    const followingCount = asNonNegativeIntOrNull(stats.following_count);
    if (followerCount === null || followingCount === null) {
      return { followerCount: null, followingCount: null };
    }

    return {
      followerCount,
      followingCount,
    };
  } catch {
    return { followerCount: null, followingCount: null };
  }
}
