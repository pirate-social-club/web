import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, createWalletClient, defineChain, http, type Hex } from "viem";

import { CDRClient } from "../src/lib/story/vendor/piplabs/sdk/client";
import { initWasm } from "../src/lib/story/vendor/piplabs/crypto";

const execFileAsync = promisify(execFile);

const API_BASE = "http://127.0.0.1:8787";
const API_CWD = "/home/t42/Documents/pirate-v2/pirate-api/services/api";
const BUYER_PRIVATE_KEY = "0x8b3a350cf5c34c9194ca3a545d8b3b77d6c7b94d1d13d0d9f5e6f7a8b9c0d1e2" as Hex;

function readFlag(flagName: string): string | null {
  const prefix = `${flagName}=`;
  const raw = process.argv.slice(2).find((value) => value.startsWith(prefix));
  if (!raw) return null;
  const value = raw.slice(prefix.length).trim();
  return value || null;
}

const COMMUNITY_ID = readFlag("--community-id")
  ?? process.env.PAID_SONG_COMMUNITY_ID
  ?? "cmt_ccfe3266ad9049239766eb82448e3363";
const ASSET_ID = readFlag("--asset-id")
  ?? process.env.PAID_SONG_ASSET_ID
  ?? "ast_27445e22052a4669b01bbb6a303ac3ca";
const LISTING_ID = readFlag("--listing-id")
  ?? process.env.PAID_SONG_LISTING_ID
  ?? null;
const BUYER_SUBJECT = readFlag("--buyer-subject")
  ?? process.env.PAID_SONG_BUYER_SUBJECT
  ?? "buyer-1776462735813";
const EXPECTED_PLAINTEXT_LENGTH_RAW = readFlag("--expected-plaintext-length")
  ?? process.env.PAID_SONG_EXPECTED_PLAINTEXT_LENGTH
  ?? null;
const EXPECTED_PLAINTEXT_LENGTH = EXPECTED_PLAINTEXT_LENGTH_RAW ? Number(EXPECTED_PLAINTEXT_LENGTH_RAW) : null;

async function mintUpstreamJwt(sub: string, walletAddress: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "rtk",
    ["bun", "run", "scripts/mint-dev-jwt.ts", "--", "--sub", sub, "--wallet", walletAddress],
    { cwd: API_CWD },
  );
  const token = stdout.trim();
  if (!token) {
    throw new Error("mint-dev-jwt returned empty token");
  }
  return token;
}

async function ensureLocalPrimaryWalletAttachment(input: {
  userId: string;
  walletAddress: string;
}): Promise<string> {
  const { stdout } = await execFileAsync("rtk", [
    "bun",
    "run",
    "scripts/ensure-dev-primary-wallet-attachment.ts",
    "--",
    `--user-id=${input.userId}`,
    `--wallet-address=${input.walletAddress}`,
  ], {
    cwd: API_CWD,
  });
  const walletAttachmentId = stdout.trim();
  if (!walletAttachmentId) {
    throw new Error("ensure-dev-primary-wallet-attachment returned empty output");
  }
  return walletAttachmentId;
}

async function request(path: string, input?: {
  token?: string;
  method?: string;
  json?: unknown;
}): Promise<Response> {
  const headers = new Headers();
  if (input?.token) {
    headers.set("authorization", `Bearer ${input.token}`);
  }
  if (input?.json !== undefined) {
    headers.set("content-type", "application/json");
  }
  return await fetch(`${API_BASE}${path}`, {
    method: input?.method ?? (input?.json !== undefined ? "POST" : "GET"),
    headers,
    body: input?.json !== undefined ? JSON.stringify(input.json) : undefined,
  });
}

