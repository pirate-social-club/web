"use client";

import type { AssetAccessResponse } from "@pirate/api-contracts";
import { secp256k1 } from "@noble/curves/secp256k1";
import { createPublicClient, createWalletClient, custom, defineChain, http } from "viem";

import { resolveApiUrl } from "@/lib/api/base-url";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";

import { initWasm } from "./vendor/piplabs/crypto/index.js";
import { CDRClient } from "./vendor/piplabs/sdk/client.js";

type StoryCdrAccessPackage = NonNullable<AssetAccessResponse["story_cdr_access"]>;
const CDR_REQUESTER_KEY_STORAGE_PREFIX = "pirate:story-cdr-requester-key:v1";

function decodeBase64(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = globalThis.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function resolveStoryNetwork(chainId: number): "mainnet" | "testnet" {
  if (chainId === 1514) {
    return "mainnet";
  }
  if (chainId === 1315) {
    return "testnet";
  }
  throw new Error(`Unsupported Story chain (${chainId}).`);
}

function resolveStoryChain(access: StoryCdrAccessPackage) {
  return defineChain({
    id: access.chain_id,
    name: access.chain_id === 1514 ? "Story Mainnet" : "Story Aeneid",
    nativeCurrency: {
      decimals: 18,
      name: "IP",
      symbol: "IP",
    },
    network: access.chain_id === 1514 ? "story-mainnet" : "story-aeneid",
    rpcUrls: {
      default: {
        http: [access.rpc_url],
      },
      public: {
        http: [access.rpc_url],
      },
    },
  });
}

function cloneBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

function bytesToHex(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function decodeHex(value: string): Uint8Array {
  const normalized = value.startsWith("0x") ? value.slice(2) : value;
  if (!/^[0-9a-f]*$/i.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error("Malformed Story requester key.");
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
}

function resolveRequesterStorageKey(params: {
  walletAddress: string;
  chainId: number;
  vaultUuid: number;
}): string {
  return [
    CDR_REQUESTER_KEY_STORAGE_PREFIX,
    params.chainId,
    params.walletAddress.toLowerCase(),
    params.vaultUuid,
  ].join(":");
}

function resolveStableRequesterKey(params: {
  walletAddress: string;
  chainId: number;
  vaultUuid: number;
}): {
  requesterPubKey: `0x${string}`;
  recipientPrivKey: Uint8Array;
} {
  const storageKey = resolveRequesterStorageKey(params);
  const existing = globalThis.localStorage.getItem(storageKey);
  let privateKey: Uint8Array;
  if (existing) {
    privateKey = decodeHex(existing);
  } else {
    privateKey = secp256k1.utils.randomPrivateKey();
    globalThis.localStorage.setItem(storageKey, bytesToHex(privateKey));
  }
  const requesterPubKey = bytesToHex(secp256k1.getPublicKey(privateKey, false));
  return {
    requesterPubKey,
    recipientPrivKey: cloneBytes(privateKey),
  };
}

async function decryptAesGcm(params: {
  ciphertext: Uint8Array;
  dataKey: Uint8Array;
  iv: Uint8Array;
}): Promise<Uint8Array> {
  const dataKey = cloneBytes(params.dataKey);
  const iv = cloneBytes(params.iv);
  const ciphertext = cloneBytes(params.ciphertext);
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw",
    dataKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const plaintext = await globalThis.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    cryptoKey,
    ciphertext,
  );
  return new Uint8Array(plaintext);
}

async function fetchCiphertext(
  ciphertextRef: string,
  accessToken: string | null,
): Promise<Uint8Array> {
  const response = await fetch(resolveApiUrl(ciphertextRef), {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  if (!response.ok) {
    throw new Error("Could not load the encrypted song.");
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function readStoryCdrAsset(params: {
  access: StoryCdrAccessPackage;
  accessToken: string | null;
  wallet: PirateConnectedEvmWallet;
}): Promise<Blob> {
  const { access, accessToken, wallet } = params;
  const accessAuxDataHex = access.access_aux_data_hex;
  if (!accessAuxDataHex?.startsWith("0x")) {
    throw new Error("Story CDR access payload is malformed.");
  }
  if (!access.cipher_algorithm.toUpperCase().includes("GCM")) {
    throw new Error(`Unsupported Story cipher (${access.cipher_algorithm}).`);
  }

  const chain = resolveStoryChain(access);
  await wallet.switchChain(access.chain_id);

  const provider = await wallet.getEthereumProvider();
  const walletClient = createWalletClient({
    account: wallet.address,
    chain,
    transport: custom(provider as never),
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(access.rpc_url),
  });

  await initWasm();

  const client = new CDRClient({
    network: resolveStoryNetwork(access.chain_id),
    publicClient,
    walletClient,
  });
  const requesterKey = resolveStableRequesterKey({
    walletAddress: wallet.address,
    chainId: access.chain_id,
    vaultUuid: access.vault_uuid,
  });
  const { dataKey } = await client.consumer.accessCDR({
    uuid: access.vault_uuid,
    accessAuxData: accessAuxDataHex as `0x${string}`,
    requesterPubKey: requesterKey.requesterPubKey,
    recipientPrivKey: requesterKey.recipientPrivKey,
  });

  const ciphertext = await fetchCiphertext(access.ciphertext_ref, accessToken);
  const plaintext = await decryptAesGcm({
    ciphertext,
    dataKey,
    iv: decodeBase64(access.cipher_iv_b64),
  });

  return new Blob([cloneBytes(plaintext)], {
    type: access.mime_type,
  });
}
