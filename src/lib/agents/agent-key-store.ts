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

const STORAGE_KEY = "pirate:owned-agent-keys:v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStoredAgentKeys(): StoredOwnedAgentKey[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is StoredOwnedAgentKey => Boolean(item && typeof item === "object")) : [];
  } catch {
    return [];
  }
}

function writeStoredAgentKeys(records: StoredOwnedAgentKey[]): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function listStoredOwnedAgentKeys(): StoredOwnedAgentKey[] {
  return readStoredAgentKeys();
}

export function findStoredOwnedAgentKey(agentId: string): StoredOwnedAgentKey | null {
  return readStoredAgentKeys().find((record) => record.agentId === agentId) ?? null;
}

export function saveStoredOwnedAgentKey(record: StoredOwnedAgentKey): void {
  const existing = readStoredAgentKeys().filter((entry) => entry.agentId !== record.agentId);
  writeStoredAgentKeys([...existing, record]);
}

export function removeStoredOwnedAgentKey(agentId: string): void {
  writeStoredAgentKeys(readStoredAgentKeys().filter((entry) => entry.agentId !== agentId));
}
