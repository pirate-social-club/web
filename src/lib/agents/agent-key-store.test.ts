import { describe, expect, test } from "bun:test";

import {
  findStoredOwnedAgentKey,
  listStoredOwnedAgentKeys,
  removeStoredOwnedAgentKey,
  saveStoredOwnedAgentKey,
  type StoredOwnedAgentKey,
} from "./agent-key-store";

type MockRequest<T> = IDBRequest<T> & {
  result: T;
  error: DOMException | null;
  onsuccess: ((this: IDBRequest<T>, ev: Event) => unknown) | null;
  onerror: ((this: IDBRequest<T>, ev: Event) => unknown) | null;
};

function createSuccessRequest<T>(result: T): MockRequest<T> {
  const request = {
    result,
    error: null,
    onsuccess: null,
    onerror: null,
  } as MockRequest<T>;

  queueMicrotask(() => {
    request.onsuccess?.call(request, new Event("success"));
  });

  return request;
}

class MockObjectStore {
  private readonly records: Map<string, unknown>;

  constructor(records: Map<string, unknown>) {
    this.records = records;
  }

  getAll(): IDBRequest<unknown[]> {
    return createSuccessRequest(Array.from(this.records.values())) as IDBRequest<unknown[]>;
  }

  get(key: string): IDBRequest<unknown> {
    return createSuccessRequest(this.records.get(key)) as IDBRequest<unknown>;
  }

  put(value: StoredOwnedAgentKey): IDBRequest<IDBValidKey> {
    this.records.set(value.agentId, structuredClone(value));
    return createSuccessRequest(value.agentId) as IDBRequest<IDBValidKey>;
  }

  delete(key: string): IDBRequest<undefined> {
    this.records.delete(key);
    return createSuccessRequest(undefined) as IDBRequest<undefined>;
  }
}

class MockTransaction {
  error: DOMException | null = null;
  onerror: ((this: IDBTransaction, ev: Event) => unknown) | null = null;
  private readonly records: Map<string, unknown>;

  constructor(records: Map<string, unknown>) {
    this.records = records;
  }

  objectStore(): IDBObjectStore {
    return new MockObjectStore(this.records) as unknown as IDBObjectStore;
  }
}

class MockDatabase {
  private hasStore = false;
  private readonly records: Map<string, unknown>;
  readonly objectStoreNames = {
    contains: (name: string) => this.hasStore && name === "agent_keys",
  };

  constructor(records: Map<string, unknown>) {
    this.records = records;
  }

  createObjectStore(): IDBObjectStore {
    this.hasStore = true;
    return new MockObjectStore(this.records) as unknown as IDBObjectStore;
  }

  transaction(): IDBTransaction {
    return new MockTransaction(this.records) as unknown as IDBTransaction;
  }

  close(): void {}
}

class MockIndexedDbFactory {
  private readonly records: Map<string, unknown>;
  private readonly database: MockDatabase;

  constructor(records: Map<string, unknown>) {
    this.records = records;
    this.database = new MockDatabase(records);
  }

  open(): IDBOpenDBRequest {
    const request = {
      result: this.database as unknown as IDBDatabase,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    } as IDBOpenDBRequest & {
      result: IDBDatabase;
      error: DOMException | null;
      onsuccess: ((this: IDBOpenDBRequest, ev: Event) => unknown) | null;
      onerror: ((this: IDBOpenDBRequest, ev: Event) => unknown) | null;
      onupgradeneeded: ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => unknown) | null;
    };

    queueMicrotask(() => {
      if (!this.database.objectStoreNames.contains("agent_keys")) {
        request.onupgradeneeded?.call(request, new Event("upgradeneeded") as IDBVersionChangeEvent);
      }
      request.onsuccess?.call(request, new Event("success"));
    });

    return request;
  }
}

const originalIndexedDb = globalThis.indexedDB;

const EXAMPLE_RECORD: StoredOwnedAgentKey = {
  agentId: "agt_test_123",
  displayName: "OpenClaw Agent",
  ownershipProvider: "clawkey",
  publicKeyPem: "-----BEGIN PUBLIC KEY-----\npublic\n-----END PUBLIC KEY-----",
  privateKeyPem: "-----BEGIN PRIVATE KEY-----\nprivate\n-----END PRIVATE KEY-----",
  createdAt: "2026-04-20T10:00:00.000Z",
  updatedAt: "2026-04-20T10:00:00.000Z",
};

describe("agent-key-store", () => {
  function restoreIndexedDb(value: IDBFactory | undefined = originalIndexedDb) {
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value,
    });
  }

  function installMockIndexedDb(records: Map<string, unknown> = new Map()) {
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: new MockIndexedDbFactory(records),
    });
  }

  test("stores, reads, lists, and deletes owned agent keys", async () => {
    installMockIndexedDb();
    await saveStoredOwnedAgentKey(EXAMPLE_RECORD);

    expect(await findStoredOwnedAgentKey(EXAMPLE_RECORD.agentId)).toEqual(EXAMPLE_RECORD);
    expect(await listStoredOwnedAgentKeys()).toEqual([EXAMPLE_RECORD]);

    await removeStoredOwnedAgentKey(EXAMPLE_RECORD.agentId);

    expect(await findStoredOwnedAgentKey(EXAMPLE_RECORD.agentId)).toBeNull();
    expect(await listStoredOwnedAgentKeys()).toEqual([]);
    restoreIndexedDb();
  });

  test("filters malformed records out of list results", async () => {
    installMockIndexedDb(new Map<string, unknown>([
      ["good", EXAMPLE_RECORD],
      ["bad", { nope: true }],
    ]));

    expect(await listStoredOwnedAgentKeys()).toEqual([EXAMPLE_RECORD]);
    restoreIndexedDb();
  });

  test("throws when IndexedDB is unavailable", async () => {
    restoreIndexedDb(undefined);

    let thrown: unknown = null;
    try {
      await saveStoredOwnedAgentKey(EXAMPLE_RECORD);
    } catch (error) {
      thrown = error;
    }

    expect(thrown instanceof Error ? thrown.message : String(thrown)).toContain("does not support secure agent key storage");
    restoreIndexedDb();
  });
});
