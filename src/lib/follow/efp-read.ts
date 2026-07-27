"use client";

import type { Address, Hex } from "viem";

import { getPirateNetworkConfig } from "@/lib/network-config";

import {
  accountMetadataAbi,
  createEfpPublicClient,
  decodePrimaryListId,
  decodeStorageLocation,
  listRecordsAbi,
  listRegistryAbi,
  normalizeAddress,
} from "./efp-shared";

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
