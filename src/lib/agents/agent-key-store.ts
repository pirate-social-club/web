"use client";

export type StoredOwnedAgentKey = {
  agentId: string;
  displayName: string;
  ownershipProvider: "self_agent_id" | "clawkey";
  publicKeyPem: string;
  privateKeyPem: string;
  createdAt: string;
  updatedAt: string;
};

const DATABASE_NAME = "pirate-owned-agent-keys";
const DATABASE_VERSION = 1;
const STORE_NAME = "agent_keys";
const LEGACY_LOCAL_STORAGE_KEY = "pirate:owned-agent-keys:v1";
let legacyMigrationComplete = false;
let legacyMigrationPromise: Promise<void> | null = null;

function getIndexedDb(): IDBFactory {
  if (typeof globalThis.indexedDB === "undefined") {
    throw new Error("This browser does not support secure agent key storage.");
  }
  return globalThis.indexedDB;
}

function normalizeStoredOwnedAgentKey(value: unknown): StoredOwnedAgentKey | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.agentId !== "string"
    || typeof record.displayName !== "string"
    || (record.ownershipProvider !== "self_agent_id" && record.ownershipProvider !== "clawkey")
    || typeof record.publicKeyPem !== "string"
    || typeof record.privateKeyPem !== "string"
    || typeof record.createdAt !== "string"
    || typeof record.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    agentId: record.agentId,
    displayName: record.displayName,
    ownershipProvider: record.ownershipProvider,
    publicKeyPem: record.publicKeyPem,
    privateKeyPem: record.privateKeyPem,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function openAgentKeyDatabase(): Promise<IDBDatabase> {
  const indexedDb = getIndexedDb();

  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDb.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "agentId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open agent key database."));
  });

  await migrateLegacyAgentKeysIfNeeded(database);
  return database;
}

function runStoreRequest<T>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Agent key storage request failed."));
    transaction.onerror = () => reject(transaction.error ?? new Error("Agent key storage transaction failed."));
  });
}

function readLegacyStoredAgentKeys(): StoredOwnedAgentKey[] {
  if (typeof globalThis.localStorage === "undefined") {
    return [];
  }

  try {
    const raw = globalThis.localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed
        .map((value) => normalizeStoredOwnedAgentKey(value))
        .filter((value): value is StoredOwnedAgentKey => value !== null)
      : [];
  } catch {
    return [];
  }
}

async function migrateLegacyAgentKeysIfNeeded(database: IDBDatabase): Promise<void> {
  if (legacyMigrationComplete) {
    return;
  }
  if (!legacyMigrationPromise) {
    legacyMigrationPromise = (async () => {
      const legacyRecords = readLegacyStoredAgentKeys();
      if (!legacyRecords.length) {
        legacyMigrationComplete = true;
        return;
      }

      for (const record of legacyRecords) {
        await runStoreRequest(database, "readwrite", (store) => store.put(record));
      }

      try {
        globalThis.localStorage?.removeItem(LEGACY_LOCAL_STORAGE_KEY);
      } catch {
        // Ignore browsers that deny localStorage writes after successful import.
      }
      legacyMigrationComplete = true;
    })().finally(() => {
      legacyMigrationPromise = null;
    });
  }

  await legacyMigrationPromise;
}

export async function listStoredOwnedAgentKeys(): Promise<StoredOwnedAgentKey[]> {
  const database = await openAgentKeyDatabase();
  try {
    const values = await runStoreRequest(database, "readonly", (store) => store.getAll());
    return Array.isArray(values)
      ? values
        .map((value) => normalizeStoredOwnedAgentKey(value))
        .filter((value): value is StoredOwnedAgentKey => value !== null)
      : [];
  } finally {
    database.close();
  }
}

export async function findStoredOwnedAgentKey(agentId: string): Promise<StoredOwnedAgentKey | null> {
  const database = await openAgentKeyDatabase();
  try {
    const value = await runStoreRequest(database, "readonly", (store) => store.get(agentId));
    return normalizeStoredOwnedAgentKey(value);
  } finally {
    database.close();
  }
}

export async function saveStoredOwnedAgentKey(record: StoredOwnedAgentKey): Promise<void> {
  const database = await openAgentKeyDatabase();
  try {
    await runStoreRequest(database, "readwrite", (store) => store.put(record));
  } finally {
    database.close();
  }
}

export async function removeStoredOwnedAgentKey(agentId: string): Promise<void> {
  const database = await openAgentKeyDatabase();
  try {
    await runStoreRequest(database, "readwrite", (store) => store.delete(agentId));
  } finally {
    database.close();
  }
}

export function __resetAgentKeyStoreForTests(): void {
  legacyMigrationComplete = false;
  legacyMigrationPromise = null;
}
