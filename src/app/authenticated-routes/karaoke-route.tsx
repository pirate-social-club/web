"use client";

import * as React from "react";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { KaraokeAudioSurface } from "@/components/compositions/karaoke/karaoke-audio-surface";
import { toKaraokeStageLines } from "@/components/compositions/karaoke/lyric-transform";
import { toScorableKaraokeLines } from "@/components/compositions/karaoke/karaoke-stage-bridge";
import { useKaraokeScoring } from "@/components/compositions/karaoke/scoring/use-karaoke-scoring-session";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { getErrorMessage } from "@/lib/error-utils";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import {
  karaokeUnavailableMessage,
  normalizeApiKaraokePayload,
  normalizePostKaraokePayload,
  postTitle,
  type NormalizedKaraokePayload,
} from "./karaoke-route.helpers";

type KaraokeRouteState =
  | { phase: "loading" }
  | { phase: "ready"; payload: NormalizedKaraokePayload; communityId: string }
  | { phase: "blocked"; title: string; message: string }
  | { phase: "error"; title: string; message: string };

function KaraokeRouteMessage({
  message,
  postId,
  title,
}: {
  message: string;
  postId: string;
  title: string;
}) {
  return (
    <div className="flex h-dvh min-h-screen w-full items-center justify-center bg-background px-6 text-foreground">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <Type as="h1" variant="h3">
          {title}
        </Type>
        <Type as="p" className="text-muted-foreground" variant="body">
          {message}
        </Type>
        <Button onClick={() => navigate(`/p/${encodeURIComponent(postId)}`)} variant="secondary">
          Open post
        </Button>
      </div>
    </div>
  );
}

export function KaraokeRoutePage({ postId }: { postId: string }) {
  const api = useApi();
  const session = useSession();
  const contentLocale = useRouteContentLocale();
  const [state, setState] = React.useState<KaraokeRouteState>({ phase: "loading" });

  React.useEffect(() => {
    let canceled = false;

    async function loadPost(): Promise<LocalizedPostResponse> {
      if (session?.accessToken) {
        try {
          return await api.posts.get(postId, { locale: contentLocale });
        } catch (error) {
          if (!isApiAuthError(error)) throw error;
        }
      }

      return await api.publicPosts.get(postId, { locale: contentLocale });
    }

    async function loadKaraoke() {
      setState({ phase: "loading" });

      try {
        const post = await loadPost();
        if (canceled) return;

        const communityId = post.post.community;
        let payload: NormalizedKaraokePayload | null = null;
        let payloadProblem: string | null = null;

        if (communityId) {
          try {
            const apiPayload = await api.communities.getPostKaraoke(communityId, postId, { locale: contentLocale });
            payload = normalizeApiKaraokePayload(apiPayload, post);
            if (!payload) {
              payloadProblem = "Karaoke data was returned but did not include usable timed lyrics and instrumental audio.";
            }
          } catch (error) {
            if (!isApiNotFoundError(error) && !isApiAuthError(error)) {
              throw error;
            }
          }
        }

        if (canceled) return;
        payload ??= normalizePostKaraokePayload(post);
        if (!payload) {
          setState({
            phase: "blocked",
            title: postTitle(post),
            message: payloadProblem ?? karaokeUnavailableMessage(post),
          });
          return;
        }

        setState({ communityId: communityId ?? "", payload, phase: "ready" });
      } catch (error) {
        if (canceled) return;
        setState({
          phase: "error",
          title: "Karaoke",
          message: getErrorMessage(error, "Could not open karaoke for this song."),
        });
      }
    }

    void loadKaraoke();

    return () => {
      canceled = true;
    };
  }, [api, contentLocale, postId, session?.accessToken]);

  // Stage lines drive the display; scorable lines (with stable identities) drive
  // the line-boundary scoring events. Both derive from the same payload so the
  // UI and the scorer agree on line windows.
  const stageLines = React.useMemo(
    () => (state.phase === "ready" ? toKaraokeStageLines(state.payload.rawLines) : []),
    [state],
  );
  const scorableLines = React.useMemo(() => toScorableKaraokeLines(stageLines), [stageLines]);
  const communityId = state.phase === "ready" ? state.communityId : "";
  // Scoring requires an authenticated session (the session-creation POST) and a
  // community + at least one scorable line.
  const scoringEnabled = Boolean(communityId && session?.accessToken && scorableLines.length > 0);
  const scoring = useKaraokeScoring({
    communityId,
    createKaraokeSession: api.posts.createKaraokeSession,
    enabled: scoringEnabled,
    postId,
    scorableLines,
  });

  if (state.phase === "loading") {
    return (
      <div className="flex h-dvh min-h-screen w-full items-center justify-center bg-background px-6 text-center text-foreground">
        <Type as="p" className="text-muted-foreground" variant="body">
          Loading karaoke
        </Type>
      </div>
    );
  }

  if (state.phase === "blocked" || state.phase === "error") {
    return <KaraokeRouteMessage message={state.message} postId={postId} title={state.title} />;
  }

  return (
    <KaraokeAudioSurface
      artistName={state.payload.artistName}
      artworkSrc={state.payload.artworkSrc}
      className="h-dvh"
      instrumentalAudioUrl={state.payload.instrumentalAudioUrl}
      lines={stageLines}
      onExit={() => navigate(`/p/${encodeURIComponent(postId)}`)}
      scoring={scoring}
      title={state.payload.title}
    />
  );
}
