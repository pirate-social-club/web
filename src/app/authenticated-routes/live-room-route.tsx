"use client";

import * as React from "react";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { loadSongRoutePost } from "@/app/authenticated-helpers/load-song-route-post";
import { LiveRoomViewerSurface } from "@/components/compositions/posts/live-room-viewer/live-room-viewer-modal";
import { isApiAuthError } from "@/lib/api/client";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import type { ApiLiveRoomAccessResponse, ApiLiveRoomViewerAttachResponse } from "@/lib/api/client-api-types";
import { getErrorMessage } from "@/lib/error-utils";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";

type LiveRoomRouteState =
  | { phase: "loading" }
  | { phase: "ready"; attach: ApiLiveRoomViewerAttachResponse; title: string }
  | { phase: "blocked"; message: string; title: string }
  | { phase: "error"; message: string; title: string };

function postTitle(post: LocalizedPostResponse | null): string {
  return post?.post.title?.trim() || "Live room";
}

function liveRoomTitle(access: ApiLiveRoomAccessResponse | ApiLiveRoomViewerAttachResponse | null, post: LocalizedPostResponse | null): string {
  return access?.room.title?.trim() || postTitle(post);
}

function blockedMessage(access: ApiLiveRoomAccessResponse): string {
  if (access.room.status === "ended" || access.access.decision_reason === "ended") {
    return "This live room has ended.";
  }
  if (access.room.status === "canceled" || access.access.decision_reason === "canceled") {
    return "This live room was canceled.";
  }
  if (access.access.decision_reason === "not_live") {
    return "This live room is not live yet.";
  }
  if (access.access.decision_reason === "purchase_required") {
    return "A ticket is required for this live room.";
  }
  if (access.access.decision_reason === "membership_required") {
    return "Community access is required for this live room.";
  }
  if (access.access.decision_reason === "gate_unsatisfied") {
    return "Access is required for this live room.";
  }
  return "This live room is not available.";
}

function LiveRoomRouteMessage({
  message,
  postId,
  title,
}: {
  message: string;
  postId: string;
  title: string;
}) {
  return (
    <div className="flex h-dvh min-h-screen w-full items-center justify-center bg-black px-6 text-white">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-semibold leading-tight">{title}</h1>
        <p className="text-base leading-7 text-white/70">{message}</p>
        <a
          className="inline-flex h-11 items-center justify-center rounded-md border border-white/25 px-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
          href={`/p/${encodeURIComponent(postId)}`}
        >
          Open post
        </a>
      </div>
    </div>
  );
}

export function LiveRoomRoutePage({ postId }: { postId: string }) {
  const api = useApi();
  const session = useSession();
  const contentLocale = useRouteContentLocale();
  const [state, setState] = React.useState<LiveRoomRouteState>({ phase: "loading" });

  React.useEffect(() => {
    let canceled = false;

    async function loadAccess(communityId: string, liveRoomId: string): Promise<ApiLiveRoomAccessResponse> {
      if (session?.accessToken) {
        try {
          return await api.communities.getLiveRoomAccess(communityId, liveRoomId);
        } catch (error) {
          if (!isApiAuthError(error)) throw error;
        }
      }
      return await api.publicCommunities.getLiveRoomAccess(communityId, liveRoomId);
    }

    async function attachViewer(communityId: string, liveRoomId: string): Promise<ApiLiveRoomViewerAttachResponse> {
      if (session?.accessToken) {
        try {
          return await api.communities.viewerAttachLiveRoom(communityId, liveRoomId);
        } catch (error) {
          if (!isApiAuthError(error)) throw error;
        }
      }
      return await api.publicCommunities.viewerAttachLiveRoom(communityId, liveRoomId);
    }

    async function loadLiveRoom() {
      setState({ phase: "loading" });
      try {
        const post = await loadSongRoutePost({
          api,
          contentLocale,
          hasAccessToken: Boolean(session?.accessToken),
          postId,
        });
        if (canceled) return;

        const communityId = post.post.community;
        const liveRoomId = post.post.anchor_live_room;
        if (!communityId || !liveRoomId) {
          setState({
            phase: "blocked",
            title: postTitle(post),
            message: "This post is not attached to a live room.",
          });
          return;
        }

        const access = await loadAccess(communityId, liveRoomId);
        if (canceled) return;

        if (!access.access.allowed) {
          setState({
            phase: "blocked",
            title: liveRoomTitle(access, post),
            message: blockedMessage(access),
          });
          return;
        }

        const attach = await attachViewer(communityId, liveRoomId);
        if (canceled) return;

        setState({
          phase: "ready",
          attach,
          title: liveRoomTitle(attach, post),
        });
      } catch (error) {
        if (canceled) return;
        setState({
          phase: "error",
          title: "Live room",
          message: getErrorMessage(error, "Could not open this live room."),
        });
      }
    }

    void loadLiveRoom();

    return () => {
      canceled = true;
    };
  }, [api, contentLocale, postId, session?.accessToken]);

  const handleRenew = React.useCallback(async (uid: number) => {
    if (state.phase !== "ready") return null;
    const communityId = state.attach.room.community;
    const liveRoomId = state.attach.room.id;
    if (session?.accessToken) {
      try {
        return await api.communities.viewerRenewLiveRoom(communityId, liveRoomId, { uid });
      } catch (error) {
        if (!isApiAuthError(error)) throw error;
      }
    }
    return await api.publicCommunities.viewerRenewLiveRoom(communityId, liveRoomId, { uid });
  }, [api.communities, api.publicCommunities, session?.accessToken, state]);

  if (state.phase === "loading") {
    return (
      <div className="flex h-dvh min-h-screen w-full items-center justify-center bg-black px-6 text-center text-white">
        <p className="text-base font-medium">Connecting to the live room.</p>
      </div>
    );
  }

  if (state.phase === "blocked" || state.phase === "error") {
    return <LiveRoomRouteMessage message={state.message} postId={postId} title={state.title} />;
  }

  return (
    <LiveRoomViewerSurface
      attachResponse={state.attach}
      className="h-dvh min-h-screen w-full"
      onRenew={handleRenew}
      open
      showDetails={false}
      title={state.title}
      videoClassName="h-full"
    />
  );
}
