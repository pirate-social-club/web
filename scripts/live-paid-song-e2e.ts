import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Agent } from "undici";

import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, createWalletClient, defineChain, http, parseEther, type Hex } from "viem";
import { secp256k1 } from "@noble/curves/secp256k1";

import { CDRClient } from "../src/lib/story/vendor/piplabs/sdk/client";
import { initWasm } from "../src/lib/story/vendor/piplabs/crypto";
import { uuidToLabel } from "../src/lib/story/vendor/piplabs/sdk/label";
import { toBytes, toHex } from "viem";
import { cdrAbi, contractAddresses } from "../src/lib/story/vendor/piplabs/contracts";
import { decodeBase64 } from "./_lib/base64";

const execFileAsync = promisify(execFile);

const API_BASE = "http://127.0.0.1:8787";
const API_CWD = "/home/t42/Documents/pirate-v2/pirate-api/services/api";
const SELLER_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945382dbd5666b7e51f3d8d9a0c1f1e8f2a3b4" as Hex;
const BUYER_PRIVATE_KEY = "0x8b3a350cf5c34c9194ca3a545d8b3b77d6c7b94d1d13d0d9f5e6f7a8b9c0d1e2" as Hex;
const STORY_RUNTIME_PRIVATE_KEY = process.env.STORY_RUNTIME_PRIVATE_KEY?.trim()
  ? (process.env.STORY_RUNTIME_PRIVATE_KEY.startsWith("0x")
    ? process.env.STORY_RUNTIME_PRIVATE_KEY
    : `0x${process.env.STORY_RUNTIME_PRIVATE_KEY}`) as Hex
  : null;
const OWNER_PRIVATE_KEY = process.env.STORY_CONTRACT_OWNER_PRIVATE_KEY?.trim()
  ? (process.env.STORY_CONTRACT_OWNER_PRIVATE_KEY.startsWith("0x")
    ? process.env.STORY_CONTRACT_OWNER_PRIVATE_KEY
    : `0x${process.env.STORY_CONTRACT_OWNER_PRIVATE_KEY}`) as Hex
  : null;
const CDR_CONTRACT_ADDRESS = "0xcccccc0000000000000000000000000000000005" as Hex;
const CDR_READ_GAS_MARGIN_WEI = parseEther("0.01");
const PREVIEW_POLL_INTERVAL_MS = 2_000;
const PREVIEW_POLL_ATTEMPTS = 30;
const HTTP_AGENT = new Agent({
  headersTimeout: 10 * 60 * 1_000,
  bodyTimeout: 10 * 60 * 1_000,
});

function step(label: string): void {
  console.error(`[live-paid-song-e2e] ${label}`);
}

function makeSyntheticWavBytes(durationSeconds = 2): Uint8Array {
  const sampleRate = 8000;
  const channelCount = 1;
  const bytesPerSample = 2;
  const sampleCount = sampleRate * durationSeconds;
  const dataSize = sampleCount * channelCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  return new Uint8Array(buffer);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mintUpstreamJwt(sub: string, walletAddress: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "rtk",
    [
      "bun",
      "run",
      "scripts/mint-dev-jwt.ts",
      "--",
      "--sub",
      sub,
      "--wallet",
      walletAddress,
    ],
    {
      cwd: API_CWD,
      env: process.env,
    },
  );
  const token = stdout.trim();
  if (!token) {
    throw new Error("mint-dev-jwt returned an empty token");
  }
  return token;
}

async function ensureLocalPrimaryWalletAttachment(input: {
  userId: string;
  walletAddress: string;
}): Promise<string> {
  const { stdout } = await execFileAsync("rtk", [
    "infisical",
    "run",
    "--env=dev",
    "--path=/services/api",
    "--",
    "rtk",
    "bun",
    "run",
    "--cwd",
    API_CWD,
    "scripts/ensure-dev-primary-wallet-attachment.ts",
    "--",
    `--user-id=${input.userId}`,
    `--wallet-address=${input.walletAddress}`,
  ], {
    cwd: "/home/t42/Documents/pirate-v2",
    env: process.env,
  });
  const walletAttachmentId = stdout.trim();
  if (!walletAttachmentId) {
    throw new Error("ensure-dev-primary-wallet-attachment returned empty output");
  }
  return walletAttachmentId;
}

