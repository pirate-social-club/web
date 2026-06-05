import { createHash, createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { secp256k1 } from "@noble/curves/secp256k1.js";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  http,
  parseEther,
  parseEventLogs,
  toBytes,
  toHex,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { cdrAbi } from "../src/vendor/piplabs/contracts/index.js";
import { CDRClient } from "../src/vendor/piplabs/sdk/client.js";
import { initWasm } from "../src/vendor/piplabs/crypto/index.js";
import { uuidToLabel } from "../src/vendor/piplabs/sdk/label.js";
import { decodeBase64 } from "./_lib/base64.js";

type Session = {
  accessToken: string;
  userId: string;
  walletAddress: Hex;
  walletAttachment: string;
  privateKey: Hex;
};

type AssetRead = {
  access_mode?: string | null;
  locked_delivery_status?: string | null;
  locked_delivery_error?: string | null;
  story_cdr_vault_uuid?: number | null;
  story_derivative_parent_ip_ids?: string[] | null;
  story_error?: string | null;
  story_ip?: string | null;
  story_license_terms?: string | null;
  story_royalty_registration_status?: string | null;
  story_status?: string | null;
};

type StoryCdrAccess = {
  access_aux_data_hex: Hex;
  access_scope: string;
  cdr_contract_address: Hex;
  chain_id: number;
  cipher_iv_b64: string;
  ciphertext_ref: string;
  mime_type: string;
  namespace: Hex;
  read_condition_address: Hex;
  rpc_url: string;
  vault_uuid: number;
};

type SettlementEffect = {
  effect_kind: string;
  effect_ref: string;
  provider_receipt_ref: string | null;
  purchase: string;
  quote: string;
  settlement_ref: string | null;
  status: string;
  tax_receipt_ref: string | null;
  attempt_count: number;
};

type AuditArtifact = {
  status: "running" | "passed" | "failed";
  started_at: string;
  completed_at: string | null;
  failure: string | null;
  staging_env_fingerprint: Record<string, unknown>;
  community: Record<string, unknown>;
  original: Record<string, unknown>;
  derivative: Record<string, unknown>;
  listing: Record<string, unknown>;
  quote: Record<string, unknown>;
  purchase: Record<string, unknown>;
  settlement_effects: SettlementEffect[];
  idempotency_replay: Record<string, unknown>;
  story_txs: Record<string, unknown>;
  cdr: Record<string, unknown>;
  steps: Array<{ at: string; name: string; data?: Record<string, unknown> }>;
};

const TRANSFER_ABI = [{
  type: "function",
  name: "transfer",
  stateMutability: "nonpayable",
  inputs: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
  ],
  outputs: [{ name: "", type: "bool" }],
}] as const;

const CDR_READ_GAS_MARGIN_WEI = parseEther("0.01");
const DEFAULT_API_BASE_URL = "https://api-staging.pirate.sc";

const artifact: AuditArtifact = {
  status: "running",
  started_at: new Date().toISOString(),
  completed_at: null,
  failure: null,
  staging_env_fingerprint: {},
  community: {},
  original: {},
  derivative: {},
  listing: {},
  quote: {},
  purchase: {},
  settlement_effects: [],
  idempotency_replay: {},
  story_txs: {},
  cdr: {},
  steps: [],
};

function usage(): string {
  return [
    "Usage: bun run scripts/live-story-derivative-royalty-e2e.ts",
    "",
    "Required env:",
    "  AUTH_UPSTREAM_JWT_AUDIENCE",
    "  AUTH_UPSTREAM_JWT_ISSUER",
    "  AUTH_UPSTREAM_JWT_SHARED_SECRET",
    "  PIRATE_CHECKOUT_SMOKE_BUYER_PRIVATE_KEY or PIRATE_STORY_E2E_BUYER_PRIVATE_KEY",
    "  PIRATE_CHECKOUT_RPC_URL",
    "  PIRATE_CHECKOUT_USDC_TOKEN_ADDRESS",
    "",
    "Optional env:",
    `  E2E_API_BASE_URL or PIRATE_STORY_E2E_API_BASE_URL (default ${DEFAULT_API_BASE_URL})`,
    "  PIRATE_STORY_E2E_ARTIFACT_DIR (default tmp/e2e-artifacts)",
    "  PIRATE_STORY_E2E_CDR_TIMEOUT_MS (default 90000)",
    "  PIRATE_STORY_E2E_COMET_RPC_URL or STORY_COMET_RPC_URL (optional; enables Cosmos/ABCI DKG partial collection)",
    "  PIRATE_STORY_E2E_PRICE_CENTS (default 1)",
    "  PIRATE_CHECKOUT_SOURCE_CHAIN_ID (default 84532)",
    "  STORY_RUNTIME_FUNDER_PRIVATE_KEY, STORY_RUNTIME_PRIVATE_KEY, or STORY_CONTRACT_OWNER_PRIVATE_KEY",
  ].join("\n");
}

function step(name: string, data?: Record<string, unknown>): void {
  artifact.steps.push({ at: new Date().toISOString(), name, ...(data ? { data } : {}) });
  console.error(`[story-derivative-royalty-e2e] ${name}`, data ?? "");
}

function writeArtifact(): void {
  artifact.completed_at = new Date().toISOString();
  const dir = process.env.PIRATE_STORY_E2E_ARTIFACT_DIR?.trim() || "tmp/e2e-artifacts";
  mkdirSync(dir, { recursive: true });
  const filename = `story-derivative-royalty-${Date.now()}.json`;
  const path = resolve(dir, filename);
  writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify({ artifact: path, status: artifact.status }, null, 2));
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function optionalEnv(name: string): string | null {
  return process.env[name]?.trim() || null;
}

function normalizePrivateKey(value: string | null | undefined): Hex | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  if (!/^0x[a-fA-F0-9]{64}$/u.test(prefixed)) return null;
  return prefixed as Hex;
}

