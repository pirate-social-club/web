"use client";

import * as React from "react";
import { loadSongRoutePost } from "@/app/authenticated-helpers/load-song-route-post";
import { navigate } from "@/app/router";
import { routeReturnPath } from "@/app/authenticated-helpers/video-viewer-return-state";
import { KaraokeAudioSurface } from "@/components/compositions/karaoke/karaoke-audio-surface";
import {
  RewardQualificationNotice,
  SongRewardOffer,
  rewardAmountLabel,
} from "@/components/compositions/rewards/reward-surfaces";
import { toKaraokeStageLines } from "@/components/compositions/karaoke/lyric-transform";
import { toScorableKaraokeLines } from "@/components/compositions/karaoke/karaoke-stage-bridge";
import { useKaraokeScoring } from "@/components/compositions/karaoke/scoring/use-karaoke-scoring-session";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import type { ApiPublicRewardOffer, ApiRewardQualificationSummary } from "@/lib/api/client-api-types";
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
  | {
      phase: "ready";
      payload: NormalizedKaraokePayload;
      communityId: string;
      rewardOffer: ApiPublicRewardOffer | null;
    }
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
  const { busy: authBusy, configured: authConfigured, connect, loadError: authLoadError } = usePiratePrivyRuntime();
  const contentLocale = useRouteContentLocale();
  const [rewardQualification, setRewardQualification] = React.useState<ApiRewardQualificationSummary | null>(null);
  const [state, setState] = React.useState<KaraokeRouteState>({ phase: "loading" });

  React.useEffect(() => {
    let canceled = false;

    async function loadKaraoke() {
      setState({ phase: "loading" });

      try {
        const postPromise = loadSongRoutePost({
          api,
          contentLocale,
          hasAccessToken: Boolean(session?.accessToken),
          postId,
        });
        const karaokePromise = api.publicPosts.getKaraoke(postId, { locale: contentLocale })
          .then(
            (payload) => ({ ok: true as const, payload }),
            (error: unknown) => ({ error, ok: false as const }),
          );
        const post = await postPromise;
        if (canceled) return;

        const communityId = post.post.community;
        const rewardOfferPromise = communityId
          ? api.rewards.getActiveCampaignForSong(communityId, post.post.id).catch(() => null)
          : Promise.resolve(null);
        let payload: NormalizedKaraokePayload | null = null;
        let payloadProblem: string | null = null;

        const [karaokeResult, rewardOffer] = await Promise.all([
          karaokePromise,
          rewardOfferPromise,
        ]);
        if (karaokeResult.ok) {
          payload = normalizeApiKaraokePayload(karaokeResult.payload, post);
          if (!payload) {
            payloadProblem = "Karaoke data was returned but did not include usable timed lyrics and instrumental audio.";
          }
        } else {
          const error = karaokeResult.error;
          if (!isApiNotFoundError(error) && !isApiAuthError(error)) {
            throw error;
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

        setState({ communityId: communityId ?? "", payload, phase: "ready", rewardOffer });
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
  // Logged-out visitors can view the karaoke surface (public read) but can't be
  // scored. Rather than dead-end them, offer a "Sing" CTA in the scoring slot that
  // opens auth; once a session exists, scoring takes over the same slot. Mirror
  // scoringEnabled's preconditions (incl. communityId) so the CTA only promises
  // scoring when sign-in will actually unlock the Start panel.
  const needsAuth = Boolean(communityId && !session?.accessToken && scorableLines.length > 0);
  const rewardOffer = state.phase === "ready" ? state.rewardOffer : null;
  const karaokeEnded = scoring.state.status === "ended";

  React.useEffect(() => {
    if (!karaokeEnded || !rewardOffer || !session?.accessToken) return;
    let cancelled = false;
    let timeout: number | undefined;
    let attempt = 0;
    const poll = async () => {
      const summary = await api.rewards.getSummary().catch(() => null);
      if (cancelled) return;
      const qualification = summary?.recent_qualifications?.find((item) =>
        item.post_id === postId && item.qualification_basis === "karaoke"
      ) ?? null;
      if (qualification) {
        setRewardQualification(qualification);
        if (qualification.status !== "checking") return;
      }
      if (attempt < 5) {
        timeout = window.setTimeout(() => { void poll(); }, 1_500 * 2 ** attempt++);
      }
    };
    setRewardQualification(null);
    void poll();
    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [api, karaokeEnded, postId, rewardOffer, session?.accessToken]);

  if (state.phase === "loading") {
    return (
      <div className="flex h-dvh min-h-screen w-full items-center justify-center bg-background text-foreground">
        <Spinner className="size-8 text-muted-foreground" />
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
      onExit={() => navigate(routeReturnPath(`/p/${encodeURIComponent(postId)}`))}
      onRequestSignIn={connect ?? undefined}
      onViewScores={() => navigate(`/p/${encodeURIComponent(postId)}/karaoke/leaderboard`)}
      rewardSlot={rewardOffer ? (
        karaokeEnded ? (
          <RewardQualificationNotice
            amountLabel={rewardAmountLabel(rewardOffer.daily_reward_cents, rewardOffer.chain_id)}
            expiresAt={rewardQualification?.expires_at}
            outcomeReason={rewardQualification?.outcome_reason}
            status={rewardQualification?.status ?? "checking"}
          />
        ) : (
          <SongRewardOffer
            amountLabel={rewardAmountLabel(rewardOffer.daily_reward_cents, rewardOffer.chain_id)}
            eligibleActivity={rewardOffer.eligible_activity}
            minScoreBps={rewardOffer.min_score_bps}
          />
        )
      ) : undefined}
      scoring={scoring}
      showSignInCta={needsAuth}
      signInBusy={authBusy}
      signInUnavailable={!authConfigured || !connect || Boolean(authLoadError)}
      title={state.payload.title}
    />
  );
}