async function request(
  path: string,
  input?: {
    token?: string;
    method?: string;
    json?: unknown;
    bytes?: Uint8Array;
    contentType?: string;
  },
): Promise<Response> {
  const headers = new Headers();
  if (input?.token) {
    headers.set("authorization", `Bearer ${input.token}`);
  }
  if (input?.json !== undefined) {
    headers.set("content-type", "application/json");
  } else if (input?.contentType) {
    headers.set("content-type", input.contentType);
  }

  return await fetch(`${API_BASE}${path}`, {
    method: input?.method ?? (input?.json !== undefined || input?.bytes ? "POST" : "GET"),
    headers,
    dispatcher: HTTP_AGENT,
    body: input?.json !== undefined
      ? JSON.stringify(input.json)
      : input?.bytes
        ? input.bytes
        : undefined,
  });
}

async function expectOkJson<T>(
  path: string,
  input?: {
    token?: string;
    method?: string;
    json?: unknown;
    bytes?: Uint8Array;
    contentType?: string;
  },
): Promise<T> {
  const response = await request(path, input);
  if (!response.ok) {
    throw new Error(`${input?.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  }
  return await response.json() as T;
}

async function expectOkBytes(
  path: string,
  input?: {
    token?: string;
    method?: string;
    json?: unknown;
    bytes?: Uint8Array;
    contentType?: string;
  },
): Promise<{ bytes: Uint8Array; response: Response }> {
  const response = await request(path, input);
  if (!response.ok) {
    throw new Error(`${input?.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  }
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    response,
  };
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

async function ensureWalletFunds(input: {
  label: string;
  address: Hex;
  chain: ReturnType<typeof createStoryChain>;
  rpcUrl: string;
  minimumBalanceWei: bigint;
  targetBalanceWei: bigint;
}): Promise<void> {
  const publicClient = createPublicClient({
    chain: input.chain,
    transport: http(input.rpcUrl),
  });
  const balance = await publicClient.getBalance({
    address: input.address,
  });
  if (balance >= input.minimumBalanceWei) {
    return;
  }
  const funderPrivateKey = STORY_RUNTIME_PRIVATE_KEY ?? OWNER_PRIVATE_KEY;
  if (!funderPrivateKey) {
    throw new Error(`${input.label} wallet ${input.address} is underfunded for CDR reads and no runtime/owner funder key is available for auto-funding`);
  }

  const funderAccount = privateKeyToAccount(funderPrivateKey);
  const funderClient = createWalletClient({
    account: funderAccount,
    chain: input.chain,
    transport: http(input.rpcUrl),
  });
  const transferValue = input.targetBalanceWei > balance
    ? input.targetBalanceWei - balance
    : input.minimumBalanceWei;

  step(`fund ${input.label} wallet for CDR read`);
  const txHash = await funderClient.sendTransaction({
    to: input.address,
    value: transferValue,
    chain: input.chain,
    account: funderAccount,
  });
  await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
}

async function readCdrReadFeeWei(input: {
  chain: ReturnType<typeof createStoryChain>;
  rpcUrl: string;
}): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: input.chain,
    transport: http(input.rpcUrl),
  });
  return await publicClient.readContract({
    address: CDR_CONTRACT_ADDRESS,
    abi: [
      {
        type: "function",
        name: "readFee",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "readFee",
  });
}

async function exchangeSession(sub: string, privateKey: Hex): Promise<{
  accessToken: string;
  userId: string;
  walletAddress: string;
  primaryWalletAttachmentId: string | null;
}> {
  const account = privateKeyToAccount(privateKey);
  const jwt = await mintUpstreamJwt(sub, account.address);
  const body = await expectOkJson<{
    access_token: string;
    user: {
      user_id: string;
      primary_wallet_attachment_id?: string | null;
    };
    wallet_attachments?: Array<{
      wallet_attachment_id: string;
      is_primary?: boolean | null;
    }>;
  }>("/auth/session/exchange", {
    json: {
      proof: {
        type: "jwt_based_auth",
        jwt,
      },
    },
  });

  const primaryWalletAttachmentId = body.user.primary_wallet_attachment_id
    ?? body.wallet_attachments?.find((attachment) => attachment.is_primary)?.wallet_attachment_id
    ?? body.wallet_attachments?.[0]?.wallet_attachment_id
    ?? null;

  return {
    accessToken: body.access_token,
    userId: body.user.user_id,
    walletAddress: account.address,
    primaryWalletAttachmentId,
  };
}

async function completeVerification(accessToken: string): Promise<void> {
  const created = await expectOkJson<{ verification_session_id: string }>("/verification-sessions", {
    token: accessToken,
    json: { provider: "self" },
  });
  await expectOkJson(`/verification-sessions/${created.verification_session_id}/complete`, {
    token: accessToken,
    json: {},
  });
}

async function createUpload(
  communityId: string,
  accessToken: string,
  body: {
    artifact_kind: string;
    mime_type: string;
    filename: string;
    size_bytes: number;
  },
): Promise<{ song_artifact_upload_id: string; storage_ref: string }> {
  return await expectOkJson(`/communities/${communityId}/song-artifact-uploads`, {
    token: accessToken,
    json: body,
  });
}

async function waitForPreviewReady(
  communityId: string,
  bundleId: string,
  token: string,
): Promise<void> {
  for (let attempt = 0; attempt <= PREVIEW_POLL_ATTEMPTS; attempt += 1) {
    const bundle = await expectOkJson<{
      preview_status: "pending" | "completed" | "failed";
      preview_error?: string | null;
      preview_audio?: { storage_ref?: string | null } | null;
    }>(`/communities/${communityId}/song-artifacts/${bundleId}`, {
      token,
    });

    if (bundle.preview_status === "completed" && bundle.preview_audio?.storage_ref) {
      return;
    }
    if (bundle.preview_status === "failed") {
      throw new Error(`Song preview generation failed: ${bundle.preview_error || "unknown error"}`);
    }
    if (attempt < PREVIEW_POLL_ATTEMPTS) {
      await sleep(PREVIEW_POLL_INTERVAL_MS);
    }
  }
  throw new Error("Song preview generation timed out after 60 seconds");
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let index = 0; index < a.byteLength; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

async function main(): Promise<void> {
  step("exchange seller session");
  const seller = await exchangeSession(`seller-${Date.now()}`, SELLER_PRIVATE_KEY);
  step("exchange buyer session");
  const buyer = await exchangeSession(`buyer-${Date.now()}`, BUYER_PRIVATE_KEY);
  step("ensure local wallet attachments");
  seller.primaryWalletAttachmentId = await ensureLocalPrimaryWalletAttachment({
    userId: seller.userId,
    walletAddress: seller.walletAddress,
  });
  buyer.primaryWalletAttachmentId = await ensureLocalPrimaryWalletAttachment({
    userId: buyer.userId,
    walletAddress: buyer.walletAddress,
  });

  step("complete seller verification");
  await completeVerification(seller.accessToken);
  step("complete buyer verification");
  await completeVerification(buyer.accessToken);

  const primaryBytes = makeSyntheticWavBytes();
  const lyrics = "Late train, low light, cold river, no explicit content.";

  step("create community");
  const communityCreate = await expectOkJson<{
    community: {
      community_id: string;
    };
  }>("/communities", {
    token: seller.accessToken,
    json: {
      display_name: `Paid CDR Test ${Date.now()}`,
      membership_mode: "open",
      handle_policy: { policy_template: "standard" },
    },
  });
  const communityId = communityCreate.community.community_id;

  step("buyer joins community");
  await expectOkJson(`/communities/${communityId}/join`, {
    token: buyer.accessToken,
    json: {},
  });

  step("create upload intents");
  const primaryUpload = await createUpload(communityId, seller.accessToken, {
    artifact_kind: "primary_audio",
    mime_type: "audio/wav",
    filename: "paid-cdr-primary.wav",
    size_bytes: primaryBytes.byteLength,
  });

  step("upload bytes");
  await expectOkJson(`/communities/${communityId}/song-artifact-uploads/${primaryUpload.song_artifact_upload_id}/content`, {
    token: seller.accessToken,
    method: "PUT",
    bytes: primaryBytes,
    contentType: "audio/wav",
  });

  step("create bundle");
  const bundle = await expectOkJson<{
    song_artifact_bundle_id: string;
  }>(`/communities/${communityId}/song-artifacts`, {
    token: seller.accessToken,
    json: {
      primary_audio: { song_artifact_upload_id: primaryUpload.song_artifact_upload_id },
      preview_window: { start_ms: 0, duration_ms: 30_000 },
      lyrics,
    },
  });

  step("wait for generated preview");
  await waitForPreviewReady(communityId, bundle.song_artifact_bundle_id, seller.accessToken);

  step("publish locked song");
  const post = await expectOkJson<{
    post_id: string;
    asset_id: string;
    access_mode: string;
  }>(`/communities/${communityId}/posts`, {
    token: seller.accessToken,
    json: {
      idempotency_key: `paid-song-${Date.now()}`,
      post_type: "song",
      identity_mode: "public",
      title: "Paid CDR Test Song",
      access_mode: "locked",
      song_mode: "original",
      rights_basis: "original",
      song_artifact_bundle_id: bundle.song_artifact_bundle_id,
    },
  });
  const assetId = post.asset_id;

  step("check pre-purchase access");
  const accessBefore = await expectOkJson<{
    access_granted: boolean;
    decision_reason: string;
  }>(`/communities/${communityId}/assets/${assetId}/access`, {
    token: buyer.accessToken,
  });

  step("fetch ciphertext before purchase");
  const ciphertextBefore = await expectOkBytes(`/communities/${communityId}/assets/${assetId}/content`, {
    token: buyer.accessToken,
  });

  step("create listing");
  const listing = await expectOkJson<{ listing_id: string }>(`/communities/${communityId}/listings`, {
    token: seller.accessToken,
    json: {
      asset_id: assetId,
      price_usd: 0.05,
      regional_pricing_enabled: false,
      status: "active",
    },
  });

  step("create quote");
  const quote = await expectOkJson<{
    quote_id: string;
    final_price_usd: number;
  }>(`/communities/${communityId}/purchase-quotes`, {
    token: buyer.accessToken,
    json: {
      listing_id: listing.listing_id,
      client_estimated_slippage_bps: 0,
      client_estimated_hop_count: 0,
    },
  });

  if (!buyer.primaryWalletAttachmentId) {
    throw new Error("Buyer primary wallet attachment missing");
  }

  step("settle purchase");
  const settlement = await expectOkJson<{
    purchase_id: string;
    entitlement_kind: string;
    entitlement_target_ref: string;
  }>(`/communities/${communityId}/purchase-settlements`, {
    token: buyer.accessToken,
    json: {
      quote_id: quote.quote_id,
      settlement_wallet_attachment_id: buyer.primaryWalletAttachmentId,
      settlement_tx_ref: `live-e2e:${Date.now()}`,
    },
  });

  step("check post-purchase access");
  const accessAfter = await expectOkJson<{
    access_granted: boolean;
    decision_reason: string;
    delivery_kind: string | null;
    story_cdr_access: {
      chain_id: number;
      rpc_url: string;
      ciphertext_ref: string;
      cipher_iv_b64: string;
      mime_type: string;
      vault_uuid: number;
      access_aux_data_hex: `0x${string}`;
    } | null;
  }>(`/communities/${communityId}/assets/${assetId}/access`, {
    token: buyer.accessToken,
  });

  if (!accessAfter.story_cdr_access) {
    throw new Error("Missing story_cdr_access after purchase");
  }

  step("init wasm and cdr client");
  await initWasm();
  const storyChain = createStoryChain(accessAfter.story_cdr_access.chain_id, accessAfter.story_cdr_access.rpc_url);
  const buyerAccount = privateKeyToAccount(BUYER_PRIVATE_KEY);
  const publicClient = createPublicClient({
    chain: storyChain,
    transport: http(accessAfter.story_cdr_access.rpc_url),
  });
  const walletClient = createWalletClient({
    account: buyerAccount,
    chain: storyChain,
    transport: http(accessAfter.story_cdr_access.rpc_url),
  });
  const cdrReadFeeWei = await readCdrReadFeeWei({
    chain: storyChain,
    rpcUrl: accessAfter.story_cdr_access.rpc_url,
  });

  await ensureWalletFunds({
    label: "buyer",
    address: buyerAccount.address,
    chain: storyChain,
    rpcUrl: accessAfter.story_cdr_access.rpc_url,
    minimumBalanceWei: cdrReadFeeWei + CDR_READ_GAS_MARGIN_WEI,
    targetBalanceWei: cdrReadFeeWei + CDR_READ_GAS_MARGIN_WEI,
  });

  const cdrClient = new CDRClient({
    network: accessAfter.story_cdr_access.chain_id === 1514 ? "mainnet" : "testnet",
    publicClient,
    walletClient,
  });
  const requesterPrivateKey = await deriveStableRequesterPrivateKey({
    buyerPrivateKey: BUYER_PRIVATE_KEY,
    vaultUuid: accessAfter.story_cdr_access.vault_uuid,
    chainId: accessAfter.story_cdr_access.chain_id,
  });
  const requesterPublicKey = toHex(secp256k1.getPublicKey(requesterPrivateKey, false));
  step("access CDR");
  const fromBlock = await publicClient.getBlockNumber();
  const readResult = await cdrClient.consumer.read({
    uuid: accessAfter.story_cdr_access.vault_uuid,
    accessAuxData: accessAfter.story_cdr_access.access_aux_data_hex,
    requesterPubKey: requesterPublicKey,
  });
  console.log(JSON.stringify({
    phase: "cdr_read_submitted",
    vaultUuid: accessAfter.story_cdr_access.vault_uuid,
    buyerAddress: buyerAccount.address,
    requesterPrivateKeyHex: toHex(requesterPrivateKey),
    requesterPublicKey,
    fromBlock: fromBlock.toString(),
    txHash: readResult.txHash,
  }, null, 2));
  const [globalPubKey, threshold, vault] = await Promise.all([
    cdrClient.observer.getGlobalPubKey(),
    cdrClient.observer.getThreshold(),
    publicClient.readContract({
      address: contractAddresses[accessAfter.story_cdr_access.chain_id === 1514 ? "mainnet" : "testnet"].cdr,
      abi: cdrAbi,
      functionName: "vaults",
      args: [accessAfter.story_cdr_access.vault_uuid],
    }),
  ]);
  const partials = await cdrClient.consumer.collectPartials({
    uuid: accessAfter.story_cdr_access.vault_uuid,
    minPartials: threshold,
    fromBlock,
    requesterPubKey: requesterPublicKey,
  });
  const dataKey = await cdrClient.consumer.decryptDataKey({
    ciphertext: {
      raw: toBytes((vault as { encryptedData: Hex }).encryptedData),
      label: uuidToLabel(accessAfter.story_cdr_access.vault_uuid),
    },
    partials,
    recipientPrivKey: requesterPrivateKey,
    globalPubKey,
    label: uuidToLabel(accessAfter.story_cdr_access.vault_uuid),
    threshold,
  });
  const txHash = readResult.txHash;

  step("decrypt ciphertext");
  const decipher = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(dataKey),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const ciphertext = ciphertextBefore.bytes;
  const iv = decodeBase64(accessAfter.story_cdr_access.cipher_iv_b64);
  const encrypted = ciphertext;
  const plaintext = new Uint8Array(await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    decipher,
    new Uint8Array(encrypted),
  ));

  step("fetch ciphertext after purchase");
  const accessContentAfter = await expectOkBytes(`/communities/${communityId}/assets/${assetId}/content`, {
    token: buyer.accessToken,
  });

  console.log(JSON.stringify({
    communityId,
    postId: post.post_id,
    assetId,
    bundleId: bundle.song_artifact_bundle_id,
    listingId: listing.listing_id,
    quoteId: quote.quote_id,
    purchaseId: settlement.purchase_id,
    priceUsd: quote.final_price_usd,
    accessBefore,
    accessAfter: {
      access_granted: accessAfter.access_granted,
      decision_reason: accessAfter.decision_reason,
      delivery_kind: accessAfter.delivery_kind,
      vault_uuid: accessAfter.story_cdr_access.vault_uuid,
      txHash,
    },
    ciphertextBeforeMatchesOriginal: equalBytes(ciphertextBefore.bytes, primaryBytes),
    ciphertextAfterMatchesBefore: equalBytes(accessContentAfter.bytes, ciphertextBefore.bytes),
    decryptedMatchesOriginal: equalBytes(plaintext, primaryBytes),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
