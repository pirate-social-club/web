"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

export type SaveCommunityAction = (
  action: () => Promise<ApiCommunity>,
  savingSetter: React.Dispatch<React.SetStateAction<boolean>>,
  successMessage: string,
  failureMessage: string,
) => Promise<ApiCommunity>;