function requirePrivateKey(names: string[]): Hex {
  for (const name of names) {
    const key = normalizePrivateKey(process.env[name]);
    if (key) return key;
  }
  throw new Error(`${names.join(" or ")} is required`);
}

function apiBaseUrl(): string {
  return (
    optionalEnv("PIRATE_STORY_E2E_API_BASE_URL")
    ?? optionalEnv("E2E_API_BASE_URL")
    ?? DEFAULT_API_BASE_URL
  ).replace(/\/+$/u, "");
}

function storyCometRpcUrl(): string | null {
  return optionalEnv("PIRATE_STORY_E2E_COMET_RPC_URL")
    ?? optionalEnv("STORY_COMET_RPC_URL");
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/u, "");
}

function signHs256Jwt(payload: Record<string, unknown>, secret: string): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest();
  return `${signingInput}.${base64Url(signature)}`;
}

function mintUpstreamJwt(subject: string, walletAddress: Hex): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return signHs256Jwt({
    aud: requiredEnv("AUTH_UPSTREAM_JWT_AUDIENCE"),
    exp: nowSeconds + 15 * 60,
    iat: nowSeconds,
    iss: requiredEnv("AUTH_UPSTREAM_JWT_ISSUER"),
    sub: subject,
    wallet_address: walletAddress,
  }, requiredEnv("AUTH_UPSTREAM_JWT_SHARED_SECRET"));
}

function toRequestArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function api<T>(input: {
  apiBase: string;
  body?: unknown;
  bytes?: Uint8Array;
  contentType?: string;
  method?: string;
  ok?: number[];
  path: string;
  token?: string | null;
}): Promise<T> {
  const response = await fetch(`${input.apiBase}${input.path}`, {
    method: input.method ?? (input.body !== undefined || input.bytes ? "POST" : "GET"),
    headers: {
      accept: "application/json",
      ...(input.token ? { authorization: `Bearer ${input.token}` } : {}),
      ...(input.body === undefined ? {} : { "content-type": "application/json" }),
      ...(input.bytes ? { "content-type": input.contentType ?? "application/octet-stream" } : {}),
    },
    body: input.body === undefined
      ? input.bytes
        ? toRequestArrayBuffer(input.bytes)
        : undefined
      : JSON.stringify(input.body),
  });
  const text = await response.text();
  const parsed = text.trim() ? JSON.parse(text) as T : null as T;
  const ok = input.ok ?? [200, 201, 202];
  if (!ok.includes(response.status)) {
    throw new Error(`${input.method ?? "GET"} ${input.path} failed with ${response.status}: ${text}`);
  }
  return parsed;
}

