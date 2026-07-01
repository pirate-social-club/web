"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { AuthRequiredRouteState, FullPageSpinner, NotFoundRouteState, RouteLoadFailureState, StackPageShell } from "@/app/authenticated-helpers/route-shell";
import { ReplayDraftPublishing, type ReplayDraftAccessPolicy, type ReplayDraftApprovalStatus, type ReplayDraftStatus } from "@/components/compositions/livestream/replay-draft-publishing/replay-draft-publishing";
import type { AssetRoyaltySplitState } from "@/components/compositions/posts/post-composer/royalty-split-editor";
import { PageContainer } from "@/components/primitives/layout-shell";
import { toast } from "@/components/primitives/sonner";
import type { ApiLiveRoomReplayDraft, ApiUpdateLiveRoomReplayDraftRequest } from "@/lib/api/client-api-types";
import { isApiNotFoundError } from "@/lib/api/client";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { getErrorMessage } from "@/lib/error-utils";
import { usdToCents } from "@/lib/formatting/currency";
import { useUiLocale } from "@/lib/ui-locale";

export function replayDraftStatus(status: ApiLiveRoomReplayDraft["status"]): ReplayDraftStatus {
  if (status === "not_recorded") return "not_recorded";
  if (status === "published") return "published";
  if (status === "failed") return "failed";
  if (status === "ready") return "ready";
  if (status === "review_pending") return "review_pending";
  return "processing";
}

export function accessPolicyFromDraft(draft: ApiLiveRoomReplayDraft): ReplayDraftAccessPolicy {
  const mode = draft.replay_asset?.access_mode;
  if (mode === "paid") return "paid";
  if (mode === "included_with_ticket") return "included_with_ticket";
  return "free";
}

export function approvalStatusFromDraft(draft: ApiLiveRoomReplayDraft): ReplayDraftApprovalStatus {
  const approvals = draft.replay_asset?.allocations.map((allocation) => allocation.approval_status) ?? [];
  if (approvals.includes("rejected")) return "rejected";
  if (approvals.includes("pending")) return "pending";
  return approvals.length > 0 ? "approved" : "not_required";
}

export function formatDurationLabel(durationMs: number | null | undefined, locale: string): string | undefined {
  if (!durationMs || durationMs <= 0) return undefined;
  const minutes = Math.max(1, Math.round(durationMs / 60000));
  return new Intl.NumberFormat(locale).format(minutes) + " min";
}

export function royaltySplitFromDraft(draft: ApiLiveRoomReplayDraft): AssetRoyaltySplitState {
  const allocations = draft.replay_asset?.allocations ?? [];
  if (allocations.length === 0) {
    return { allocations: [] };
  }

  return {
    allocations: allocations.map((allocation, index) => ({
      id: allocation.id,
      recipientKind: index === 0 || allocation.role === "host" ? "creator" : "collaborator",
      walletAddress: allocation.external_party_ref ?? allocation.participant_user ?? "",
      sharePct: allocation.share_bps / 100,
    })),
  };
}

export function replayDraftUpdateRequest(input: {
  accessPolicy: ReplayDraftAccessPolicy;
  caption: string;
  royaltySplit: AssetRoyaltySplitState;
  title: string;
}): ApiUpdateLiveRoomReplayDraftRequest {
  let assignedBps = 0;
  const allocations = input.royaltySplit.allocations.map((allocation, index) => {
    const isLast = index === input.royaltySplit.allocations.length - 1;
    const share_bps = isLast
      ? 10000 - assignedBps
      : Math.round(allocation.sharePct * 100);
    assignedBps += share_bps;
    const recipient = allocation.walletAddress?.trim() ?? "";
    const base = {
      role: allocation.recipientKind === "creator" ? "host" : "rightsholder",
      share_bps,
    };
    return recipient.startsWith("usr_")
      ? { ...base, participant_user: recipient }
      : { ...base, external_party_ref: recipient };
  });
  return {
    title: input.title,
    caption: input.caption,
    access_mode: input.accessPolicy,
    allocations,
  };
}

