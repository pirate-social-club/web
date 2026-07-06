"use client";

import * as React from "react";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import {
  SongStreakLeaderboard,
  type SongStreakLeaderboardState,
} from "@/components/compositions/song-study/song-streak-leaderboard";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { isApiNotFoundError } from "@/lib/api/client";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { getErrorMessage } from "@/lib/error-utils";

type StreaksRouteState =
  | { phase: "loading" }
  | { phase: "auth_required" }
  | {
      phase: "ready";
      artistName?: string;
      artworkSrc?: string;
      state: SongStreakLeaderboardState;
      title: string;
    };

function pageTitle(post: LocalizedPostResponse | null): string {
  return (
    post?.song_presentation?.title?.trim()
    || post?.post.song_title?.trim()
    || post?.post.title?.trim()
    || "Study streaks"
  );
}

function pageArtwork(post: LocalizedPostResponse | null): string | undefined {
  return post?.song_presentation?.cover_art_ref || undefined;
}

function StreaksAuthRequiredMessage({ postId }: { postId: string }) {
  const { busy, configured, connect, loadError } = usePiratePrivyRuntime();

  return (
    <div className="flex h-dvh min-h-screen w-full items-center justify-center bg-background px-6 text-foreground">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <Type as="h1" variant="h3">
          Sign in to see streaks
        </Type>
        <Type as="p" className="text-muted-foreground" variant="body">
          The study streak leaderboard is for community members.
        </Type>
        {configured && connect ? (
          <Button loading={busy} onClick={connect}>
            Sign in
          </Button>
        ) : null}
        {loadError ? (
          <Type as="p" className="text-muted-foreground" variant="caption">
            Authentication is unavailable right now.
          </Type>
        ) : null}
        <Button onClick={() => navigate(`/p/${encodeURIComponent(postId)}`)} variant="secondary">
          Open post
        </Button>
      </div>
    </div>
  );
}

export function StreaksRoutePage({ postId }: { postId: string }) {
  const api = useApi();
  const session = useSession();
  const hydrated = useClientHydrated();
  const contentLocale = useRouteContentLocale();
  const [state, setState] = React.useState<StreaksRouteState>({ phase: "loading" });
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let canceled = false;

    async function loadPost(): Promise<LocalizedPostResponse> {
      try {
        return await api.posts.get(postId, { locale: contentLocale });
      } catch (error) {
        // Signed-in non-members of request-mode communities get a 404 from the
        // authenticated read even for public posts; fall back to the public read
        // so we can still show the song header.
        if (!isApiNotFoundError(error)) throw error;
        return await api.publicPosts.get(postId, { locale: contentLocale });
      }
    }

    async function loadLeaderboard() {
      if (!hydrated) return;

      if (!session?.accessToken) {
        setState({ phase: "auth_required" });
        return;
      }

      setState({ phase: "loading" });
      try {
        const post = await loadPost();
        if (canceled) return;

        const header = {
          artworkSrc: pageArtwork(post),
          title: pageTitle(post),
        };

        try {
          const leaderboard = await api.communities.getPostStreakLeaderboard(
            post.post.community,
            post.post.id,
          );
          if (canceled) return;
          setState({
            phase: "ready",
            ...header,
            state: {
              kind: "ready",
              date: leaderboard.date,
              entries: leaderboard.entries,
              totalActiveStreaks: leaderboard.total_active_streaks,
              viewer: leaderboard.viewer,
            },
          });
        } catch (error) {
          if (canceled) return;
          setState({
            phase: "ready",
            ...header,
            state: { kind: "error", message: getErrorMessage(error, "We couldn't load the streak leaderboard.") },
          });
        }
      } catch (error) {
        if (canceled) return;
        setState({
          phase: "ready",
          title: "Study streaks",
          state: { kind: "error", message: getErrorMessage(error, "We couldn't load the streak leaderboard.") },
        });
      }
    }

    void loadLeaderboard();
    return () => {
      canceled = true;
    };
  }, [api, contentLocale, hydrated, postId, reloadKey, session?.accessToken]);

  if (!session?.accessToken || state.phase === "auth_required") {
    return <StreaksAuthRequiredMessage postId={postId} />;
  }

  if (state.phase === "loading") {
    return (
      <div className="flex h-dvh min-h-screen w-full items-center justify-center bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <SongStreakLeaderboard
      artistName={state.artistName}
      artworkSrc={state.artworkSrc}
      onExit={() => navigate(`/p/${encodeURIComponent(postId)}`)}
      onRetry={() => setReloadKey((key) => key + 1)}
      onStartStudy={() => navigate(`/p/${encodeURIComponent(postId)}/study`)}
      state={state.state}
      title={state.title}
    />
  );
}
