"use client";

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hex,
} from "viem";
import { base, mainnet, optimism } from "viem/chains";

import type { PreparedProfileFollowWrite } from "@/lib/api/client-groups-public";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { getPirateNetworkConfig } from "@/lib/network-config";
import type {
  PirateSponsoredIntent,
  PirateSponsoredIntentSender,
} from "@/lib/pirate-sponsored-intent";

interface SubmitFollowActionOptions {
  prepared: PreparedProfileFollowWrite;
  sendSponsoredIntent?: PirateSponsoredIntentSender | null;
}

function isEmbeddedPrivyWallet(wallet: PirateConnectedEvmWallet): boolean {
  return wallet.walletClientType === "privy" || wallet.walletClientType === "privy-v2";
}

function chainForId(chainId: number) {
  if (chainId === base.id) return base;
  if (chainId === optimism.id) return optimism;
  if (chainId === mainnet.id) return mainnet;
  throw new Error(`Unsupported EFP chain (${chainId}).`);
}

async function submitUserPaidTransaction(
  wallet: PirateConnectedEvmWallet,
  viewerAddress: Address,
  transaction: { chain_id: number; data: Hex; to: Address },
): Promise<Address> {
  const chain = chainForId(transaction.chain_id);
  await wallet.switchChain(transaction.chain_id);
  const provider = await wallet.getEthereumProvider();
  const walletClient = createWalletClient({
    account: viewerAddress,
    chain,
    transport: custom(provider as never),
  });
  const hash = await walletClient.sendTransaction({
    account: viewerAddress,
    chain,
    data: transaction.data,
    to: transaction.to,
  });
  const rpcUrl = getPirateNetworkConfig().efp.rpcUrlsByChainId[transaction.chain_id]
    ?? chain.rpcUrls.default.http[0];
  const receipt = await createPublicClient({
    chain,
    transport: http(rpcUrl),
  }).waitForTransactionReceipt({ hash, timeout: 90_000 });
  if (receipt.status !== "success") throw new Error("EFP transaction reverted on-chain.");
  return hash;
}

function relayIntent(
  transactionIndex: number,
  transactionCount: number,
  followed: boolean,
  targetAddress: Address,
): PirateSponsoredIntent {
  if (transactionCount === 2 && transactionIndex === 1) {
    return { type: "pirate.follow.mint-primary-list", slot: "server-prepared" };
  }
  return {
    type: transactionCount === 2
      ? "pirate.follow.create-list-records"
      : "pirate.follow.apply",
    followed,
    slot: "server-prepared",
    targetAddress,
  };
}

export async function submitFollowAction(
  wallet: PirateConnectedEvmWallet,
  params: { followed: boolean; targetAddress: string },
  options: SubmitFollowActionOptions,
): Promise<{
  txHash: Address;
  consistency: "already_reflected" | "accepted_not_yet_reflected";
  transactionHashes: `0x${string}`[];
  needsConfirmation: boolean;
}> {
  if (options.prepared.consistency.status === "already_reflected") {
    return {
      txHash: "0x0000000000000000000000000000000000000000",
      consistency: "already_reflected",
      transactionHashes: [],
      needsConfirmation: false,
    };
  }
  const viewerAddress = wallet.address.toLowerCase() as Address;
  const targetAddress = params.targetAddress.toLowerCase() as Address;
  let txHash: Address | undefined;
  const transactionHashes: `0x${string}`[] = [];
  let needsConfirmation = false;

  for (const [localIndex, transaction] of options.prepared.transactions.entries()) {
    const transactionIndex = options.prepared.transaction_index_offset + localIndex;
    if (
      options.prepared.sponsorship.eligible
      && options.prepared.intent_id
      && options.sendSponsoredIntent
      && isEmbeddedPrivyWallet(wallet)
      && transaction.chain_id === base.id
    ) {
      txHash = await options.sendSponsoredIntent({
        chainId: transaction.chain_id,
        intentId: options.prepared.intent_id,
        transactionIndex,
        intent: relayIntent(
          transactionIndex,
          options.prepared.prepared_transaction_count,
          params.followed,
          targetAddress,
        ),
        transaction: { data: transaction.data, to: transaction.to },
        ...(wallet.id ? { privyWalletId: wallet.id } : {}),
        walletAddress: viewerAddress,
      });
    } else {
      txHash = await submitUserPaidTransaction(wallet, viewerAddress, transaction);
      needsConfirmation = true;
    }
    transactionHashes.push(txHash as `0x${string}`);
  }
  if (!txHash) throw new Error("Follow transaction was not submitted.");
  return {
    txHash,
    consistency: "accepted_not_yet_reflected",
    transactionHashes,
    needsConfirmation,
  };
}

export const __testOnly = { isEmbeddedPrivyWallet, relayIntent };