async function expectOkJson<T>(path: string, input?: {
  token?: string;
  method?: string;
  json?: unknown;
}): Promise<T> {
  const response = await request(path, input);
  if (!response.ok) {
    throw new Error(`${input?.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  }
  return await response.json() as T;
}

function createStoryChain(chainId: number, rpcUrl: string) {
  return defineChain({
    id: chainId,
    name: chainId === 1514 ? "Story Mainnet" : "Story Aeneid",
    nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
    network: chainId === 1514 ? "story-mainnet" : "story-aeneid",
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
  });
}

async function exchangeSession(): Promise<{
  accessToken: string;
  userId: string;
  walletAddress: string;
  primaryWalletAttachmentId: string | null;
}> {
  const account = privateKeyToAccount(BUYER_PRIVATE_KEY);
  const jwt = await mintUpstreamJwt(BUYER_SUBJECT, account.address);
  const response = await request("/auth/session/exchange", {
    json: {
      proof: {
        type: "jwt_based_auth",
        jwt,
      },
    },
  });
  if (!response.ok) {
    throw new Error(`session exchange failed: ${response.status} ${await response.text()}`);
  }
  const body = await response.json() as {
    access_token: string;
    user: {
      user_id: string;
      primary_wallet_attachment_id?: string | null;
    };
    wallet_attachments?: Array<{
      wallet_attachment_id: string;
      is_primary?: boolean | null;
    }>;
  };
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

async function main(): Promise<void> {
  const buyer = await exchangeSession();
  buyer.primaryWalletAttachmentId = await ensureLocalPrimaryWalletAttachment({
    userId: buyer.userId,
    walletAddress: buyer.walletAddress,
  });

  if (LISTING_ID) {
    const verification = await expectOkJson<{ verification_session_id: string }>("/verification-sessions", {
      token: buyer.accessToken,
      json: { provider: "self" },
    });
    await expectOkJson(`/verification-sessions/${verification.verification_session_id}/complete`, {
      token: buyer.accessToken,
      json: {},
    });
    const joinResponse = await request(`/communities/${COMMUNITY_ID}/join`, {
      token: buyer.accessToken,
      json: {},
    });
    if (!joinResponse.ok && joinResponse.status !== 409) {
      throw new Error(`community join failed: ${joinResponse.status} ${await joinResponse.text()}`);
    }
    const quote = await expectOkJson<{ quote_id: string }>(`/communities/${COMMUNITY_ID}/purchase-quotes`, {
      token: buyer.accessToken,
      json: {
        listing_id: LISTING_ID,
        client_estimated_slippage_bps: 0,
        client_estimated_hop_count: 0,
      },
    });
    await expectOkJson(`/communities/${COMMUNITY_ID}/purchase-settlements`, {
      token: buyer.accessToken,
      json: {
        quote_id: quote.quote_id,
        settlement_wallet_attachment_id: buyer.primaryWalletAttachmentId,
        settlement_tx_ref: `resume-paid-song:${Date.now()}`,
      },
    });
  }

  const accessResponse = await request(`/communities/${COMMUNITY_ID}/assets/${ASSET_ID}/access`, {
    token: buyer.accessToken,
  });
  const accessText = await accessResponse.text();
  if (!accessResponse.ok) {
    throw new Error(`asset access failed: ${accessResponse.status} ${accessText}`);
  }
  const accessBody = JSON.parse(accessText) as {
    access_granted: boolean;
    decision_reason: string;
    delivery_kind: string | null;
    story_cdr_access: {
      chain_id: number;
      rpc_url: string;
      ciphertext_ref: string;
      mime_type: string;
      vault_uuid: number;
      access_aux_data_hex: `0x${string}`;
    } | null;
  };
  if (!accessBody.story_cdr_access) {
    throw new Error(`story_cdr_access missing: ${accessText}`);
  }

  const contentResponse = await request(`/communities/${COMMUNITY_ID}/assets/${ASSET_ID}/content`, {
    token: buyer.accessToken,
  });
  if (!contentResponse.ok) {
    throw new Error(`asset content failed: ${contentResponse.status} ${await contentResponse.text()}`);
  }
  const ciphertext = new Uint8Array(await contentResponse.arrayBuffer());

  await initWasm();
  const buyerAccount = privateKeyToAccount(BUYER_PRIVATE_KEY);
  const storyChain = createStoryChain(
    accessBody.story_cdr_access.chain_id,
    accessBody.story_cdr_access.rpc_url,
  );
  const publicClient = createPublicClient({
    chain: storyChain,
    transport: http(accessBody.story_cdr_access.rpc_url),
  });
  const walletClient = createWalletClient({
    account: buyerAccount,
    chain: storyChain,
    transport: http(accessBody.story_cdr_access.rpc_url),
  });
  const cdrClient = new CDRClient({
    network: accessBody.story_cdr_access.chain_id === 1514 ? "mainnet" : "testnet",
    publicClient,
    walletClient,
  });
  const { dataKey, txHash } = await cdrClient.consumer.accessCDR({
    uuid: accessBody.story_cdr_access.vault_uuid,
    accessAuxData: accessBody.story_cdr_access.access_aux_data_hex,
  });

  const decryptKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(dataKey),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const iv = ciphertext.slice(0, 12);
  const encrypted = ciphertext.slice(12);
  const plaintext = new Uint8Array(await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    decryptKey,
    new Uint8Array(encrypted),
  ));

  console.log(JSON.stringify({
    communityId: COMMUNITY_ID,
    assetId: ASSET_ID,
    listingId: LISTING_ID,
    accessGranted: accessBody.access_granted,
    decisionReason: accessBody.decision_reason,
    deliveryKind: accessBody.delivery_kind,
    vaultUuid: accessBody.story_cdr_access.vault_uuid,
    ciphertextBytes: ciphertext.byteLength,
    plaintextBytes: plaintext.byteLength,
    expectedPlaintextLength: EXPECTED_PLAINTEXT_LENGTH,
    plaintextLengthMatchesExpected: EXPECTED_PLAINTEXT_LENGTH == null
      ? null
      : plaintext.byteLength === EXPECTED_PLAINTEXT_LENGTH,
    txHash,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
