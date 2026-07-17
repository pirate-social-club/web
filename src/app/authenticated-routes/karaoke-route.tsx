"use client";

import * as React from "react";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { KaraokeAudioSurface } from "@/components/compositions/karaoke/karaoke-audio-surface";
import {
  rewardAmountLabel,
  SongRewardOffer,
} from "@/components/compositions/rewards/reward-surfaces";
import { toKaraokeStageLines } from "@/components/compositions/karaoke/lyric-transform";
import { toScorableKaraokeLines } from "@/components/compositions/karaoke/karaoke-stage-bridge";
import { useKaraokeScoring } from "@/components/compositions/karaoke/scoring/use-karaoke-scoring-session";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import type { ApiPublicRewardOffer } from "@/lib/api/client-api-types";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { getErrorMessage } from "@/lib/error-utils";
import { getPirateNetworkConfig } from "@/lib/network-config";
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
  const [state, setState] = React.useState<KaraokeRouteState>({ phase: "loading" });
  const rewardSettlementNetwork = getPirateNetworkConfig().base.network === "base-sepolia" ? "testnet" : "mainnet";

  React.useEffect(() => {
    let canceled = false;

    async function loadPost(): Promise<LocalizedPostResponse> {
      if (session?.accessToken) {
        try {
          return await api.posts.get(postId, { locale: contentLocale });
        } catch (error) {
          // Logged-in non-members get a 404 (not_found: Community not found) from the
          // authenticated read. Karaoke is public view-only, so fall back to the public
          // read on not-found as well as auth errors instead of surfacing the 404.
          if (!isApiAuthError(error) && !isApiNotFoundError(error)) throw error;
        }
      }

      return await api.publicPosts.get(postId, { locale: contentLocale });
    }

    async function loadKaraoke() {
      setState({ phase: "loading" });

      try {
        const postPromise = loadPost();
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
      onExit={() => navigate(`/p/${encodeURIComponent(postId)}`)}
      onRequestSignIn={connect ?? undefined}
      onViewScores={() => navigate(`/p/${encodeURIComponent(postId)}/karaoke/leaderboard`)}
      rewardSlot={state.rewardOffer && state.rewardOffer.eligible_activity !== "study" ? (
        <SongRewardOffer
          amountLabel={rewardAmountLabel(state.rewardOffer.daily_reward_cents, rewardSettlementNetwork)}
          eligibleActivity={state.rewardOffer.eligible_activity}
          minScoreBps={state.rewardOffer.min_score_bps}
          settlementNetwork={rewardSettlementNetwork}
        />
      ) : undefined}
      scoring={scoring}
      showSignInCta={needsAuth}
      signInBusy={authBusy}
      signInUnavailable={!authConfigured || !connect || Boolean(authLoadError)}
      title={state.payload.title}
    />
  );
}
