"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

export type SaveCommunityAction = (
  action: () => Promise<ApiCommunity>,
  savingSetter: React.Dispatch<React.SetStateAction<boolean>>,
  successMessage: string,
  failureMessage: string,
) => Promise<ApiCommunity>;

export function submitCommunitySave({
  action,
  community,
  failureMessage,
  onError,
  onSaved,
  saveCommunity,
  saving,
  savingSetter,
  swallowError = false,
  successMessage,
}: {
  action: (community: ApiCommunity) => Promise<ApiCommunity>;
  community: ApiCommunity | null;
  failureMessage: string;
  onError?: (error: unknown) => void;
  onSaved?: (community: ApiCommunity) => void;
  saveCommunity: SaveCommunityAction;
  saving: boolean;
  savingSetter: React.Dispatch<React.SetStateAction<boolean>>;
  swallowError?: boolean;
  successMessage: string;
}): Promise<ApiCommunity | null> | null {
  if (!community || saving) {
    return null;
  }

  return saveCommunity(
    () => action(community),
    savingSetter,
    successMessage,
    failureMessage,
  ).then((updatedCommunity) => {
    onSaved?.(updatedCommunity);
    return updatedCommunity;
  }).catch((error: unknown) => {
    onError?.(error);
    if (swallowError) {
      return null;
    }
    throw error;
  });
}
