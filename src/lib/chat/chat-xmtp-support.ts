"use client";

import { createWalletClient, custom, hexToBytes } from "viem";

import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import type { StoredSession } from "@/lib/api/session-store";
import { logger } from "@/lib/logger";
import { withTimeout } from "@/lib/promise-utils";

const XMTP_APP_VERSION = "pirate-social/1.x";
const XMTP_CLIENT_TIMEOUT_MS = 15_000;
const XMTP_REGISTER_TIMEOUT_MS = 20_000;
const XMTP_REGISTRATION_STATE_TIMEOUT_MS = 8_000;

const env = import.meta.env as ImportMetaEnv & {
  VITE_XMTP_ENV?: string;
};
const XMTP_ENV = (env.VITE_XMTP_ENV || (import.meta.env.DEV ? "dev" : "production")) as
  | "dev"
  | "production"
  | "local";

export type XmtpModule = {
  Client: {
    create: (
      signer: unknown,
      opts: {
        appVersion?: string;
        dbPath?: string | null;
        disableAutoRegister?: boolean;
        env: "dev" | "production" | "local";
      },
    ) => Promise<unknown>;
  };
  ConsentState: {
    Allowed: unknown;
    Unknown: unknown;
  };
  IdentifierKind: {
    Ethereum: unknown;
  };
};

export type XmtpAccountIdentifier = {
  identifier?: unknown;
  identifierKind?: unknown;
};

export type XmtpMember = {
  accountIdentifiers?: XmtpAccountIdentifier[];
  inboxId?: string;
};

export type XmtpMessage = {
  conversation?: { id?: unknown };
  conversationId?: unknown;
  content?: unknown;
  fallback?: unknown;
  id?: unknown;
  senderInboxId?: unknown;
  sentAt?: unknown;
};

export type XmtpDm = {
  createdAt?: unknown;
  createdAtNs?: unknown;
  duplicateDms?: () => Promise<XmtpDm[]>;
  id?: unknown;
  members?: () => Promise<XmtpMember[]>;
  messages: () => Promise<XmtpMessage[]>;
  peerAddress?: unknown;
  peerInboxId?: string | (() => Promise<string | null>);
  sendText: (content: string) => Promise<unknown>;
  sync?: () => Promise<unknown>;
};

export type XmtpClient = {
  close?: () => void;
  conversations: {
    createDm: (inboxId: string) => Promise<XmtpDm>;
    getConversationById?: (conversationId: string) => Promise<XmtpDm | null>;
    getDmByInboxId: (inboxId: string) => Promise<XmtpDm | null>;
    listDms: (options: { consentStates: unknown[] }) => Promise<XmtpDm[]>;
    streamAllMessages?: (options: {
      consentStates: unknown[];
      onError?: (error: unknown) => void;
      onValue: (message: XmtpMessage) => void;
    }) => Promise<{ return?: () => Promise<unknown> | unknown }>;
    syncAll: (consentStates: unknown[]) => Promise<unknown>;
    topic?: unknown;
  };
  fetchInboxIdByIdentifier: (identifier: {
    identifier: `0x${string}`;
    identifierKind: unknown;
  }) => Promise<string | null>;
  inboxId?: unknown;
  installationId?: unknown;
  isRegistered: () => Promise<boolean>;
  register: () => Promise<unknown>;
};

export class XmtpRegistrationRequiredError extends Error {
  constructor() {
    super("Enable encrypted messages to use chat.");
    this.name = "XmtpRegistrationRequiredError";
  }
}

let modulePromise: Promise<XmtpModule> | null = null;

export type XmtpClientCache = {
  clientInstance: XmtpClient | null;
  clientPromise: Promise<XmtpClient> | null;
  clientWalletAddress: string | null;
  registrationPromise: Promise<void> | null;
};

export const conversationCache = new Map<string, XmtpDm>();
let sharedClientCache: XmtpClientCache | null = null;

function logXmtp(event: string, payload?: Record<string, unknown>) {
  logger.info(`[chat:xmtp] ${event}`, payload ?? {});
}

function warnXmtp(event: string, payload?: Record<string, unknown>) {
  logger.warn(`[chat:xmtp] ${event}`, payload ?? {});
}

export function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

export function warnXmtpFallback(event: string, error: unknown, context?: Record<string, unknown>) {
  logger.warn(`[chat:xmtp] ${event}`, {
    ...context,
    error: formatErrorMessage(error),
  });
}

export async function fallbackNull<T>(
  promise: Promise<T>,
  event: string,
  context?: Record<string, unknown>,
): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    warnXmtpFallback(event, error, context);
    return null;
  }
}

export async function fallbackArray<T>(
  promise: Promise<T[]>,
  event: string,
  context?: Record<string, unknown>,
): Promise<T[]> {
  try {
    return await promise;
  } catch (error) {
    warnXmtpFallback(event, error, context);
    return [];
  }
}

export function isLikelyXmtpTabContentionError(error: unknown): boolean {
  const message = formatErrorMessage(error).toLowerCase();
  return message.includes("database")
    || message.includes("sqlite")
    || message.includes("opfs")
    || message.includes("lock")
    || message.includes("busy");
}

