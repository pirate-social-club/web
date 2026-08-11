"use client";

import * as React from "react";
import { loadSongRoutePost } from "@/app/authenticated-helpers/load-song-route-post";
import { navigate, replaceRoute } from "@/app/router";
import { routeReturnPath } from "@/app/authenticated-helpers/video-viewer-return-state";
import { KaraokeAudioSurface } from "@/components/compositions/karaoke/karaoke-audio-surface";
import {
  KaraokeCompletionLeaderboard,
  type KaraokeCompletionLeaderboardState,
} from "@/components/compositions/karaoke/karaoke-leaderboard";
import {
  displayedRewardQualificationStatus,
  RewardQualificationNotice,
  SongRewardOfferPill,
  rewardAmountLabel,
} from "@/components/compositions/rewards/reward-surfaces";
import { toKaraokeStageLines } from "@/components/compositions/karaoke/lyric-transform";
import { toScorableKaraokeLines } from "@/components/compositions/karaoke/karaoke-stage-bridge";
import { useKaraokeScoring } from "@/components/compositions/karaoke/scoring/use-karaoke-scoring-session";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { isApiAuthError, isApiNotFoundError, isApiVerificationRequiredError } from "@/lib/api/client";
import type { ApiPublicRewardOffer, ApiRewardQualificationSummary } from "@/lib/api/client-api-types";
import { useApi } from "@/lib/api";
import { updateSessionUser, useSession } from "@/lib/api/session-store";
import { getErrorMessage } from "@/lib/error-utils";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { useUiLocale } from "@/lib/ui-locale";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
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
  | { phase: "verification_required"; title: string; message: string }
  | { phase: "error"; title: string; message: string };

