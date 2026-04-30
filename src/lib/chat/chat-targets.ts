"use client";

import { createPublicClient, fallback, http } from "viem";
import { mainnet } from "viem/chains";

import type { ApiClient } from "@/lib/api/client";
import { getPirateNetworkConfig } from "@/lib/network-config";
import { buildPublicProfilePath } from "@/lib/profile-routing";
import { normalizeChatTarget, normalizeEthereumAddress, shortAddress } from "./chat-addressing";

const PEER_METADATA_STORAGE_KEY = "pirate.web.xmtp.peer-metadata.v1";
const PEER_METADATA_MISS_STORAGE_KEY = "pirate.web.xmtp.peer-metadata-misses.v1";
const MAX_STORED_PEERS = 200;
const PEER_METADATA_MISS_TTL_MS = 24 * 60 * 60 * 1000;

export interface ResolvedChatTarget {
  address: `0x${string}`;
  avatarSeed?: string;
  avatarUrl?: string;
  handle?: string;
  profileHref?: string;
  title: string;
}

let ensClient: ReturnType<typeof createPublicClient> | null = null;
const peerMetadataCache = new Map<string, ResolvedChatTarget | null>();

type StoredPeerMetadataMiss = {
  address: `0x${string}`;
  checkedAt: number;
};

function getEnsClient() {
  if (!ensClient) {
    const env = import.meta.env as ImportMetaEnv & {
      VITE_ETH_MAINNET_RPC_URL?: string;
    };
    const configuredMainnetRpc = typeof env.VITE_ETH_MAINNET_RPC_URL === "string"
      ? env.VITE_ETH_MAINNET_RPC_URL.trim()
      : "";
    const efpMainnetRpc = getPirateNetworkConfig().efp.rpcUrlsByChainId[mainnet.id];
    const transports = [configuredMainnetRpc, efpMainnetRpc, mainnet.rpcUrls.default.http[0]]
      .filter((url): url is string => Boolean(url));

    ensClient = createPublicClient({
      chain: mainnet,
      transport: fallback(transports.map((url) => http(url))),
    });
  }
  return ensClient;
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function metadataKey(address: `0x${string}`): string {
  return address.toLowerCase();
}

function readStoredPeerMetadata(): ResolvedChatTarget[] {
  const raw = storage()?.getItem(PEER_METADATA_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ResolvedChatTarget[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => normalizeEthereumAddress(item.address))
      : [];
  } catch {
    return [];
  }
}

function writeStoredPeerMetadata(items: ResolvedChatTarget[]): void {
  const store = storage();
  if (!store) return;
  store.setItem(PEER_METADATA_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_STORED_PEERS)));
}

function readStoredPeerMetadataMisses(): StoredPeerMetadataMiss[] {
  const raw = storage()?.getItem(PEER_METADATA_MISS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredPeerMetadataMiss[];
    const now = Date.now();
    return Array.isArray(parsed)
      ? parsed.filter((item) => (
          normalizeEthereumAddress(item.address)
          && Number.isFinite(item.checkedAt)
          && now - item.checkedAt < PEER_METADATA_MISS_TTL_MS
        ))
      : [];
  } catch {
    return [];
  }
}

function writeStoredPeerMetadataMisses(items: StoredPeerMetadataMiss[]): void {
  const store = storage();
  if (!store) return;
  store.setItem(PEER_METADATA_MISS_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_STORED_PEERS)));
}

export function rememberResolvedChatTarget(target: ResolvedChatTarget): void {
  const normalizedAddress = normalizeEthereumAddress(target.address);
  if (!normalizedAddress) return;
  const normalized = { ...target, address: normalizedAddress };
  peerMetadataCache.set(metadataKey(normalizedAddress), normalized);

  const current = readStoredPeerMetadata().filter((item) => metadataKey(item.address) !== metadataKey(normalizedAddress));
  writeStoredPeerMetadata([normalized, ...current]);
  writeStoredPeerMetadataMisses(readStoredPeerMetadataMisses().filter((item) => metadataKey(item.address) !== metadataKey(normalizedAddress)));
}

function getStoredPeerMetadata(address: `0x${string}`): ResolvedChatTarget | null {
  const key = metadataKey(address);
  if (peerMetadataCache.has(key)) return peerMetadataCache.get(key) ?? null;

  const stored = readStoredPeerMetadata().find((item) => metadataKey(item.address) === key) ?? null;
  peerMetadataCache.set(key, stored);
  return stored;
}

