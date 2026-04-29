import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { secp256k1 } from "@noble/curves/secp256k1";
import { createPublicClient, createWalletClient, defineChain, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { toBytes, toHex } from "viem";

import { readDevVars, readWranglerVars } from "../../api/services/api/scripts/_lib/dev-vars";
import { fetchSongArtifactBytes } from "../../api/services/api/src/lib/song-artifacts/song-artifact-storage";
import type { Env } from "../../api/services/api/src/types";
import { initWasm } from "../src/vendor/piplabs/crypto";
import { cdrAbi, contractAddresses } from "../src/vendor/piplabs/contracts";
import { CDRClient } from "../src/vendor/piplabs/sdk/client";
import { uuidToLabel } from "../src/vendor/piplabs/sdk/label";
import { decodeBase64 } from "./_lib/base64";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const API_SERVICE_ROOT = [
  process.env.PIRATE_API_DIR,
  resolve(scriptDir, "../../api/services/api"),
  ].find((candidate) => candidate && existsSync(candidate));
if (!API_SERVICE_ROOT) {
  throw new Error("Could not locate Pirate API checkout. Set PIRATE_API_DIR.");
}
const API_SERVICE_ROOT_RESOLVED: string = API_SERVICE_ROOT;

function readFlag(flagName: string): string | null {
  const prefix = `${flagName}=`;
  const raw = process.argv.slice(2).find((value) => value.startsWith(prefix));
  if (!raw) return null;
  const value = raw.slice(prefix.length).trim();
  return value || null;
}

function requireFlag(flagName: string): string {
  const value = readFlag(flagName);
  if (!value) {
    throw new Error(`Missing ${flagName}`);
  }
  return value;
}

function parsePositiveInteger(flagName: string): number {
  const raw = requireFlag(flagName);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flagName}: ${raw}`);
  }
  return parsed;
}

function createStoryChain(chainId: number, rpcUrl: string) {
  return defineChain({
    id: chainId,
    name: chainId === 1514 ? "Story Mainnet" : "Story Aeneid",
    nativeCurrency: {
      name: "IP",
      symbol: "IP",
      decimals: 18,
    },
    network: chainId === 1514 ? "story-mainnet" : "story-aeneid",
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
  });
}

async function deriveStableRequesterPrivateKey(params: {
  buyerPrivateKey: string;
  vaultUuid: number;
  chainId: number;
}): Promise<Uint8Array> {
  const normalizedBuyerKey = params.buyerPrivateKey.startsWith("0x")
    ? params.buyerPrivateKey.toLowerCase()
    : `0x${params.buyerPrivateKey.toLowerCase()}`;
  const seed = new TextEncoder().encode([
    "pirate-story-cdr-requester-v1",
    params.chainId,
    params.vaultUuid,
    normalizedBuyerKey,
  ].join(":"));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", seed));
  if (!secp256k1.utils.isValidPrivateKey(digest)) {
    digest[digest.length - 1] = digest[digest.length - 1] ^ 1;
  }
  if (!secp256k1.utils.isValidPrivateKey(digest)) {
    throw new Error("Could not derive a valid requester private key.");
  }
  return digest;
}

async function main(): Promise<void> {
  const vaultUuid = parsePositiveInteger("--vault-uuid");
  const objectKey = requireFlag("--ciphertext-object-key");
  const buyerPrivateKey = requireFlag("--buyer-private-key");
  const chainId = Number(readFlag("--chain-id") || "1315");
  const rpcUrl = readFlag("--rpc-url") || "https://aeneid.storyrpc.io";
  const expectedPlaintextLengthRaw = readFlag("--expected-plaintext-length");
  const expectedPlaintextLength = expectedPlaintextLengthRaw ? Number(expectedPlaintextLengthRaw) : null;
  const cipherIvB64 = readFlag("--cipher-iv-b64");
  const collectOnly = readFlag("--collect-only") === "true";
  const fromBlockRaw = readFlag("--from-block");

  const env = {
    ...readWranglerVars(resolve(API_SERVICE_ROOT_RESOLVED, "wrangler.jsonc"), "development"),
    ...readDevVars(resolve(API_SERVICE_ROOT_RESOLVED, ".dev.vars")),
    ...process.env,
  } as Env;

  const ciphertextResponse = await fetchSongArtifactBytes({
    env,
    objectKey,
  });
  const ciphertext = new Uint8Array(await ciphertextResponse.arrayBuffer());

  await initWasm();

  const chain = createStoryChain(chainId, rpcUrl);
  const account = privateKeyToAccount((buyerPrivateKey.startsWith("0x") ? buyerPrivateKey : `0x${buyerPrivateKey}`) as Hex);
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  const client = new CDRClient({
    network: chainId === 1514 ? "mainnet" : "testnet",
    publicClient,
    walletClient,
  });

  const requesterPrivateKey = readFlag("--requester-private-key-hex")
    ? toBytes(readFlag("--requester-private-key-hex") as Hex)
    : await deriveStableRequesterPrivateKey({
        buyerPrivateKey,
        vaultUuid,
        chainId,
      });
  const requesterPublicKey = toHex(secp256k1.getPublicKey(requesterPrivateKey, false));

  let txHash: Hex | null = null;
  let fromBlock: bigint;
  if (collectOnly) {
    if (!fromBlockRaw) {
      throw new Error("--from-block is required when --collect-only=true");
    }
    fromBlock = BigInt(fromBlockRaw);
  } else {
    fromBlock = await publicClient.getBlockNumber();
    const readResult = await client.consumer.read({
      uuid: vaultUuid,
      accessAuxData: "0x",
      requesterPubKey: requesterPublicKey,
    });
    txHash = readResult.txHash;
    console.log(JSON.stringify({
      phase: "read_submitted",
      vaultUuid,
      buyerAddress: account.address,
      requesterPrivateKeyHex: toHex(requesterPrivateKey),
      requesterPublicKey,
      fromBlock: fromBlock.toString(),
      txHash,
    }, null, 2));
  }

  const [globalPubKey, threshold, vault] = await Promise.all([
    client.observer.getGlobalPubKey(),
    client.observer.getThreshold(),
    publicClient.readContract({
      address: contractAddresses[chainId === 1514 ? "mainnet" : "testnet"].cdr,
      abi: cdrAbi,
      functionName: "vaults",
      args: [vaultUuid],
    }),
  ]);
  const partials = await client.consumer.collectPartials({
    uuid: vaultUuid,
    minPartials: threshold,
    fromBlock,
    requesterPubKey: requesterPublicKey,
  });
  const dataKey = await client.consumer.decryptDataKey({
    ciphertext: {
      raw: toBytes((vault as { encryptedData: Hex }).encryptedData),
      label: uuidToLabel(vaultUuid),
    },
    partials,
    recipientPrivKey: requesterPrivateKey,
    globalPubKey,
    label: uuidToLabel(vaultUuid),
    threshold,
  });

  console.log(JSON.stringify({
    phase: "tdh2_combine_ok",
    vaultUuid,
    ciphertextObjectKey: objectKey,
    buyerAddress: account.address,
    ciphertextBytes: ciphertext.byteLength,
    dataKeyBytes: dataKey.byteLength,
    partialCount: partials.length,
    threshold,
    txHash,
    requesterPrivateKeyHex: toHex(requesterPrivateKey),
    requesterPublicKey,
    fromBlock: fromBlock.toString(),
  }, null, 2));

  if (!cipherIvB64) {
    console.log(JSON.stringify({
      phase: "aes_decrypt_skipped",
      reason: "cipher IV was not provided",
      hint: "Provide --cipher-iv-b64 from locked_delivery_secret_json or story_cdr_access.cipher_iv_b64",
    }, null, 2));
    return;
  }

  const iv = decodeBase64(cipherIvB64);
  const encrypted = ciphertext;
  try {
    const decryptKey = await crypto.subtle.importKey(
      "raw",
      new Uint8Array(dataKey),
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );
    const plaintext = new Uint8Array(await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      decryptKey,
      new Uint8Array(encrypted),
    ));
    console.log(JSON.stringify({
      phase: "aes_decrypt_ok",
      plaintextBytes: plaintext.byteLength,
      expectedPlaintextLength,
      plaintextLengthMatchesExpected: expectedPlaintextLength === null
        ? null
        : plaintext.byteLength === expectedPlaintextLength,
    }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({
      phase: "aes_decrypt_failed",
      reason: error instanceof Error ? error.message : String(error),
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