function KaraokeRouteMessage({
  actionLabel,
  message,
  onAction,
  postId,
  title,
}: {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
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
        {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
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
  const { locale } = useUiLocale();
  const { copy } = useRouteMessages();
  const routeCopy = copy.post.route;
  const { busy: authBusy, configured: authConfigured, connect, loadError: authLoadError } = usePiratePrivyRuntime();
  const contentLocale = useRouteContentLocale();
  const [rewardQualification, setRewardQualification] = React.useState<ApiRewardQualificationSummary | null>(null);
  const [rewardCheckDelayed, setRewardCheckDelayed] = React.useState(false);
  const [completionLeaderboard, setCompletionLeaderboard] =
    React.useState<KaraokeCompletionLeaderboardState | null>(null);
  const leaderboardAttemptCountBeforeTake = React.useRef<number | null>(null);
  const [state, setState] = React.useState<KaraokeRouteState>({ phase: "loading" });
  const [reloadKey, setReloadKey] = React.useState(0);
  const {
    handleModalOpenChange: handleAgeSelfModalOpenChange,
    handleSelfQrError: handleAgeSelfQrError,
    handleSelfQrSuccess: handleAgeSelfQrSuccess,
    selfError: ageSelfError,
    selfModalOpen: ageSelfModalOpen,
    selfPrompt: ageSelfPrompt,
    startVerification: startAgeSelfVerification,
  } = useSelfVerification({
    completeErrorMessage: routeCopy.ageVerificationCompleteError,
    locale,
    onVerified: async () => {
      updateSessionUser(await api.users.getMe());
      setReloadKey((value) => value + 1);
    },
    startErrorMessage: routeCopy.ageVerificationStartError,
    storageKey: `pirate_pending_self_age_gate:karaoke:${postId}`,
    verificationIntent: "community_join",
  });

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
        const anonymousKaraokePromise = !session?.accessToken
          ? api.publicPosts.getKaraoke(postId, { locale: contentLocale }).then(
              (payload) => ({ ok: true as const, payload }),
              (error: unknown) => ({ error, ok: false as const }),
            )
          : null;
        const post = await postPromise;
        if (canceled) return;

        const communityId = post.post.community;
        const karaokePromise = session?.accessToken && communityId
          ? api.communities.getPostKaraoke(communityId, postId, { locale: contentLocale }).then(
              (payload) => ({ ok: true as const, payload }),
              (error: unknown) => ({ error, ok: false as const }),
            )
          : anonymousKaraokePromise ?? api.publicPosts.getKaraoke(postId, { locale: contentLocale }).then(
              (payload) => ({ ok: true as const, payload }),
              (error: unknown) => ({ error, ok: false as const }),
            );
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
        if (isApiVerificationRequiredError(error)) {
          setState({ phase: "verification_required", title: "Karaoke", message: routeCopy.ageVerificationRequired });
          return;
        }
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
  }, [api, contentLocale, postId, reloadKey, routeCopy.ageVerificationRequired, session?.accessToken]);

  const handleVerifyAge = React.useCallback(() => {
    if (!session?.accessToken) {
      connect?.();
      return;
    }
    void startAgeSelfVerification({
      requestedCapabilities: ["age_over_18"],
      unavailableMessage: routeCopy.ageVerificationRequired,
    });
  }, [connect, routeCopy.ageVerificationRequired, session?.accessToken, startAgeSelfVerification]);

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
  const karaokeEnded = scoring.state?.status === "ended";
  const endedSummary = scoring.state?.status === "ended" ? scoring.state.summary : null;
  const effectiveRewardScoreBps = rewardOffer
    ? Math.max(7_000, rewardOffer.min_score_bps)
    : 7_000;
  const localRewardRequirementsMissed = Boolean(endedSummary && (
    Math.round(endedSummary.finalScore * 10_000) < effectiveRewardScoreBps
    || (typeof endedSummary.scoredLineCount === "number" && endedSummary.scoredLineCount < 5)
    || (
      typeof endedSummary.lineCount === "number"
      && typeof endedSummary.scoredLineCount === "number"
      && endedSummary.lineCount > 0
      && Math.floor((endedSummary.scoredLineCount * 10_000) / endedSummary.lineCount) < 8_500
    )
  ));

  React.useEffect(() => {
    if (!karaokeEnded || !rewardOffer || !session?.accessToken) return;
    if (localRewardRequirementsMissed) {
      setRewardQualification(null);
      setRewardCheckDelayed(false);
      return;
    }
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
      } else {
        setRewardCheckDelayed(true);
      }
    };
    setRewardQualification(null);
    setRewardCheckDelayed(false);
    void poll();
    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [api, karaokeEnded, localRewardRequirementsMissed, postId, rewardOffer, session?.accessToken]);

  React.useEffect(() => {
    if (!communityId || !session?.accessToken) {
      leaderboardAttemptCountBeforeTake.current = null;
      setCompletionLeaderboard(null);
      return;
    }
    let cancelled = false;
    let timeout: number | undefined;

    if (!karaokeEnded) {
      setCompletionLeaderboard(null);
      void api.communities.getPostKaraokeLeaderboard(communityId, postId, { limit: 3 })
        .then((leaderboard) => {
          if (!cancelled) {
            leaderboardAttemptCountBeforeTake.current = leaderboard.viewer_eligible_attempt_count;
          }
        })
        .catch(() => {
          if (!cancelled) leaderboardAttemptCountBeforeTake.current = null;
        });
      return () => {
        cancelled = true;
      };
    }

    let retry = 0;
    let receivedBoard = false;
    const poll = async () => {
      try {
        const leaderboard = await api.communities.getPostKaraokeLeaderboard(
          communityId,
          postId,
          { limit: 3 },
        );
        if (cancelled) return;
        receivedBoard = true;
        setCompletionLeaderboard({ kind: "ready", leaderboard });
        const previousAttemptCount = leaderboardAttemptCountBeforeTake.current;
        if (
          previousAttemptCount === null
          || leaderboard.viewer_eligible_attempt_count > previousAttemptCount
        ) {
          return;
        }
      } catch {
        if (cancelled) return;
      }
      if (retry < 5) {
        timeout = window.setTimeout(() => {
          retry += 1;
          void poll();
        }, 1_500 * 2 ** retry);
      } else if (!receivedBoard) {
        setCompletionLeaderboard({ kind: "error" });
      }
    };

    setCompletionLeaderboard({ kind: "loading" });
    void poll();
    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [api, communityId, karaokeEnded, postId, session?.accessToken]);

  if (state.phase === "loading") {
    return (
      <div className="flex h-dvh min-h-screen w-full items-center justify-center bg-background text-foreground">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (state.phase === "blocked" || state.phase === "error" || state.phase === "verification_required") {
    return (
      <>
        <KaraokeRouteMessage
          actionLabel={state.phase === "verification_required" ? "Verify age" : undefined}
          message={state.message}
          onAction={state.phase === "verification_required" ? handleVerifyAge : undefined}
          postId={postId}
          title={state.title}
        />
        {ageSelfPrompt ? (
          <SelfVerificationModal
            actionLabel={ageSelfPrompt.actionLabel}
            description={ageSelfPrompt.description}
            error={ageSelfError}
            href={ageSelfPrompt.href}
            onOpenChange={handleAgeSelfModalOpenChange}
            onQrError={handleAgeSelfQrError}
            onQrSuccess={handleAgeSelfQrSuccess}
            open={ageSelfModalOpen}
            selfApp={ageSelfPrompt.selfApp}
            title={ageSelfPrompt.title}
          />
        ) : null}
      </>
    );
  }

  return (
    <KaraokeAudioSurface
      artistName={state.payload.artistName}
      artworkSrc={state.payload.artworkSrc}
      className="h-dvh"
      instrumentalAudioUrl={state.payload.instrumentalAudioUrl}
      leaderboardSlot={karaokeEnded && completionLeaderboard ? (
        <KaraokeCompletionLeaderboard
          onViewAll={() => navigate(`/p/${encodeURIComponent(postId)}/karaoke/leaderboard`)}
          state={completionLeaderboard}
        />
      ) : undefined}
      lines={stageLines}
      onExit={() => replaceRoute(routeReturnPath(`/p/${encodeURIComponent(postId)}`))}
      onRequestSignIn={connect ?? undefined}
      onViewScores={() => navigate(`/p/${encodeURIComponent(postId)}/karaoke/leaderboard`)}
      rewardSlot={rewardOffer ? (
        karaokeEnded ? (
          <RewardQualificationNotice
            amountLabel={rewardAmountLabel(rewardOffer.daily_reward_cents, rewardOffer.chain_id)}
            expiresAt={rewardQualification?.expires_at}
            outcomeReason={localRewardRequirementsMissed ? "requirements" : rewardQualification?.outcome_reason}
            status={localRewardRequirementsMissed
              ? "unavailable"
              : displayedRewardQualificationStatus(rewardQualification?.status, rewardCheckDelayed)}
            testMode={rewardOffer.chain_id === 84532}
          />
        ) : (
          <SongRewardOfferPill
            amountLabel={rewardAmountLabel(rewardOffer.daily_reward_cents, rewardOffer.chain_id)}
          />
        )
      ) : undefined}
      rewardGoalLabel={rewardOffer
        ? `Finish · Sing 85%+ · Score ${Number((effectiveRewardScoreBps / 100).toFixed(2))}%+ · Win ${rewardAmountLabel(rewardOffer.daily_reward_cents, rewardOffer.chain_id)}`
        : undefined}
      scoring={scoring}
      showSignInCta={needsAuth}
      signInBusy={authBusy}
      signInUnavailable={!authConfigured || !connect || Boolean(authLoadError)}
      title={state.payload.title}
    />
  );
}
