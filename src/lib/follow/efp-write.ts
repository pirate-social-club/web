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
  buildFollowTransactions as buildSharedFollowTransactions,
  buildSponsoredFollowIntent,
  normalizeAddress,
  submitTransaction,
  type FollowWriteTransaction,
} from "./efp-shared";

interface SubmitFollowActionOptions {
  sendSponsoredIntent?: PirateSponsoredIntentSender | null;
}

type EfpConfig = ReturnType<typeof getPirateNetworkConfig>["efp"];

function getPrimaryListRecordsAddress(efp: EfpConfig): Address {
  const recordsAddress = efp.listRecordsByChain[efp.primaryListChainId];
  if (!recordsAddress) {
    throw new Error(`Missing EFP list-records deployment for chain ${efp.primaryListChainId}.`);
  }

  return recordsAddress;
}

function buildFollowTransactions(
  viewerAddress: Address,
  targetAddress: Address,
  existingStorage: { chainId: number; slot: bigint } | undefined,
  followed: boolean,
  efp = getPirateNetworkConfig().efp,
): FollowWriteTransaction[] {
  return buildSharedFollowTransactions({
    existingStorage,
    followed,
    listMinter: efp.listMinter,
    listRecordsAddress: getPrimaryListRecordsAddress(efp),
    listRecordsByChain: efp.listRecordsByChain,
    primaryListChainId: efp.primaryListChainId,
    targetAddress,
    viewerAddress,
  });
}

function isEmbeddedPrivyWallet(wallet: PirateConnectedEvmWallet): boolean {
  return wallet.walletClientType === "privy" || wallet.walletClientType === "privy-v2";
}

function canSponsorFollowTransaction(transaction: FollowWriteTransaction, efp = getPirateNetworkConfig().efp): boolean {
  return efp.environment === "testnet" && transaction.chainId === efp.primaryListChainId;
}

async function submitSponsoredTransaction(
  wallet: PirateConnectedEvmWallet,
  viewerAddress: Address,
  targetAddress: Address,
  followed: boolean,
  transaction: FollowWriteTransaction,
  sendSponsoredIntent: PirateSponsoredIntentSender,
): Promise<Address> {
  if (!canSponsorFollowTransaction(transaction)) {
    throw new Error("Sponsored follows only support primary-chain EFP lists.");
  }

  return await sendSponsoredIntent({
    chainId: transaction.chainId,
    intent: buildSponsoredFollowIntent(transaction, targetAddress, followed) as PirateSponsoredIntent,
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
    if (
      options?.sendSponsoredIntent
      && isEmbeddedPrivyWallet(wallet)
      && canSponsorFollowTransaction(transaction)
    ) {
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

export const __testOnly = {
  buildFollowTransactions,
  buildSponsoredFollowIntent,
  canSponsorFollowTransaction,
  isEmbeddedPrivyWallet,
};
