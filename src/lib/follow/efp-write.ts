"use client";

import { encodeFunctionData, type Address } from "viem";

import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { getPirateNetworkConfig } from "@/lib/network-config";
import type {
  PirateSponsoredIntent,
  PirateSponsoredIntentSender,
} from "@/lib/pirate-sponsored-intent";

import { fetchProfileLists, getListStorageLocation, resolvePrimaryListStorageForAddress } from "./efp-read";
import {
  createFollowListOp,
  createMintStorageLocation,
  generateListNonce,
  getPrimaryListRecordsAddress,
  listMinterAbi,
  listRecordsAbi,
  normalizeAddress,
  submitTransaction,
  type FollowWriteTransaction,
} from "./efp-shared";

interface SubmitFollowActionOptions {
  sendSponsoredIntent?: PirateSponsoredIntentSender | null;
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

function isEmbeddedPrivyWallet(wallet: PirateConnectedEvmWallet): boolean {
  return wallet.walletClientType === "privy" || wallet.walletClientType === "privy-v2";
}

function resolveFollowTransactionSlot(transaction: FollowWriteTransaction): bigint {
  if (
    transaction.functionName === "applyListOps" ||
    transaction.functionName === "setMetadataValuesAndApplyListOps"
  ) {
    return transaction.args[0] as bigint;
  }

  const storageLocation = transaction.args[0] as `0x${string}`;
  return BigInt(`0x${storageLocation.slice(-64)}`);
}

function buildSponsoredFollowIntent(
  transaction: FollowWriteTransaction,
  targetAddress: Address,
  followed: boolean,
): PirateSponsoredIntent {
  const slot = resolveFollowTransactionSlot(transaction).toString();

  switch (transaction.functionName) {
    case "applyListOps":
      return {
        type: "pirate.follow.apply",
        followed,
        slot,
        targetAddress,
      };
    case "setMetadataValuesAndApplyListOps":
      return {
        type: "pirate.follow.create-list-records",
        followed,
        slot,
        targetAddress,
      };
    case "mintPrimaryListNoMeta":
      return {
        type: "pirate.follow.mint-primary-list",
        slot,
      };
  }
}

async function submitSponsoredTransaction(
  wallet: PirateConnectedEvmWallet,
  viewerAddress: Address,
  targetAddress: Address,
  followed: boolean,
  transaction: FollowWriteTransaction,
  sendSponsoredIntent: PirateSponsoredIntentSender,
): Promise<Address> {
  const { efp } = getPirateNetworkConfig();
  if (transaction.chainId !== efp.primaryListChainId) {
    throw new Error("Sponsored follows only support primary-chain EFP lists.");
  }

  return await sendSponsoredIntent({
    chainId: transaction.chainId,
    intent: buildSponsoredFollowIntent(transaction, targetAddress, followed),
    transaction: {
      data: encodeFunctionData({
        abi: transaction.abi,
        args: transaction.args,
        functionName: transaction.functionName,
      } as never),
      to: transaction.address,
    },
    ...(wallet.id ? { privyWalletId: wallet.id } : {}),
    walletAddress: viewerAddress,
  });
}

export async function submitFollowAction(
  wallet: PirateConnectedEvmWallet,
  params: { followed: boolean; targetAddress: string },
  options?: SubmitFollowActionOptions,
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
      primaryList =
        typeof lists.primary_list === "string" && lists.primary_list.trim().length > 0
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
    if (options?.sendSponsoredIntent && isEmbeddedPrivyWallet(wallet)) {
      txHash = await submitSponsoredTransaction(
        wallet,
        viewerAddress,
        targetAddress,
        params.followed,
        transaction,
        options.sendSponsoredIntent,
      );
      continue;
    }

    txHash = await submitTransaction(wallet, viewerAddress, transaction);
  }

  if (!txHash) {
    throw new Error("Follow transaction was not submitted.");
  }

  return { txHash };
}
