"use client";

import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";

const PENDING_SELF_JOIN_SESSION_STORAGE_KEY_PREFIX = "pirate_pending_self_join_session:";

export type PendingSelfJoinSession = {
  communityId: string;
  requestedCapabilities: ApiJoinEligibility["missing_capabilities"];
  verificationSessionId: string;
};

function getPendingSelfJoinSessionStorageKey(communityId: string): string {
  return `${PENDING_SELF_JOIN_SESSION_STORAGE_KEY_PREFIX}${communityId}`;
}

export function readPendingSelfJoinSession(communityId: string): PendingSelfJoinSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(getPendingSelfJoinSessionStorageKey(communityId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PendingSelfJoinSession>;
    if (
      typeof parsed?.communityId !== "string"
      || typeof parsed?.verificationSessionId !== "string"
      || !Array.isArray(parsed?.requestedCapabilities)
    ) {
      return null;
    }

    return {
      communityId: parsed.communityId,
      requestedCapabilities: parsed.requestedCapabilities.filter((capability): capability is ApiJoinEligibility["missing_capabilities"][number] =>
        capability === "unique_human"
        || capability === "age_over_18"
        || capability === "nationality"
        || capability === "gender"),
      verificationSessionId: parsed.verificationSessionId,
    };
  } catch {
    return null;
  }
}

export function writePendingSelfJoinSession(value: PendingSelfJoinSession): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(getPendingSelfJoinSessionStorageKey(value.communityId), JSON.stringify(value));
}

export function clearPendingSelfJoinSession(communityId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(getPendingSelfJoinSessionStorageKey(communityId));
}