export function ReplayDraftRoutePage({ postId }: { postId: string }) {
  const api = useApi();
  const session = useSession();
  const { locale } = useUiLocale();
  const [draft, setDraft] = React.useState<ApiLiveRoomReplayDraft | null>(null);
  const [liveRoom, setLiveRoom] = React.useState<{ access_mode: string } | null>(null);
  const [postTitle, setPostTitle] = React.useState("Recording");
  const [communityId, setCommunityId] = React.useState<string | null>(null);
  const [liveRoomId, setLiveRoomId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [publishing, setPublishing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [caption, setCaption] = React.useState("");
  const [accessPolicy, setAccessPolicy] = React.useState<ReplayDraftAccessPolicy>("free");
  const [priceUsd, setPriceUsd] = React.useState("8.00");
  const [royaltySplit, setRoyaltySplit] = React.useState<AssetRoyaltySplitState>({ allocations: [] });

  React.useEffect(() => {
    if (!session?.accessToken) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    const load = async () => {
      try {
        const post = await api.posts.get(postId, { locale });
        const community = post.post.community;
        const room = post.post.anchor_live_room;
        if (!community || !room) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const [nextRoom, nextDraft] = await Promise.all([
          api.communities.getLiveRoom(community, room),
          api.communities.getLiveRoomReplayDraft(community, room),
        ]);
        if (cancelled) return;
        setPostTitle(post.post.title ?? "Recording");
        setCommunityId(community);
        setLiveRoomId(room);
        setLiveRoom({ access_mode: nextRoom.access_mode });
        setDraft(nextDraft);
        setTitle(nextDraft.replay_asset?.title ?? post.post.title ?? "Recording");
        setCaption(nextDraft.replay_asset?.caption ?? "");
        setAccessPolicy(accessPolicyFromDraft(nextDraft));
        setRoyaltySplit(royaltySplitFromDraft(nextDraft));
      } catch (loadError) {
        if (cancelled) return;
        if (isApiNotFoundError(loadError)) {
          setNotFound(true);
        } else {
          setError(loadError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [api.communities, api.posts, locale, postId, session?.accessToken]);

  const saveDraft = React.useCallback(async (options?: { quiet?: boolean }): Promise<ApiLiveRoomReplayDraft | null> => {
    if (!communityId || !liveRoomId) return null;
    const body = replayDraftUpdateRequest({
      accessPolicy,
      caption,
      royaltySplit,
      title,
    });
    setSaving(true);
    try {
      const nextDraft = await api.communities.updateLiveRoomReplayDraft(communityId, liveRoomId, body);
      setDraft(nextDraft);
      if (!options?.quiet) toast.success("Draft saved");
      return nextDraft;
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, "Could not save replay draft."));
      return null;
    } finally {
      setSaving(false);
    }
  }, [accessPolicy, api.communities, caption, communityId, liveRoomId, royaltySplit, title]);

  const publish = React.useCallback(async () => {
    if (!communityId || !liveRoomId) return;
    const listing = accessPolicy === "paid"
      ? {
        price_cents: usdToCents(Number(priceUsd)) ?? 0,
        regional_pricing_enabled: false,
        status: "active" as const,
      }
      : null;
    if (accessPolicy === "paid" && (!listing || listing.price_cents <= 0)) {
      toast.error("Set a replay price before publishing.");
      return;
    }
    setPublishing(true);
    try {
      const saved = await saveDraft({ quiet: true });
      if (!saved) return;
      const nextDraft = await api.communities.publishLiveRoomReplayDraft(communityId, liveRoomId, {
        access_mode: accessPolicy,
        listing,
      });
      setDraft(nextDraft);
      toast.success("Replay published");
      navigate(`/p/${encodeURIComponent(postId)}`);
    } catch (publishError) {
      toast.error(getErrorMessage(publishError, "Could not publish replay."));
    } finally {
      setPublishing(false);
    }
  }, [accessPolicy, api.communities, communityId, liveRoomId, postId, priceUsd, saveDraft]);

  if (!session?.accessToken) {
    return (
      <AuthRequiredRouteState
        title="Review recording"
        description="Sign in to review and publish this recording."
      />
    );
  }

  if (loading) return <FullPageSpinner />;
  if (notFound) {
    return (
      <NotFoundRouteState
        path={`/p/${postId}/replay`}
        title="Recording draft not found"
        description="This post does not have a recording draft you can review."
      />
    );
  }
  if (error) {
    return (
      <RouteLoadFailureState
        title="Could not load recording draft"
        description={getErrorMessage(error, "Try again in a moment.")}
      />
    );
  }
  if (!draft) return null;

  const splitTotal = royaltySplit.allocations.reduce((sum, allocation) => sum + allocation.sharePct, 0);
  const splitRecipientsValid = royaltySplit.allocations.length > 0
    && royaltySplit.allocations.every((allocation) => (allocation.walletAddress ?? "").trim().length > 0);
  const priceCents = usdToCents(Number(priceUsd)) ?? 0;
  const priceValid = accessPolicy !== "paid" || priceCents > 0;
  const saveDisabled = saving || publishing || !title.trim() || splitTotal !== 100 || !splitRecipientsValid;
  const supportedAccessPolicies: ReplayDraftAccessPolicy[] = liveRoom?.access_mode === "paid"
    ? ["free", "included_with_ticket", "paid"]
    : ["free", "paid"];
  const publishDisabledReason = !supportedAccessPolicies.includes(accessPolicy)
      ? "This replay access option is not available for this live room."
    : publishing
      ? "Publishing..."
      : !priceValid
        ? "Set a replay price before publishing."
      : saveDisabled
        ? "Save a valid title and split before publishing."
        : undefined;

  return (
    <PageContainer className="min-w-0 flex-1 py-6" gutter size="feed">
      <StackPageShell
        headerVariant="plain"
        title="Review recording"
        description={postTitle}
      >
        <ReplayDraftPublishing
          accessPolicy={accessPolicy}
          approvalStatus={approvalStatusFromDraft(draft)}
          caption={caption}
          durationLabel={formatDurationLabel(draft.replay_asset?.duration_ms, locale)}
          editable
          onAccessPolicyChange={setAccessPolicy}
          onCaptionChange={setCaption}
          onPriceChange={setPriceUsd}
          onPublish={() => void publish()}
          onRoyaltySplitChange={setRoyaltySplit}
          onSave={() => void saveDraft()}
          onTitleChange={setTitle}
          publishDisabledReason={publishDisabledReason}
          publishLabel={publishing ? "Publishing..." : "Publish replay"}
          priceLabel={priceUsd}
          royaltySplit={royaltySplit}
          saveDisabled={saveDisabled}
          saveLabel={saving ? "Saving..." : "Save draft"}
          status={replayDraftStatus(draft.status)}
          supportedAccessPolicies={supportedAccessPolicies}
          thumbnailSrc={draft.replay_asset?.preview_ref ?? undefined}
          title={title}
        />
      </StackPageShell>
    </PageContainer>
  );
}