function hasRecentStoredPeerMetadataMiss(address: `0x${string}`): boolean {
  const key = metadataKey(address);
  return readStoredPeerMetadataMisses().some((item) => metadataKey(item.address) === key);
}

function rememberPeerMetadataMiss(address: `0x${string}`): void {
  const key = metadataKey(address);
  peerMetadataCache.set(key, null);
  const current = readStoredPeerMetadataMisses().filter((item) => metadataKey(item.address) !== key);
  writeStoredPeerMetadataMisses([{ address, checkedAt: Date.now() }, ...current]);
}

function resolvedTargetFromPublicProfile(
  address: `0x${string}`,
  resolution: Awaited<ReturnType<ApiClient["publicProfiles"]["getByHandle"]>>,
): ResolvedChatTarget {
  const displayHandle = resolution.resolved_handle_label || resolution.profile.global_handle.label;
  return {
    address,
    avatarSeed: resolution.profile.id,
    avatarUrl: resolution.profile.avatar_ref ?? undefined,
    handle: displayHandle,
    profileHref: buildPublicProfilePath(displayHandle),
    title: resolution.profile.display_name ?? displayHandle,
  };
}

export async function resolveChatPeerMetadata(
  address: `0x${string}`,
  api?: ApiClient,
): Promise<ResolvedChatTarget | null> {
  const stored = getStoredPeerMetadata(address);
  if (stored) return stored;

  if (api) {
    try {
      const resolution = await api.publicProfiles.getByWalletAddress(address);
      const resolvedAddress = normalizeEthereumAddress(resolution.profile.primary_wallet_address ?? "");
      if (resolvedAddress?.toLowerCase() === address.toLowerCase()) {
        const target = resolvedTargetFromPublicProfile(address, resolution);
        rememberResolvedChatTarget(target);
        return target;
      }
    } catch {
      // Fall through to ENS reverse resolution for non-Pirate users.
    }
  }

  if (hasRecentStoredPeerMetadataMiss(address)) {
    peerMetadataCache.set(metadataKey(address), null);
    return null;
  }

  try {
    const name = await getEnsClient().getEnsName({ address });
    if (!name) {
      rememberPeerMetadataMiss(address);
      return null;
    }
    const resolved = await getEnsClient().getEnsAddress({ name });
    const normalizedResolved = resolved ? normalizeEthereumAddress(resolved) : null;
    if (normalizedResolved?.toLowerCase() !== address.toLowerCase()) {
      rememberPeerMetadataMiss(address);
      return null;
    }
    const target = {
      address,
      avatarSeed: address,
      handle: name,
      title: name,
    } satisfies ResolvedChatTarget;
    rememberResolvedChatTarget(target);
    return target;
  } catch {
    rememberPeerMetadataMiss(address);
    return null;
  }
}

export async function resolveChatTarget(
  api: ApiClient,
  rawTarget: string,
): Promise<ResolvedChatTarget> {
  const target = normalizeChatTarget(rawTarget);
  if (!target) {
    throw new Error("Enter name.pirate, name.eth, or an Ethereum wallet address.");
  }

  const address = normalizeEthereumAddress(target);
  if (address) {
    return {
      address,
      avatarSeed: address,
      title: shortAddress(address),
    };
  }

  if (target.endsWith(".pirate")) {
    const resolution = await api.publicProfiles.getByHandle(target);
    const walletAddress = normalizeEthereumAddress(resolution.profile.primary_wallet_address ?? "");
    if (!walletAddress) {
      throw new Error("That Pirate profile does not have a messageable wallet.");
    }

    const displayHandle = resolution.resolved_handle_label || target;
    const resolved = resolvedTargetFromPublicProfile(walletAddress, {
      ...resolution,
      resolved_handle_label: displayHandle,
    });
    rememberResolvedChatTarget(resolved);
    return resolved;
  }

  if (target.endsWith(".eth")) {
    const ensAddress = await getEnsClient().getEnsAddress({ name: target });
    const walletAddress = ensAddress ? normalizeEthereumAddress(ensAddress) : null;
    if (!walletAddress) {
      throw new Error("That ENS name did not resolve to an Ethereum wallet.");
    }
    const resolved = {
      address: walletAddress,
      avatarSeed: walletAddress,
      handle: target,
      title: target,
    } satisfies ResolvedChatTarget;
    rememberResolvedChatTarget(resolved);
    return resolved;
  }

  throw new Error("Enter name.pirate, name.eth, or an Ethereum wallet address.");
}