export function createXmtpClientCache(): XmtpClientCache {
  return {
    clientInstance: null,
    clientPromise: null,
    clientWalletAddress: null,
    registrationPromise: null,
  };
}

export function getSharedXmtpClientCache(): XmtpClientCache {
  sharedClientCache ??= createXmtpClientCache();
  return sharedClientCache;
}

export function resetXmtpClientCache(cache: XmtpClientCache): void {
  try {
    cache.clientInstance?.close?.();
  } catch {
    // Ignore close failures. The cache reset is best effort on logout or wallet switch.
  }
  cache.clientPromise = null;
  cache.clientInstance = null;
  cache.clientWalletAddress = null;
  cache.registrationPromise = null;
  conversationCache.clear();
}

export async function loadXmtpModule(): Promise<XmtpModule> {
  if (!modulePromise) {
    logXmtp("module:load:start");
    modulePromise = import("@xmtp/browser-sdk")
      .then((module) => {
        logXmtp("module:load:success");
        return module as unknown as XmtpModule;
      })
      .catch((error) => {
        modulePromise = null;
        warnXmtp("module:load:error", {
          error: formatErrorMessage(error),
        });
        throw new Error(`Failed to load XMTP: ${formatErrorMessage(error)}`);
      });
  }
  return modulePromise;
}

export { withTimeout };

function createConnectedWalletSigner(
  module: XmtpModule,
  wallet: PirateConnectedEvmWallet,
  walletAddress: `0x${string}`,
) {
  return {
    type: "EOA" as const,
    getIdentifier: () => ({
      identifier: walletAddress,
      identifierKind: module.IdentifierKind.Ethereum,
    }),
    signMessage: async (message: string) => {
      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: walletAddress,
        transport: custom(provider as never),
      });
      return hexToBytes(await walletClient.signMessage({
        account: walletAddress,
        message,
      }));
    },
  };
}

export function getSessionWalletAddress(session: StoredSession): `0x${string}` | null {
  const primary = session.profile.primary_wallet_address?.trim().toLowerCase();
  if (primary?.match(/^0x[a-f0-9]{40}$/)) return primary as `0x${string}`;
  const attached = session.walletAttachments[0]?.wallet_address?.trim().toLowerCase();
  return attached?.match(/^0x[a-f0-9]{40}$/) ? (attached as `0x${string}`) : null;
}

export function resolveXmtpSignerWallet(
  session: StoredSession,
  connectedWallets: readonly PirateConnectedEvmWallet[],
): PirateConnectedEvmWallet | null {
  const walletAddress = getSessionWalletAddress(session);
  if (!walletAddress) return null;
  return connectedWallets.find((wallet) => wallet.address.toLowerCase() === walletAddress) ?? null;
}

function clientOptions(walletAddress: `0x${string}`) {
  return {
    appVersion: XMTP_APP_VERSION,
    dbPath: `pirate-xmtp-${XMTP_ENV}-${walletAddress}.db3`,
    disableAutoRegister: true,
    env: XMTP_ENV,
  } as const;
}

async function createClient(
  module: XmtpModule,
  walletAddress: `0x${string}`,
  signerWallet: PirateConnectedEvmWallet,
): Promise<XmtpClient> {
  const dbPath = clientOptions(walletAddress).dbPath;
  logXmtp("client:create:start", {
    dbPath,
    env: XMTP_ENV,
    signerWalletAddress: signerWallet.address,
    walletAddress,
  });
  return withTimeout<XmtpClient>(
    module.Client.create(createConnectedWalletSigner(module, signerWallet, walletAddress), clientOptions(walletAddress)) as Promise<XmtpClient>,
    XMTP_CLIENT_TIMEOUT_MS,
    "Timed out starting XMTP chat.",
  );
}

async function registerClientOrClose(client: XmtpClient, cache: XmtpClientCache): Promise<void> {
  try {
    await withTimeout(client.register(), XMTP_REGISTER_TIMEOUT_MS, "Timed out enabling encrypted chat.");
  } catch (error) {
    try {
      client.close?.();
    } catch {
      // Best effort.
    }
    if (cache.clientInstance === client) {
      cache.clientPromise = null;
      cache.clientInstance = null;
      cache.clientWalletAddress = null;
    }
    throw error;
  }
}

async function ensureClientRegistered(
  client: XmtpClient,
  cache: XmtpClientCache,
  walletAddress: `0x${string}`,
): Promise<void> {
  if (!cache.registrationPromise) {
    logXmtp("registration:start", {
      inboxId: typeof client?.inboxId === "string" ? client.inboxId : null,
      installationId: typeof client?.installationId === "string" ? client.installationId : null,
      walletAddress,
    });
    const registrationPromise = registerClientOrClose(client, cache);
    cache.registrationPromise = registrationPromise;
    registrationPromise
      .then(() => {
        logXmtp("registration:success", {
          inboxId: typeof client?.inboxId === "string" ? client.inboxId : null,
          installationId: typeof client?.installationId === "string" ? client.installationId : null,
          walletAddress,
        });
      })
      .catch((error) => {
        warnXmtp("registration:error", {
          error,
          message: formatErrorMessage(error),
          inboxId: typeof client?.inboxId === "string" ? client.inboxId : null,
          installationId: typeof client?.installationId === "string" ? client.installationId : null,
          walletAddress,
        });
      })
      .finally(() => {
        if (cache.registrationPromise === registrationPromise) {
          cache.registrationPromise = null;
        }
      });
  }

  await cache.registrationPromise;
}