async function apiBytes(input: {
  apiBase: string;
  path: string;
  token?: string | null;
}): Promise<Uint8Array> {
  const url = /^https?:\/\//iu.test(input.path) ? input.path : `${input.apiBase}${input.path}`;
  const response = await fetch(url, {
    headers: input.token ? { authorization: `Bearer ${input.token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`GET ${input.path} failed with ${response.status}: ${await response.text()}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function createSession(input: {
  apiBase: string;
  privateKey: Hex;
  subject: string;
}): Promise<Session> {
  const account = privateKeyToAccount(input.privateKey);
  const body = await api<{
    access_token: string;
    user: { id?: string; user_id?: string; primary_wallet_attachment?: string | null; primary_wallet_attachment_id?: string | null };
    wallet_attachments?: Array<{ wallet_attachment?: string; wallet_attachment_id?: string; is_primary?: boolean | null }>;
  }>({
    apiBase: input.apiBase,
    method: "POST",
    path: "/auth/session/exchange",
    body: {
      proof: {
        type: "jwt_based_auth",
        jwt: mintUpstreamJwt(input.subject, account.address),
      },
    },
  });
  const walletAttachment = body.user.primary_wallet_attachment
    ?? body.user.primary_wallet_attachment_id
    ?? body.wallet_attachments?.find((attachment) => attachment.is_primary)?.wallet_attachment
    ?? body.wallet_attachments?.find((attachment) => attachment.is_primary)?.wallet_attachment_id
    ?? body.wallet_attachments?.[0]?.wallet_attachment
    ?? body.wallet_attachments?.[0]?.wallet_attachment_id
    ?? null;
  if (!walletAttachment) {
    throw new Error(`session ${input.subject} is missing a wallet attachment`);
  }
  return {
    accessToken: body.access_token,
    userId: body.user.id ?? body.user.user_id ?? "",
    walletAddress: account.address,
    walletAttachment,
    privateKey: input.privateKey,
  };
}

async function waitForJob(apiBase: string, jobId: string, token: string): Promise<void> {
  const deadline = Date.now() + 180_000;
  let lastStatus = "unknown";
  while (Date.now() < deadline) {
    const job = await api<{ error_code?: string | null; id: string; status: string }>({
      apiBase,
      method: "GET",
      path: `/jobs/${encodeURIComponent(jobId)}`,
      token,
    });
    lastStatus = job.status;
    if (job.status === "succeeded") return;
    if (job.status === "failed") {
      throw new Error(`job ${job.id} failed: ${job.error_code ?? "unknown"}`);
    }
    await sleep(3_000);
  }
  throw new Error(`job ${jobId} did not finish; last status ${lastStatus}`);
}

async function createCommunity(apiBase: string, host: Session, runId: string): Promise<string> {
  const created = await api<{
    community: { id?: string; community_id?: string };
    job?: { id?: string; status?: string };
  }>({
    apiBase,
    method: "POST",
    path: "/communities",
    token: host.accessToken,
    body: {
      display_name: `Story Royalty E2E ${runId}`,
      handle_policy: { policy_template: "standard" },
      membership_mode: "request",
    },
  });
  if (created.job?.id && created.job.status !== "succeeded") {
    await waitForJob(apiBase, created.job.id, host.accessToken);
  }
  const id = created.community.id ?? created.community.community_id;
  if (!id) throw new Error("created community id is missing");
  return id.replace(/^com_/u, "");
}

async function joinCommunity(apiBase: string, communityId: string, host: Session, session: Session): Promise<void> {
  const joined = await api<{ status?: "joined" | "requested" }>({
    apiBase,
    method: "POST",
    path: `/communities/${encodeURIComponent(communityId)}/join`,
    token: session.accessToken,
    body: {},
  });
  if (joined.status === "joined") return;

  const requests = await api<{ items: Array<{ applicant_user?: string | null; id: string }> }>({
    apiBase,
    method: "GET",
    path: `/communities/${encodeURIComponent(communityId)}/membership-requests?limit=50`,
    token: host.accessToken,
  });
  const request = session.userId
    ? requests.items.find((item) => item.applicant_user === session.userId)
    : requests.items.length === 1 ? requests.items[0] : null;
  if (!request) {
    throw new Error(`membership request was not created for ${session.userId || session.walletAddress}`);
  }
  await api({
    apiBase,
    method: "POST",
    path: `/communities/${encodeURIComponent(communityId)}/membership-requests/${encodeURIComponent(request.id)}/approve`,
    token: host.accessToken,
    body: {},
  });
}

function makeSilentWavBytes(durationSeconds = 4): Uint8Array {
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

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

async function uploadSongArtifact(input: {
  apiBase: string;
  artifactKind: "primary_audio" | "primary_video" | "preview_video";
  bytes: Uint8Array;
  communityId: string;
  filename: string;
  mimeType: string;
  session: Session;
}): Promise<{ id: string; storage_ref: string }> {
  const upload = await api<{ id: string; storage_ref: string }>({
    apiBase: input.apiBase,
    method: "POST",
    path: `/communities/${encodeURIComponent(input.communityId)}/song-artifact-uploads`,
    token: input.session.accessToken,
    body: {
      artifact_kind: input.artifactKind,
      filename: input.filename,
      mime_type: input.mimeType,
      size_bytes: input.bytes.byteLength,
    },
  });
  await api({
    apiBase: input.apiBase,
    method: "POST",
    path: `/communities/${encodeURIComponent(input.communityId)}/song-artifact-uploads/${encodeURIComponent(upload.id)}/content`,
    token: input.session.accessToken,
    bytes: input.bytes,
    contentType: input.mimeType,
  });
  return upload;
}

async function createSongBundle(input: {
  apiBase: string;
  bytes: Uint8Array;
  communityId: string;
  filename: string;
  session: Session;
  title: string;
}): Promise<string> {
  const upload = await uploadSongArtifact({
    apiBase: input.apiBase,
    artifactKind: "primary_audio",
    bytes: input.bytes,
    communityId: input.communityId,
    filename: input.filename,
    mimeType: "audio/wav",
    session: input.session,
  });
  const bundle = await api<{ id: string; status?: string }>({
    apiBase: input.apiBase,
    method: "POST",
    path: `/communities/${encodeURIComponent(input.communityId)}/song-artifacts`,
    token: input.session.accessToken,
    body: {
      lyrics: "Story royalty live e2e lyric",
      preview_window: { start_ms: 0, duration_ms: 30_000 },
      primary_audio: { song_artifact_upload: upload.id },
      title: input.title,
    },
  });
  return bundle.id;
}

async function waitForSongPreview(input: {
  apiBase: string;
  bundle: string;
  communityId: string;
  session: Session;
  title: string;
}): Promise<void> {
  const timeoutMs = Number(optionalEnv("PIRATE_STORY_E2E_PREVIEW_TIMEOUT_MS") ?? "360000");
  const intervalMs = Number(optionalEnv("PIRATE_STORY_E2E_PREVIEW_INTERVAL_MS") ?? "5000");
  const startedAt = Date.now();
  let last: unknown = null;
  while (Date.now() - startedAt < timeoutMs) {
    const bundle = await api<{
      preview_audio?: { storage_ref?: string | null } | null;
      preview_error?: string | null;
      preview_status?: string | null;
      status?: string | null;
    }>({
      apiBase: input.apiBase,
      method: "GET",
      path: `/communities/${encodeURIComponent(input.communityId)}/song-artifacts/${encodeURIComponent(input.bundle)}`,
      token: input.session.accessToken,
    });
    last = bundle;
    step("preview status", {
      title: input.title,
      preview_status: bundle.preview_status ?? null,
      elapsed_ms: Date.now() - startedAt,
    });
    if (bundle.preview_status === "completed" && bundle.preview_audio?.storage_ref) return;
    if (bundle.preview_status === "failed") {
      throw new Error(`preview generation failed: ${bundle.preview_error ?? "unknown"}`);
    }
    await sleep(intervalMs);
  }
  throw new Error(`preview generation timed out: ${JSON.stringify(last)}`);
}

async function createSongPost(input: {
  accessMode: "locked";
  apiBase: string;
  bundle: string;
  communityId: string;
  rightsBasis: "original" | "derivative";
  session: Session;
  songMode: "original" | "remix";
  title: string;
  upstreamAssetRefs?: string[] | null;
}): Promise<{ asset: string; post: string }> {
  const post = await api<{ asset?: string | null; id: string }>({
    apiBase: input.apiBase,
    method: "POST",
    path: `/communities/${encodeURIComponent(input.communityId)}/posts`,
    token: input.session.accessToken,
    body: {
      access_mode: input.accessMode,
      commercial_rev_share_pct: 10,
      identity_mode: "public",
      idempotency_key: `story-royalty-e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      license_preset: "commercial-remix",
      post_type: "song",
      rights_basis: input.rightsBasis,
      song_artifact_bundle: input.bundle,
      song_mode: input.songMode,
      title: input.title,
      upstream_asset_refs: input.upstreamAssetRefs ?? undefined,
    },
  });
  if (!post.asset) throw new Error(`post ${post.id} did not return an asset`);
  return { asset: post.asset, post: post.id };
}

async function readAsset(apiBase: string, communityId: string, asset: string, session: Session): Promise<AssetRead> {
  return await api<AssetRead>({
    apiBase,
    method: "GET",
    path: `/communities/${encodeURIComponent(communityId)}/assets/${encodeURIComponent(asset)}`,
    token: session.accessToken,
  });
}

async function waitForAssetReady(input: {
  apiBase: string;
  asset: string;
  communityId: string;
  label: string;
  session: Session;
}): Promise<AssetRead> {
  const timeoutMs = Number(optionalEnv("PIRATE_STORY_E2E_ASSET_TIMEOUT_MS") ?? "420000");
  const intervalMs = Number(optionalEnv("PIRATE_STORY_E2E_ASSET_INTERVAL_MS") ?? "5000");
  const startedAt = Date.now();
  let last: AssetRead | null = null;
  while (Date.now() - startedAt < timeoutMs) {
    const asset = await readAsset(input.apiBase, input.communityId, input.asset, input.session);
    last = asset;
    step("asset status", {
      label: input.label,
      locked_delivery_status: asset.locked_delivery_status ?? null,
      story_ip: asset.story_ip ?? null,
      story_registration: asset.story_royalty_registration_status ?? null,
      elapsed_ms: Date.now() - startedAt,
    });
    if (asset.locked_delivery_status === "failed" || asset.locked_delivery_error) {
      throw new Error(`${input.label} locked delivery failed: ${JSON.stringify(asset)}`);
    }
    if (asset.story_royalty_registration_status === "failed" || asset.story_error) {
      throw new Error(`${input.label} Story registration failed: ${JSON.stringify(asset)}`);
    }
    if (
      asset.locked_delivery_status === "ready"
      && asset.story_royalty_registration_status === "registered"
      && asset.story_ip
    ) {
      return asset;
    }
    await sleep(intervalMs);
  }
  throw new Error(`${input.label} asset readiness timed out: ${JSON.stringify(last)}`);
}

function createChain(chainId: number, rpcUrl: string, label: string) {
  return defineChain({
    id: chainId,
    name: label,
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
  });
}

function checkoutChainName(chainId: number): string {
  if (chainId === 8453) return "Base";
  if (chainId === 84532) return "Base Sepolia";
  return `Chain ${chainId}`;
}

function storyChainName(chainId: number): string {
  if (chainId === 1514) return "Story Mainnet";
  if (chainId === 1315) return "Story Aeneid";
  return `Story ${chainId}`;
}

function checkoutOperatorAddress(): Hex {
  const explicit = optionalEnv("PIRATE_CHECKOUT_OPERATOR_ADDRESS");
  if (explicit) return explicit as Hex;
  const key = normalizePrivateKey(process.env.PIRATE_CHECKOUT_OPERATOR_PRIVATE_KEY);
  if (!key) throw new Error("PIRATE_CHECKOUT_OPERATOR_ADDRESS or PIRATE_CHECKOUT_OPERATOR_PRIVATE_KEY is required");
  return privateKeyToAccount(key).address;
}

async function sendCheckoutFunding(input: {
  buyerPrivateKey: Hex;
  destination: Hex;
  finalPriceCents: number;
}): Promise<Hex> {
  const rpcUrl = requiredEnv("PIRATE_CHECKOUT_RPC_URL");
  const token = requiredEnv("PIRATE_CHECKOUT_USDC_TOKEN_ADDRESS") as Hex;
  const chainId = Number(optionalEnv("PIRATE_CHECKOUT_SOURCE_CHAIN_ID") ?? "84532");
  const chain = createChain(chainId, rpcUrl, checkoutChainName(chainId));
  const account = privateKeyToAccount(input.buyerPrivateKey);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const amountAtomic = BigInt(input.finalPriceCents) * 10_000n;

  const txHash = await walletClient.sendTransaction({
    account,
    chain,
    to: token,
    data: encodeFunctionData({
      abi: TRANSFER_ABI,
      functionName: "transfer",
      args: [input.destination, amountAtomic],
    }),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error(`checkout funding failed: ${txHash}`);
  }
  artifact.staging_env_fingerprint.checkout_chain_id = chainId;
  return txHash;
}

async function waitForStoryTx(publicClient: ReturnType<typeof createPublicClient>, txHash: string, label: string): Promise<void> {
  if (!/^0x[a-fA-F0-9]{64}$/u.test(txHash)) {
    throw new Error(`${label} is not a transaction hash: ${txHash}`);
  }
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as Hex });
  if (receipt.status !== "success") {
    throw new Error(`${label} failed on-chain: ${txHash}`);
  }
}

async function readCdrReadFeeWei(publicClient: ReturnType<typeof createPublicClient>, cdrAddress: Hex): Promise<bigint> {
  return await publicClient.readContract({
    address: cdrAddress,
    abi: [{
      type: "function",
      name: "readFee",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint256" }],
    }],
    functionName: "readFee",
  });
}

async function ensureStoryReaderFunds(input: {
  address: Hex;
  chain: ReturnType<typeof createChain>;
  minimumBalanceWei: bigint;
  publicClient: ReturnType<typeof createPublicClient>;
  rpcUrl: string;
  targetBalanceWei: bigint;
}): Promise<Hex | null> {
  const balance = await input.publicClient.getBalance({ address: input.address });
  if (balance >= input.minimumBalanceWei) return null;

  const funderPrivateKey = normalizePrivateKey(process.env.STORY_RUNTIME_FUNDER_PRIVATE_KEY)
    ?? normalizePrivateKey(process.env.STORY_RUNTIME_PRIVATE_KEY)
    ?? normalizePrivateKey(process.env.STORY_CONTRACT_OWNER_PRIVATE_KEY);
  if (!funderPrivateKey) {
    throw new Error(`buyer wallet ${input.address} is underfunded for CDR reads and no Story funder key is available`);
  }
  const funder = privateKeyToAccount(funderPrivateKey);
  const walletClient = createWalletClient({
    account: funder,
    chain: input.chain,
    transport: http(input.rpcUrl),
  });
  const value = input.targetBalanceWei > balance
    ? input.targetBalanceWei - balance
    : input.minimumBalanceWei;
  const txHash = await walletClient.sendTransaction({
    account: funder,
    chain: input.chain,
    to: input.address,
    value,
  });
  const receipt = await input.publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error(`Story reader funding failed: ${txHash}`);
  }
  return txHash;
}

async function deriveStableRequesterPrivateKey(params: {
  buyerPrivateKey: Hex;
  chainId: number;
  vaultUuid: number;
}): Promise<Uint8Array> {
  const seed = new TextEncoder().encode([
    "pirate-story-cdr-requester-v1",
    params.chainId,
    params.vaultUuid,
    params.buyerPrivateKey.toLowerCase(),
  ].join(":"));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", seed));
  if (!secp256k1.utils.isValidSecretKey(digest)) {
    digest[digest.length - 1] = digest[digest.length - 1] ^ 1;
  }
  if (!secp256k1.utils.isValidSecretKey(digest)) {
    throw new Error("Could not derive a valid CDR requester private key");
  }
  return digest;
}

async function collectCdrPartialTxHashes(input: {
  cdrAddress: Hex;
  fromBlock: bigint;
  publicClient: ReturnType<typeof createPublicClient>;
  requesterPubKey: Hex;
  uuid: number;
}): Promise<Hex[]> {
  const latestBlock = await input.publicClient.getBlockNumber();
  const chunkSize = 512n;
  const hashes = new Set<Hex>();
  let start = input.fromBlock;
  while (start <= latestBlock) {
    const toBlock = start + chunkSize - 1n <= latestBlock ? start + chunkSize - 1n : latestBlock;
    const logs = await input.publicClient.getLogs({
      address: input.cdrAddress,
      fromBlock: start,
      toBlock,
    });
    const parsed = parseEventLogs({
      abi: cdrAbi,
      logs,
      eventName: "EncryptedPartialDecryptionSubmitted",
    });
    for (const log of parsed) {
      if (
        Number(log.args.uuid) === input.uuid
        && String(log.args.requesterPubKey).toLowerCase() === input.requesterPubKey.toLowerCase()
        && log.transactionHash
      ) {
        hashes.add(log.transactionHash);
      }
    }
    start = toBlock + 1n;
  }
  return [...hashes];
}

async function decryptCdrAsset(input: {
  access: StoryCdrAccess;
  apiBase: string;
  buyer: Session;
  ciphertext: Uint8Array;
  expectedPlaintext: Uint8Array;
}): Promise<void> {
  await initWasm();
  const chain = createChain(input.access.chain_id, input.access.rpc_url, storyChainName(input.access.chain_id));
  const account = privateKeyToAccount(input.buyer.privateKey);
  const publicClient = createPublicClient({ chain, transport: http(input.access.rpc_url) });
  const walletClient = createWalletClient({ account, chain, transport: http(input.access.rpc_url) });
  const readFeeWei = await readCdrReadFeeWei(publicClient, input.access.cdr_contract_address);
  const fundingTx = await ensureStoryReaderFunds({
    address: account.address,
    chain,
    minimumBalanceWei: readFeeWei + CDR_READ_GAS_MARGIN_WEI,
    publicClient,
    rpcUrl: input.access.rpc_url,
    targetBalanceWei: readFeeWei + CDR_READ_GAS_MARGIN_WEI,
  });

  const cometRpcUrl = storyCometRpcUrl();
  const dkgSource = cometRpcUrl ? "cosmos-abci" : "evm-events";
  const cdrTimeoutMs = Number(optionalEnv("PIRATE_STORY_E2E_CDR_TIMEOUT_MS") ?? "90000");
  const cdrClient = new CDRClient({
    network: input.access.chain_id === 1514 ? "mainnet" : "testnet",
    publicClient,
    walletClient,
    ...(cometRpcUrl ? { dkgSource: "cosmos-abci" as const, cometRpcUrl } : {}),
  });
  artifact.staging_env_fingerprint.story_dkg_source = dkgSource;
  artifact.staging_env_fingerprint.story_comet_rpc_url = cometRpcUrl;
  const requesterPrivateKey = await deriveStableRequesterPrivateKey({
    buyerPrivateKey: input.buyer.privateKey,
    chainId: input.access.chain_id,
    vaultUuid: input.access.vault_uuid,
  });
  const requesterPubKey = toHex(secp256k1.getPublicKey(requesterPrivateKey, false));
  const fromBlock = await publicClient.getBlockNumber();
  const readResult = await cdrClient.consumer.read({
    uuid: input.access.vault_uuid,
    accessAuxData: input.access.access_aux_data_hex,
    requesterPubKey,
  });
  await waitForStoryTx(publicClient, readResult.txHash, "cdr_read_tx_hash");
  artifact.cdr = {
    cdr_dkg_source: dkgSource,
    cdr_read_tx_hash: readResult.txHash,
    cdr_timeout_ms: cdrTimeoutMs,
    comet_rpc_url: cometRpcUrl,
    from_block: fromBlock.toString(),
    requester: account.address,
    requester_pub_key: requesterPubKey,
    vault_uuid: input.access.vault_uuid,
  };
  const [globalPubKey, threshold, vault] = await Promise.all([
    cdrClient.observer.getGlobalPubKey(),
    cdrClient.observer.getThreshold(),
    publicClient.readContract({
      address: input.access.cdr_contract_address,
      abi: cdrAbi,
      functionName: "vaults",
      args: [input.access.vault_uuid],
    }),
  ]);
  const invalidPartials: Array<{ error: string; pid: number; round: number; validator: Hex }> = [];
  const partials = await cdrClient.consumer.collectPartials({
    uuid: input.access.vault_uuid,
    minPartials: threshold,
    fromBlock,
    requesterPubKey,
    timeoutMs: cdrTimeoutMs,
    onInvalidPartial: (event, error) => {
      invalidPartials.push({
        error: error.message,
        pid: event.pid,
        round: event.round,
        validator: event.validator,
      });
    },
  });
  let partialTxHashes: Hex[] = [];
  let partialTxHashScanError: string | null = null;
  try {
    partialTxHashes = await collectCdrPartialTxHashes({
      cdrAddress: input.access.cdr_contract_address,
      fromBlock,
      publicClient,
      requesterPubKey,
      uuid: input.access.vault_uuid,
    });
  } catch (error) {
    partialTxHashScanError = error instanceof Error ? error.message : String(error);
    if (!cometRpcUrl) throw error;
  }
  const dataKey = await cdrClient.consumer.decryptDataKey({
    ciphertext: {
      raw: toBytes((vault as { encryptedData: Hex }).encryptedData),
      label: uuidToLabel(input.access.vault_uuid),
    },
    partials,
    recipientPrivKey: requesterPrivateKey,
    globalPubKey,
    label: uuidToLabel(input.access.vault_uuid),
    threshold,
  });
  const decipher = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(dataKey),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const plaintext = new Uint8Array(await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(decodeBase64(input.access.cipher_iv_b64)) },
    decipher,
    toRequestArrayBuffer(input.ciphertext),
  ));
  const uploadedSha256 = sha256Hex(input.expectedPlaintext);
  const decryptedSha256 = sha256Hex(plaintext);
  if (uploadedSha256 !== decryptedSha256) {
    throw new Error(`CDR decrypted hash mismatch: uploaded=${uploadedSha256} decrypted=${decryptedSha256}`);
  }
  artifact.cdr = {
    cdr_dkg_source: dkgSource,
    cdr_read_fee_wei: readFeeWei.toString(),
    cdr_read_partial_count: partials.length,
    cdr_read_partial_invalid: invalidPartials,
    cdr_read_partial_source: dkgSource,
    cdr_read_partial_tx_hashes: partialTxHashes,
    cdr_read_partial_tx_hash_scan_error: partialTxHashScanError,
    cdr_read_tx_hash: readResult.txHash,
    cdr_timeout_ms: cdrTimeoutMs,
    comet_rpc_url: cometRpcUrl,
    decrypted_sha256: decryptedSha256,
    reader_funding_tx_hash: fundingTx,
    threshold,
    uploaded_asset_sha256: uploadedSha256,
    vault_uuid: input.access.vault_uuid,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertSingleEffect(effects: SettlementEffect[], kind: string): SettlementEffect {
  const matches = effects.filter((effect) => effect.effect_kind === kind);
  if (matches.length !== 1) {
    throw new Error(`expected one ${kind} effect, got ${matches.length}: ${JSON.stringify(matches)}`);
  }
  const effect = matches[0]!;
  if (effect.status !== "confirmed") {
    throw new Error(`${kind} effect is not confirmed: ${JSON.stringify(effect)}`);
  }
  if (effect.attempt_count !== 1) {
    throw new Error(`${kind} effect was attempted ${effect.attempt_count} times`);
  }
  return effect;
}

function assertCreatorOnlyAllocation(snapshot: Array<Record<string, unknown>>, priceCents: number, label: string): void {
  if (snapshot.length !== 1) {
    throw new Error(`${label} expected creator-only allocation, got ${JSON.stringify(snapshot)}`);
  }
  const allocation = snapshot[0]!;
  if (
    allocation.recipient_type !== "creator"
    || allocation.waterfall_position !== 70
    || allocation.share_bps !== 10000
    || allocation.amount_cents !== priceCents
    || allocation.settlement_strategy !== "story_payout"
  ) {
    throw new Error(`${label} allocation was not creator-only Story payout: ${JSON.stringify(snapshot)}`);
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    process.exit(0);
  }

  const apiBase = apiBaseUrl();
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const priceCents = Number(optionalEnv("PIRATE_STORY_E2E_PRICE_CENTS") ?? "1");
  const buyerPrivateKey = requirePrivateKey([
    "PIRATE_STORY_E2E_BUYER_PRIVATE_KEY",
    "PIRATE_CHECKOUT_SMOKE_BUYER_PRIVATE_KEY",
    "PIRATE_SMOKE_BUYER_PRIVATE_KEY",
    "PIRATE_CHECKOUT_OPERATOR_PRIVATE_KEY",
  ]);
  const authorPrivateKey = normalizePrivateKey(process.env.PIRATE_STORY_E2E_AUTHOR_PRIVATE_KEY) ?? generatePrivateKey();
  const remixerPrivateKey = normalizePrivateKey(process.env.PIRATE_STORY_E2E_REMIXER_PRIVATE_KEY) ?? generatePrivateKey();
  artifact.staging_env_fingerprint = {
    api_base_url: apiBase,
    release_version: await api<Record<string, unknown>>({ apiBase, path: "/__version", method: "GET", ok: [200, 404] }).catch((error) => ({
      error: error instanceof Error ? error.message : String(error),
    })),
  };

  step("create sessions");
  const author = await createSession({ apiBase, privateKey: authorPrivateKey, subject: `story-e2e-author-${runId}` });
  const remixer = await createSession({ apiBase, privateKey: remixerPrivateKey, subject: `story-e2e-remixer-${runId}` });
  const buyer = await createSession({ apiBase, privateKey: buyerPrivateKey, subject: `story-e2e-buyer-${runId}` });

  step("create community");
  const communityId = await createCommunity(apiBase, author, runId);
  artifact.community = { id: `com_${communityId}` };
  await joinCommunity(apiBase, communityId, author, remixer);
  await joinCommunity(apiBase, communityId, author, buyer);

  const originalBytes = makeSilentWavBytes();
  const derivativeBytes = makeSilentWavBytes();
  const originalTitle = `Story E2E Original ${runId}`;
  const derivativeTitle = `Story E2E Derivative ${runId}`;

  step("create locked original song");
  const originalBundle = await createSongBundle({
    apiBase,
    bytes: originalBytes,
    communityId,
    filename: "story-e2e-original.wav",
    session: author,
    title: originalTitle,
  });
  await waitForSongPreview({ apiBase, bundle: originalBundle, communityId, session: author, title: originalTitle });
  const originalPost = await createSongPost({
    accessMode: "locked",
    apiBase,
    bundle: originalBundle,
    communityId,
    rightsBasis: "original",
    session: author,
    songMode: "original",
    title: originalTitle,
  });
  const originalAsset = await waitForAssetReady({
    apiBase,
    asset: originalPost.asset,
    communityId,
    label: "original",
    session: author,
  });
  artifact.original = {
    asset: originalPost.asset,
    locked_delivery_status: originalAsset.locked_delivery_status ?? null,
    post: originalPost.post,
    sha256: sha256Hex(originalBytes),
    story_ip: originalAsset.story_ip ?? null,
    story_royalty_registration_status: originalAsset.story_royalty_registration_status ?? null,
  };

  step("resolve original as derivative source");
  const sources = await api<{
    items: Array<{ asset: string; source_ref?: string | null; story_ip: string; story_license_terms: string; title: string }>;
  }>({
    apiBase,
    method: "GET",
    path: `/communities/${encodeURIComponent(communityId)}/derivative-sources?kind=song&q=${encodeURIComponent(originalTitle)}`,
    token: remixer.accessToken,
  });
  const source = sources.items.find((item) => item.asset === originalPost.asset) ?? sources.items[0];
  if (!source) throw new Error("original did not appear in derivative sources");
  const upstreamAssetRefs = [source.source_ref?.trim() || `story:asset:${source.asset}`];

  step("create locked derivative song");
  const derivativeBundle = await createSongBundle({
    apiBase,
    bytes: derivativeBytes,
    communityId,
    filename: "story-e2e-derivative.wav",
    session: remixer,
    title: derivativeTitle,
  });
  await waitForSongPreview({ apiBase, bundle: derivativeBundle, communityId, session: remixer, title: derivativeTitle });
  const derivativePost = await createSongPost({
    accessMode: "locked",
    apiBase,
    bundle: derivativeBundle,
    communityId,
    rightsBasis: "derivative",
    session: remixer,
    songMode: "remix",
    title: derivativeTitle,
    upstreamAssetRefs,
  });
  const derivativeAsset = await waitForAssetReady({
    apiBase,
    asset: derivativePost.asset,
    communityId,
    label: "derivative",
    session: remixer,
  });
  if (!derivativeAsset.story_derivative_parent_ip_ids?.some((parent) => parent.toLowerCase() === originalAsset.story_ip?.toLowerCase())) {
    throw new Error(`derivative asset missing original parent IP: ${JSON.stringify(derivativeAsset)}`);
  }
  artifact.derivative = {
    asset: derivativePost.asset,
    locked_delivery_status: derivativeAsset.locked_delivery_status ?? null,
    parent_ips: derivativeAsset.story_derivative_parent_ip_ids ?? [],
    post: derivativePost.post,
    sha256: sha256Hex(derivativeBytes),
    story_ip: derivativeAsset.story_ip ?? null,
    story_royalty_registration_status: derivativeAsset.story_royalty_registration_status ?? null,
  };

  step("create listing and purchase quote");
  const listing = await api<{ id: string; price_cents: number; status: string }>({
    apiBase,
    method: "POST",
    path: `/communities/${encodeURIComponent(communityId)}/listings`,
    // CI cannot complete real Self verification; owner/admin listing preserves
    // the derivative asset purchase path while settlement still pays asset.creator_user_id.
    token: author.accessToken,
    body: {
      asset: derivativePost.asset,
      price_cents: priceCents,
      regional_pricing_enabled: false,
      status: "active",
    },
  });
  const checkoutChainId = Number(optionalEnv("PIRATE_CHECKOUT_SOURCE_CHAIN_ID") ?? "84532");
  const quote = await api<{
    allocation_snapshot: Array<Record<string, unknown>>;
    destination_settlement_amount_atomic?: string | null;
    final_price_cents: number;
    funding_destination_address?: string | null;
    id: string;
    settlement_mode: string;
  }>({
    apiBase,
    method: "POST",
    path: `/communities/${encodeURIComponent(communityId)}/purchase-quotes`,
    token: buyer.accessToken,
    body: {
      client_estimated_hop_count: 1,
      client_estimated_slippage_bps: 0,
      funding_asset: {
        asset_symbol: "USDC",
        chain_id: checkoutChainId,
        chain_namespace: "eip155",
        display_name: `USDC on ${checkoutChainName(checkoutChainId)}`,
      },
      listing: listing.id,
      route_provider: "pirate_checkout",
      source_chain: {
        chain_id: checkoutChainId,
        chain_namespace: "eip155",
        display_name: checkoutChainName(checkoutChainId),
      },
    },
  });
  if (quote.settlement_mode !== "royalty_native_story_payment") {
    throw new Error(`quote did not use royalty-native settlement: ${JSON.stringify(quote)}`);
  }
  assertCreatorOnlyAllocation(quote.allocation_snapshot, priceCents, "quote");
  artifact.listing = listing;
  artifact.quote = quote;

  step("fetch encrypted content before purchase");
  const ciphertextBefore = await apiBytes({
    apiBase,
    path: `/communities/${encodeURIComponent(communityId)}/assets/${encodeURIComponent(derivativePost.asset)}/content`,
    token: buyer.accessToken,
  });

  step("fund checkout and settle purchase");
  const fundingTx = await sendCheckoutFunding({
    buyerPrivateKey: buyer.privateKey,
    destination: (quote.funding_destination_address || checkoutOperatorAddress()) as Hex,
    finalPriceCents: quote.final_price_cents,
  });
  const settlement = await api<{
    allocations: Array<Record<string, unknown>>;
    asset?: string | null;
    id: string;
    settlement_mode: string;
    settlement_tx_ref: string;
  }>({
    apiBase,
    method: "POST",
    path: `/communities/${encodeURIComponent(communityId)}/purchase-settlements`,
    token: buyer.accessToken,
    body: {
      funding_tx_ref: fundingTx,
      quote: quote.id,
      settlement_tx_ref: fundingTx,
      settlement_wallet_attachment: buyer.walletAttachment,
    },
  });
  if (settlement.settlement_mode !== "royalty_native_story_payment") {
    throw new Error(`settlement did not use royalty-native settlement: ${JSON.stringify(settlement)}`);
  }
  assertCreatorOnlyAllocation(settlement.allocations, priceCents, "settlement");
  const replaySettlement = await api<{ id: string; settlement_tx_ref: string }>({
    apiBase,
    method: "POST",
    path: `/communities/${encodeURIComponent(communityId)}/purchase-settlements`,
    token: buyer.accessToken,
    body: {
      funding_tx_ref: fundingTx,
      quote: quote.id,
      settlement_tx_ref: fundingTx,
      settlement_wallet_attachment: buyer.walletAttachment,
    },
  });
  if (replaySettlement.id !== settlement.id) {
    throw new Error(`settlement replay returned a different purchase: ${replaySettlement.id} != ${settlement.id}`);
  }
  artifact.purchase = {
    ...settlement,
    funding_tx_ref: fundingTx,
    replay_settlement_tx_ref: replaySettlement.settlement_tx_ref,
  };

  step("verify settlement effects");
  const effectsBody = await api<{ items: SettlementEffect[] }>({
    apiBase,
    method: "GET",
    path: `/communities/${encodeURIComponent(communityId)}/purchases/${encodeURIComponent(settlement.id)}/settlement-effects`,
    token: buyer.accessToken,
  });
  artifact.settlement_effects = effectsBody.items;
  const fundingEffect = assertSingleEffect(effectsBody.items, "buyer_funding_receipt");
  const royaltyEffect = assertSingleEffect(effectsBody.items, "story_royalty_payment");
  const entitlementEffect = assertSingleEffect(effectsBody.items, "story_entitlement_mint");
  const parentVaultEffect = assertSingleEffect(effectsBody.items, "story_parent_royalty_vault_transfer");
  if (fundingEffect.settlement_ref !== fundingTx) {
    throw new Error(`funding effect settlement_ref mismatch: ${fundingEffect.settlement_ref} != ${fundingTx}`);
  }
  const royaltyTx = royaltyEffect.provider_receipt_ref || royaltyEffect.settlement_ref;
  const entitlementTx = entitlementEffect.provider_receipt_ref || entitlementEffect.settlement_ref;
  const parentVaultTx = parentVaultEffect.provider_receipt_ref || parentVaultEffect.settlement_ref;
  if (!royaltyTx || !entitlementTx || !parentVaultTx) {
    throw new Error(`missing Story tx refs: ${JSON.stringify({ royaltyTx, entitlementTx, parentVaultTx })}`);
  }
  if (royaltyTx.toLowerCase() === entitlementTx.toLowerCase()) {
    throw new Error(`royalty payment and entitlement mint used the same tx: ${royaltyTx}`);
  }
  artifact.idempotency_replay = {
    second_settlement_id: replaySettlement.id,
    royalty_tx_count: effectsBody.items.filter((effect) => effect.effect_kind === "story_royalty_payment").length,
    entitlement_mint_tx_count: effectsBody.items.filter((effect) => effect.effect_kind === "story_entitlement_mint").length,
    parent_vault_transfer_tx_count: effectsBody.items.filter((effect) => effect.effect_kind === "story_parent_royalty_vault_transfer").length,
  };
  artifact.story_txs = {
    entitlement_mint_tx_hash: entitlementTx,
    parent_vault_transfer_tx_hashes: {
      [originalAsset.story_ip ?? "unknown_parent"]: parentVaultTx,
    },
    story_royalty_payment_tx_hash: royaltyTx,
  };

  step("verify Story transaction receipts");
  const accessAfter = await api<{
    access_granted: boolean;
    decision_reason: string;
    delivery_kind: string | null;
    story_cdr_access: StoryCdrAccess | null;
  }>({
    apiBase,
    method: "GET",
    path: `/communities/${encodeURIComponent(communityId)}/assets/${encodeURIComponent(derivativePost.asset)}/access`,
    token: buyer.accessToken,
  });
  if (!accessAfter.access_granted || !accessAfter.story_cdr_access) {
    throw new Error(`buyer did not receive CDR access after purchase: ${JSON.stringify(accessAfter)}`);
  }
  const storyChain = createChain(
    accessAfter.story_cdr_access.chain_id,
    accessAfter.story_cdr_access.rpc_url,
    storyChainName(accessAfter.story_cdr_access.chain_id),
  );
  const storyPublicClient = createPublicClient({
    chain: storyChain,
    transport: http(accessAfter.story_cdr_access.rpc_url),
  });
  artifact.staging_env_fingerprint.story_chain_id = accessAfter.story_cdr_access.chain_id;
  await Promise.all([
    waitForStoryTx(storyPublicClient, royaltyTx, "story_royalty_payment_tx_hash"),
    waitForStoryTx(storyPublicClient, entitlementTx, "entitlement_mint_tx_hash"),
    waitForStoryTx(storyPublicClient, parentVaultTx, "parent_vault_transfer_tx_hash"),
  ]);

  step("decrypt purchased derivative CDR asset");
  await decryptCdrAsset({
    access: accessAfter.story_cdr_access,
    apiBase,
    buyer,
    ciphertext: ciphertextBefore,
    expectedPlaintext: derivativeBytes,
  });
}

main()
  .then(() => {
    artifact.status = "passed";
    writeArtifact();
  })
  .catch((error) => {
    artifact.status = "failed";
    artifact.failure = error instanceof Error ? error.stack ?? error.message : String(error);
    writeArtifact();
    console.error(error);
    process.exit(1);
  });
