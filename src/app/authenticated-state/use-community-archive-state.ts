"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "@/components/primitives/sonner";
import type {
  CommunityArchivePageProps,
  CommunityArchiveStatus,
} from "@/components/compositions/community/archive-page/community-archive-page.types";

function toArchiveStatus(status: string | null | undefined): CommunityArchiveStatus {
  return status === "archived" ? "archived" : "active";
}

export function useCommunityArchiveState({
  community,
}: {
  community: ApiCommunity | null;
}) {
  const api = useApi();
  const [status, setStatus] = React.useState<CommunityArchiveStatus>(() =>
    toArchiveStatus(community?.status),
  );
  const [savingArchive, setSavingArchive] = React.useState(false);
  const [archiveError, setArchiveError] = React.useState<string | null>(null);

  // Keep local status in sync when the loaded community changes.
  React.useEffect(() => {
    setStatus(toArchiveStatus(community?.status));
    setArchiveError(null);
  }, [community?.id, community?.status]);

  const handleArchiveCommunity = React.useCallback(() => {
    if (!community || savingArchive) {
      return;
    }
    setArchiveError(null);
    setSavingArchive(true);
    void api.communities.archiveCommunity(community.id)
      .then((result) => {
        setStatus(toArchiveStatus(result.status));
        toast.success("Community archived.");
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Failed to archive the community.");
        setArchiveError(message);
        toast.error(message);
      })
      .finally(() => {
        setSavingArchive(false);
      });
  }, [api.communities, community, savingArchive]);

  const handleUnarchiveCommunity = React.useCallback(() => {
    if (!community || savingArchive) {
      return;
    }
    setArchiveError(null);
    setSavingArchive(true);
    void api.communities.unarchiveCommunity(community.id)
      .then((result) => {
        setStatus(toArchiveStatus(result.status));
        toast.success("Community restored.");
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Failed to restore the community.");
        setArchiveError(message);
        toast.error(message);
      })
      .finally(() => {
        setSavingArchive(false);
      });
  }, [api.communities, community, savingArchive]);

  const archiveSubmitState: CommunityArchivePageProps["submitState"] = savingArchive
    ? { kind: "saving" }
    : archiveError
      ? { kind: "error", message: archiveError }
      : { kind: "idle" };

  return {
    archiveStatus: status,
    archiveSubmitState,
    handleArchiveCommunity,
    handleUnarchiveCommunity,
  };
}