export async function ensureXmtpClient(
  session: StoredSession,
  options: { allowRegistration: boolean; cache: XmtpClientCache; signerWallet?: PirateConnectedEvmWallet | null },
): Promise<{ client: XmtpClient; module: XmtpModule; walletAddress: `0x${string}` }> {
  const { cache } = options;
  const walletAddress = getSessionWalletAddress(session);
  if (!walletAddress) {
    resetXmtpClientCache(cache);
    throw new Error("Connect an Ethereum wallet to use encrypted chat.");
  }

  if (cache.clientWalletAddress && cache.clientWalletAddress !== walletAddress) {
    logXmtp("client:reset:wallet-changed", {
      nextWalletAddress: walletAddress,
      previousWalletAddress: cache.clientWalletAddress,
    });
    resetXmtpClientCache(cache);
  }

  const signerWallet = options.signerWallet?.address.toLowerCase() === walletAddress
    ? options.signerWallet
    : null;
  if (!signerWallet) {
    throw new XmtpRegistrationRequiredError();
  }

  const module = await loadXmtpModule();

  if (cache.clientInstance && cache.clientWalletAddress === walletAddress) {
    logXmtp("client:cache:hit", {
      allowRegistration: options.allowRegistration,
      inboxId: typeof cache.clientInstance?.inboxId === "string" ? cache.clientInstance.inboxId : null,
      installationId: typeof cache.clientInstance?.installationId === "string" ? cache.clientInstance.installationId : null,
      walletAddress,
    });
    const isRegistered = await withTimeout<boolean>(
      cache.clientInstance.isRegistered(),
      XMTP_REGISTRATION_STATE_TIMEOUT_MS,
      "Timed out checking XMTP registration.",
    );
    logXmtp("registration:state", {
      allowRegistration: options.allowRegistration,
      inboxId: typeof cache.clientInstance?.inboxId === "string" ? cache.clientInstance.inboxId : null,
      installationId: typeof cache.clientInstance?.installationId === "string" ? cache.clientInstance.installationId : null,
      isRegistered,
      walletAddress,
    });
    if (!isRegistered && !options.allowRegistration) {
      throw new XmtpRegistrationRequiredError();
    }
    if (!isRegistered) {
      await ensureClientRegistered(cache.clientInstance, cache, walletAddress);
    }
    return { client: cache.clientInstance, module, walletAddress };
  }

  if (!cache.clientPromise) {
    cache.clientPromise = createClient(module, walletAddress, signerWallet)
      .then((client) => {
        cache.clientInstance = client;
        cache.clientWalletAddress = walletAddress;
        logXmtp("client:create:success", {
          inboxId: typeof client?.inboxId === "string" ? client.inboxId : null,
          installationId: typeof client?.installationId === "string" ? client.installationId : null,
          walletAddress,
        });
        return client;
      })
      .catch((error) => {
        cache.clientPromise = null;
        cache.clientInstance = null;
        cache.clientWalletAddress = null;
        warnXmtp("client:create:error", {
          error: formatErrorMessage(error),
          env: XMTP_ENV,
          walletAddress,
        });
        throw error;
      });
  }

  const client = await cache.clientPromise;
  const isRegistered = await withTimeout<boolean>(
    client.isRegistered(),
    XMTP_REGISTRATION_STATE_TIMEOUT_MS,
    "Timed out checking XMTP registration.",
  );
  logXmtp("registration:state", {
    allowRegistration: options.allowRegistration,
    inboxId: typeof client?.inboxId === "string" ? client.inboxId : null,
    installationId: typeof client?.installationId === "string" ? client.installationId : null,
    isRegistered,
    walletAddress,
  });
  if (!isRegistered && !options.allowRegistration) {
    throw new XmtpRegistrationRequiredError();
  }
  if (!isRegistered) {
    await ensureClientRegistered(client, cache, walletAddress);
  }
  return { client, module, walletAddress };
}

export function getAllowedConsentStates(module: XmtpModule): unknown[] {
  return [module.ConsentState.Allowed, module.ConsentState.Unknown];
}

const XMTP_REGISTRATION_HINT_PREFIX = "pirate.xmtp.registered.v1";

export function getXmtpRegistrationHint(walletAddress: string): boolean {
  try {
    return typeof window !== "undefined"
      && window.localStorage.getItem(`${XMTP_REGISTRATION_HINT_PREFIX}:${walletAddress}`) === "1";
  } catch {
    return false;
  }
}

export function setXmtpRegistrationHint(walletAddress: string): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`${XMTP_REGISTRATION_HINT_PREFIX}:${walletAddress}`, "1");
    }
  } catch {
    // Ignore storage errors.
  }
}
