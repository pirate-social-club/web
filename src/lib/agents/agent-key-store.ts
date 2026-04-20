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

  return await new Promise((resolve, reject) => {
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
