import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  Client,
  IdentifierKind,
  type ClientOptions,
  type Dm,
  type ConsentState,
  type GroupMember,
  type Identifier,
  type Signer,
  createBackend,
  getInboxIdForIdentifier,
} from "@xmtp/node-sdk";
import { privateKeyToAccount } from "viem/accounts";

type HarnessEnv = "local" | "dev" | "production";

type ClientConfig = {
  appVersion: string;
  dbEncryptionKey?: `0x${string}`;
  dbPath: string;
  env: HarnessEnv;
  logLabel: string;
  privateKey: `0x${string}`;
};

const DEFAULT_APP_VERSION = "pirate-social/xmtp-dev-harness";

export function getHarnessEnv(): HarnessEnv {
  const raw = process.env.XMTP_ENV?.trim();
  if (raw === "local" || raw === "dev" || raw === "production") return raw;
  return "dev";
}

export function getRequiredAddress(name: string): `0x${string}` {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value?.match(/^0x[a-f0-9]{40}$/)) {
    throw new Error(`Missing or invalid ${name}. Expected a 0x-prefixed 40-byte address.`);
  }
  return value as `0x${string}`;
}

export function getRequiredPrivateKey(name = "XMTP_PRIVATE_KEY"): `0x${string}` {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value?.match(/^0x[a-f0-9]{64}$/)) {
    throw new Error(`Missing or invalid ${name}. Expected a 0x-prefixed 32-byte private key.`);
  }
  return value as `0x${string}`;
}

export function getOptionalMessage(argv: string[]): string | null {
  const fromArgs = argv.join(" ").trim();
  if (fromArgs) return fromArgs;
  const fromEnv = process.env.XMTP_MESSAGE?.trim();
  return fromEnv ? fromEnv : null;
}

export function getConsentStates(): ConsentState[] {
  return [1 as ConsentState, 0 as ConsentState];
}

export function getIdentifier(address: `0x${string}`): Identifier {
  return {
    identifier: address,
    identifierKind: IdentifierKind.Ethereum,
  };
}

export function shortHex(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function hexToBytes(hex: string): Uint8Array {
  const raw = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(raw.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(raw.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

function parseDbEncryptionKey(): `0x${string}` | undefined {
  const raw = process.env.XMTP_DB_ENCRYPTION_KEY?.trim().toLowerCase();
  if (!raw) return undefined;
  if (!raw.match(/^0x[a-f0-9]{64}$/)) {
    throw new Error("XMTP_DB_ENCRYPTION_KEY must be a 32-byte hex string.");
  }
  return raw as `0x${string}`;
}

function defaultDbPath(label: string, env: HarnessEnv, address: `0x${string}`): string {
  return resolve(process.cwd(), ".xmtp-dev", `${label}-${env}-${address}.db3`);
}

async function ensureParentDir(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

function createSigner(privateKey: `0x${string}`): Signer {
  const account = privateKeyToAccount(privateKey);
  return {
    type: "EOA",
    getIdentifier: () => getIdentifier(account.address.toLowerCase() as `0x${string}`),
    signMessage: async (message: string) => hexToBytes(await account.signMessage({ message })),
  };
}

export function logJson(event: string, payload: Record<string, unknown>): void {
  console.log(`[xmtp-dev] ${event} ${JSON.stringify(payload, null, 2)}`);
}

export function getClientConfig(logLabel: string): ClientConfig {
  const privateKey = getRequiredPrivateKey();
  const account = privateKeyToAccount(privateKey);
  const env = getHarnessEnv();
  const dbPath = process.env.XMTP_DB_PATH?.trim() || defaultDbPath(logLabel, env, account.address.toLowerCase() as `0x${string}`);

  return {
    appVersion: process.env.XMTP_APP_VERSION?.trim() || DEFAULT_APP_VERSION,
    dbEncryptionKey: parseDbEncryptionKey(),
    dbPath,
    env,
    logLabel,
    privateKey,
  };
}

export async function createHarnessClient(logLabel: string): Promise<Client<any>> {
  const config = getClientConfig(logLabel);
  await ensureParentDir(config.dbPath);
  const signer = createSigner(config.privateKey);
  const clientOptions: ClientOptions = {
    appVersion: config.appVersion,
    dbEncryptionKey: config.dbEncryptionKey,
    dbPath: config.dbPath,
    disableAutoRegister: true,
    env: config.env,
  };
  const client = await Client.create(signer, clientOptions);

  if (!client.isRegistered) {
    logJson("client:register:start", {
      env: client.env,
      inboxId: client.inboxId,
      installationId: client.installationId,
      logLabel,
    });
    await client.register();
    logJson("client:register:success", {
      env: client.env,
      inboxId: client.inboxId,
      installationId: client.installationId,
      logLabel,
    });
  }

  logJson("client:ready", {
    accountIdentifier: client.accountIdentifier?.identifier ?? null,
    appVersion: client.appVersion ?? null,
    dbPath: config.dbPath,
    env: client.env,
    inboxId: client.inboxId,
    installationId: client.installationId,
    isRegistered: client.isRegistered,
    logLabel,
  });

  return client;
}

export async function resolvePeer(address: `0x${string}`, env: HarnessEnv) {
  const identifier = getIdentifier(address);
  const backend = await createBackend({ env });
  const inboxId = await getInboxIdForIdentifier(backend, identifier);
  const canMessage = await Client.canMessage([identifier], env);

  return {
    canMessage: canMessage.get(identifier.identifier) ?? false,
    identifier,
    inboxId,
  };
}

export async function describeMembers(members: GroupMember[]) {
  return members.map((member) => ({
    accountIdentifiers: member.accountIdentifiers.map((account) => ({
      identifier: account.identifier,
      identifierKind: String(account.identifierKind),
    })),
    consentState: String(member.consentState),
    inboxId: member.inboxId,
    installationIds: member.installationIds,
    permissionLevel: String(member.permissionLevel),
  }));
}

export async function describeDm(dm: Dm) {
  const [members, duplicates, messages] = await Promise.all([
    dm.members(),
    dm.duplicateDms(),
    dm.messages(),
  ]);

  return {
    conversationId: dm.id,
    createdAt: dm.createdAt?.toISOString?.() ?? null,
    duplicateConversationIds: duplicates.map((candidate) => candidate.id),
    members: await describeMembers(members),
    messageCount: messages.length,
    messages: messages.map((message) => ({
      content: typeof message.content === "string" ? message.content : message.fallback ?? null,
      id: message.id,
      senderInboxId: message.senderInboxId,
      sentAt: message.sentAt.toISOString(),
    })),
    peerInboxId: dm.peerInboxId,
  };
}

export async function dumpDms(client: Client<any>, reason: string): Promise<void> {
  const dms = client.conversations.listDms();
  const rows = await Promise.all(dms.map((dm) => describeDm(dm)));
  logJson("dms", {
    count: rows.length,
    inboxId: client.inboxId,
    reason,
    rows,
  });
}
