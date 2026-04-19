"use client";

import * as React from "react";
import { createVeryWidget } from "@veryai/widget";
import { Gavel, Heart, LinkSimple, Lock, Plus, SealCheck, Shield } from "@phosphor-icons/react";

import { AppRoute, navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import {
  clearSession,
  setSession,
  updateSessionOnboarding,
  updateSessionProfile,
  useSession,
} from "@/lib/api/session-store";
import type { OnboardingStatus } from "@pirate/api-contracts";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";
import type { CommentListItem as ApiCommentListItem } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";
import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { CommunityPricingPolicy as ApiCommunityPricingPolicy } from "@pirate/api-contracts";
import type { CommunityPurchase as ApiCommunityPurchase } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { GateFailureDetails as ApiGateFailureDetails } from "@pirate/api-contracts";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { Post as ApiCreatedPost } from "@pirate/api-contracts";
import type { RedditVerification as ApiRedditVerification } from "@pirate/api-contracts";
import type { RedditImportSummary as ApiRedditImportSummary } from "@pirate/api-contracts";
import type { SongArtifactBundle as ApiSongArtifactBundle } from "@pirate/api-contracts";
import type { VerificationSession } from "@pirate/api-contracts";
import {
  isApiAuthError,
  isApiNotFoundError,
  type ApiError,
} from "@/lib/api/client";
import { resolveApiBaseUrl, resolveApiUrl } from "@/lib/api/base-url";
import { readStoryCdrAsset } from "@/lib/story/cdr-browser";
import { CommunityPageShell } from "@/components/compositions/community-page-shell/community-page-shell";
import {
  CommunityDonationsEditorPage,
  type DonationPartnerPreview,
  type DonationPolicyMode,
} from "@/components/compositions/community-donations-editor/community-donations-editor-page";
import {
  CommunityLinksEditorPage,
  createEmptyCommunityLinkEditorItem,
  type CommunityLinkEditorItem,
} from "@/components/compositions/community-links-editor/community-links-editor-page";
import { CommunityModerationShell } from "@/components/compositions/community-moderation-shell/community-moderation-shell";
import { CommunityGatesEditorPage } from "@/components/compositions/community-gates-editor/community-gates-editor-page";
import { CommunityMembershipGatePanel } from "@/components/compositions/community-membership-gate-panel/community-membership-gate-panel";
import { CommunityNamespaceVerificationPage } from "@/components/compositions/community-namespace-verification-page/community-namespace-verification-page";
import { CommunityRulesEditorPage } from "@/components/compositions/community-rules-editor/community-rules-editor-page";
import {
  CommunitySafetyPage,
  createDefaultCommunitySafetyAdultContentPolicy,
  createDefaultCommunitySafetyCivilityPolicy,
  createDefaultCommunitySafetyGraphicContentPolicy,
  createDefaultCommunitySafetyProviderSettings,
} from "@/components/compositions/community-safety-page/community-safety-page";
import { CommunitySidebar } from "@/components/compositions/community-sidebar/community-sidebar";
import type { CommunitySidebarRule } from "@/components/compositions/community-sidebar/community-sidebar.types";
import { ContentRailShell } from "@/components/compositions/content-rail-shell/content-rail-shell";
import { CreateCommunityComposer } from "@/components/compositions/create-community-composer/create-community-composer";
import type { IdentityGateDraft } from "@/components/compositions/create-community-composer/create-community-composer.types";
import { Feed, type FeedItem, type FeedSort, type FeedSortOption } from "@/components/compositions/feed/feed";
import { PostComposer } from "@/components/compositions/post-composer/post-composer";
import {
  defaultMonetizationState,
  defaultSongState,
} from "@/components/compositions/post-composer/post-composer-config";
import type {
  CommunityPickerItem,
  ComposerReference,
  ComposerTab,
  DerivativeStepState,
  MonetizationState,
  SongComposerState,
  SongMode,
} from "@/components/compositions/post-composer/post-composer.types";
import type { PostCardProps } from "@/components/compositions/post-card/post-card.types";
import type { SongContentSpec } from "@/components/compositions/post-card/post-card.types";
import { PostThread } from "@/components/compositions/post-thread/post-thread";
import type { PostThreadComment } from "@/components/compositions/post-thread/post-thread.types";
import type { OnboardingPhase } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap.types";
import type {
  ImportJobState,
  RedditVerificationState,
  SnapshotState,
} from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap.types";
import { OnboardingRedditBootstrap } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap";
import { ProfilePage as ProfilePageComposition } from "@/components/compositions/profile-page/profile-page";
import { SettingsPage } from "@/components/compositions/settings-page/settings-page";
import type {
  SettingsHandle,
  SettingsSubmitState,
  SettingsTab,
} from "@/components/compositions/settings-page/settings-page.types";
import { useGlobalHandleFlow } from "@/hooks/use-global-handle-flow";
import { useProfileFollowState } from "@/hooks/use-profile-follow-state";
import type {
  NamespaceVerificationCallbacks,
  SpacesChallengePayload,
} from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";
import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { Spinner } from "@/components/primitives/spinner";
import { usePiratePrivyRuntime } from "@/lib/auth/privy-provider";
import { rememberKnownCommunity, useKnownCommunities } from "@/lib/known-communities-store";
import { useUiLocale } from "@/lib/ui-locale";
import { resolveViewerContentLocale } from "@/lib/content-locale";
import { resolveLocaleLanguageTag, SUPPORTED_UI_LOCALES, type UiLocaleCode } from "@/lib/ui-locale-core";
import { buildPublicProfilePathForProfile, getProfileHandleLabel } from "@/lib/profile-routing";
import { getLocaleMessages } from "@/locales";
import {
  getGateFailureMessage,
  getSelfVerificationCapabilities,
  getVerificationPromptCopy,
} from "@/lib/identity-gates";
import { parseSelfCallback } from "@/lib/self-verification";
import { toast } from "@/components/primitives/sonner";

function interpolateMessage(
  template: string,
  replacements: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/gu, (_, key: string) => replacements[key] ?? `{${key}}`);
}

function useRouteMessages() {
  const { locale } = useUiLocale();

  return {
    copy: getLocaleMessages(locale, "routes"),
    localeTag: resolveLocaleLanguageTag(locale),
  };
}

function useClientHydrated(): boolean {
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}

function StackPageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const showHeader = Boolean(title.trim() || description || actions);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      {showHeader ? (
        <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2">
              {title.trim() ? (
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

function formatUsdLabel(value: number | null | undefined): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

function parseUsdInput(value: string | null | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }

  const normalized = Number.parseFloat(value.replace(/[^0-9.]/gu, ""));
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }

  return Math.round(normalized * 100) / 100;
}

export function buildSongPostRequest(input: {
  bundleId: string;
  derivativeStep?: Pick<DerivativeStepState, "required" | "references">;
  idempotencyKey: string;
  paidSongPriceUsd: number | null;
  songMode: SongMode;
  title: string;
}) {
  const selectedSourceRefs = input.derivativeStep?.references?.map((reference) => reference.id) ?? [];
  const publishAsDerivative = Boolean(
    input.derivativeStep?.required
    || input.songMode === "remix"
    || selectedSourceRefs.length > 0,
  );

  return {
    idempotency_key: input.idempotencyKey,
    post_type: "song" as const,
    identity_mode: "public" as const,
    translation_policy: "machine_allowed" as const,
    access_mode: input.paidSongPriceUsd != null ? "locked" as const : "public" as const,
    title: input.title.trim() || undefined,
    song_mode: publishAsDerivative ? "remix" as const : input.songMode,
    rights_basis: publishAsDerivative ? "derivative" as const : "original" as const,
    upstream_asset_refs: publishAsDerivative ? selectedSourceRefs : undefined,
    song_artifact_bundle_id: input.bundleId,
  };
}

export function buildSongListingRequest(input: {
  assetId: string;
  paidSongPriceUsd: number | null;
  pricingPolicyRegionalPricingEnabled: boolean;
  regionalPricingEnabled: boolean;
}) {
  if (input.paidSongPriceUsd == null) {
    return null;
  }

  return {
    asset_id: input.assetId,
    price_usd: input.paidSongPriceUsd,
    regional_pricing_enabled:
      input.pricingPolicyRegionalPricingEnabled
      && input.regionalPricingEnabled,
    status: "active" as const,
  };
}

export function resolveComposerSubmitState(input: {
  canSubmit: boolean;
  composerMode: ComposerTab;
  derivativeStep?: Pick<DerivativeStepState, "required" | "references">;
  monetizationState: Pick<MonetizationState, "visible" | "rightsAttested">;
  paidSongPriceInvalid: boolean;
  submitError: string | null;
}) {
  const missingRightsAttestation = input.composerMode === "song"
    && input.monetizationState.visible
    && !input.monetizationState.rightsAttested;
  const missingRequiredRemixSource = input.composerMode === "song"
    && input.derivativeStep?.required === true
    && (input.derivativeStep.references?.length ?? 0) === 0;
  const validationError = !input.canSubmit
    ? null
    : input.paidSongPriceInvalid
      ? "Enter a valid unlock price."
      : missingRightsAttestation
        ? "Confirm you have the rights to publish and monetize this track."
        : missingRequiredRemixSource
          ? "Attach a source track before publishing this remix."
          : null;

  return {
    disabled: !input.canSubmit
      || input.paidSongPriceInvalid
      || missingRightsAttestation
      || missingRequiredRemixSource,
    submitError: validationError ?? input.submitError,
  };
}

function mapListingStatus(
  status: ApiCommunityListing["status"] | undefined,
): SongContentSpec["listingStatus"] | undefined {
  if (status === "active") return "active";
  if (status === "paused" || status === "draft") return "paused";
  if (status === "archived") return "removed";
  return undefined;
}

type SongCommerceState = {
  listingsByAssetId: Record<string, ApiCommunityListing | undefined>;
  purchasesByAssetId: Record<string, ApiCommunityPurchase | undefined>;
};

type SongPlaybackDescriptor = {
  key: string;
  title: string;
} & ({
  kind: "source";
  sourcePath: string;
  requiresAuth: boolean;
} | {
  kind: "asset";
  communityId: string;
  assetId: string;
});

type SongPlaybackController = {
  getPlaybackState: (trackKey: string) => SongContentSpec["playbackState"];
  playTrack: (descriptor: SongPlaybackDescriptor) => Promise<void>;
  pauseTrack: (trackKey: string) => void;
};

function useSongCommerceState(communityId: string, enabled: boolean) {
  const api = useApi();
  const [listingsByAssetId, setListingsByAssetId] = React.useState<Record<string, ApiCommunityListing | undefined>>({});
  const [purchasesByAssetId, setPurchasesByAssetId] = React.useState<Record<string, ApiCommunityPurchase | undefined>>({});

  const refresh = React.useCallback(async () => {
    if (!enabled) {
      setListingsByAssetId({});
      setPurchasesByAssetId({});
      return;
    }

    try {
      const [listingsResult, purchasesResult] = await Promise.all([
        api.communities.listListings(communityId),
        api.communities.listPurchases(communityId),
      ]);

      setListingsByAssetId(Object.fromEntries(
        listingsResult.items
          .filter((listing) => typeof listing.asset_id === "string" && listing.asset_id.length > 0)
          .map((listing) => [listing.asset_id as string, listing] as const),
      ));
      setPurchasesByAssetId(Object.fromEntries(
        purchasesResult.items
          .filter((purchase) => typeof purchase.asset_id === "string" && purchase.asset_id.length > 0)
          .map((purchase) => [purchase.asset_id as string, purchase] as const),
      ));
    } catch (error) {
      console.warn("[song-commerce] failed to refresh commerce state", {
        communityId,
        message: error instanceof Error ? error.message : String(error),
      });
      setListingsByAssetId({});
      setPurchasesByAssetId({});
    }
  }, [api, communityId, enabled]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    listingsByAssetId,
    purchasesByAssetId,
    refresh,
  };
}

function useSongPlayback(accessToken: string | null): SongPlaybackController {
  const api = useApi();
  const { connect, connectedWallets } = usePiratePrivyRuntime();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const objectUrlsRef = React.useRef(new Map<string, string>());
  const activeTrackKeyRef = React.useRef<string | null>(null);
  const [activeTrackKey, setActiveTrackKey] = React.useState<string | null>(null);
  const [bufferingTrackKey, setBufferingTrackKey] = React.useState<string | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  React.useEffect(() => {
    activeTrackKeyRef.current = activeTrackKey;
  }, [activeTrackKey]);

  React.useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handlePlay = () => {
      setBufferingTrackKey(null);
      setIsPlaying(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setActiveTrackKey(null);
    };
    const handleWaiting = () => {
      if (activeTrackKeyRef.current) {
        setBufferingTrackKey(activeTrackKeyRef.current);
      }
    };
    const handleCanPlay = () => {
      setBufferingTrackKey(null);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      for (const url of objectUrlsRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current.clear();
      audioRef.current = null;
    };
  }, []);

  const fetchTrackBlob = React.useCallback(async (descriptor: SongPlaybackDescriptor): Promise<Blob> => {
    if (descriptor.kind === "source") {
      const response = await fetch(resolveApiUrl(descriptor.sourcePath), {
        headers: descriptor.requiresAuth && accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });

      if (!response.ok) {
        throw new Error(`Could not load ${descriptor.title}`);
      }

      return await response.blob();
    }

    const access = await api.communities.resolveAssetAccess(descriptor.communityId, descriptor.assetId);
    if (!access.access_granted) {
      if (access.decision_reason === "purchase_required") {
        throw new Error(`Purchase required to play ${descriptor.title}.`);
      }
      throw new Error(`Could not access ${descriptor.title}.`);
    }

    if (access.delivery_kind === "primary_content_ref" && access.delivery_ref) {
      const response = await fetch(resolveApiUrl(access.delivery_ref), {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (!response.ok) {
        throw new Error(`Could not load ${descriptor.title}`);
      }
      return await response.blob();
    }

    if (access.delivery_kind === "story_cdr_ref" && access.story_cdr_access) {
      if (!connectedWallets[0]) {
        connect?.();
        throw new Error("Connect a wallet to unlock Story CDR playback.");
      }
      return await readStoryCdrAsset({
        access: access.story_cdr_access,
        accessToken,
        wallet: connectedWallets[0],
      });
    }

    throw new Error(`Could not load ${descriptor.title}`);
  }, [accessToken, api.communities, connect, connectedWallets]);

  const loadTrackUrl = React.useCallback(async (descriptor: SongPlaybackDescriptor): Promise<string> => {
    const existing = objectUrlsRef.current.get(descriptor.key);
    if (existing) {
      return existing;
    }

    const objectUrl = URL.createObjectURL(await fetchTrackBlob(descriptor));
    objectUrlsRef.current.set(descriptor.key, objectUrl);
    return objectUrl;
  }, [fetchTrackBlob]);

  const playTrack = React.useCallback(async (descriptor: SongPlaybackDescriptor) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    try {
      setActiveTrackKey(descriptor.key);
      setBufferingTrackKey(descriptor.key);
      const sourceUrl = await loadTrackUrl(descriptor);
      if (audio.src !== sourceUrl) {
        audio.src = sourceUrl;
      }
      await audio.play();
    } catch (error) {
      setBufferingTrackKey(null);
      setActiveTrackKey(null);
      toast.error(getErrorMessage(error, `Could not play ${descriptor.title}.`));
    }
  }, [loadTrackUrl]);

  const pauseTrack = React.useCallback((trackKey: string) => {
    if (activeTrackKey !== trackKey) {
      return;
    }

    audioRef.current?.pause();
  }, [activeTrackKey]);

  const getPlaybackState = React.useCallback((trackKey: string): SongContentSpec["playbackState"] => {
    if (bufferingTrackKey === trackKey) {
      return "buffering";
    }

    if (activeTrackKey === trackKey) {
      return isPlaying ? "playing" : "paused";
    }

    return "idle";
  }, [activeTrackKey, bufferingTrackKey, isPlaying]);

  return {
    getPlaybackState,
    pauseTrack,
    playTrack,
  };
}

function AuthRequiredRouteState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const hydrated = useClientHydrated();
  const { busy, configured, connect, loaded } = usePiratePrivyRuntime();

  if (!hydrated || (configured && !loaded)) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center py-20">
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6" />
        </div>
      </section>
    );
  }

  return (
    <StackPageShell title={title}>
      <StatusCard
        title="Session expired"
        description={description}
        tone="warning"
        actions={configured && connect ? (
          <Button loading={busy} onClick={connect}>
            Reconnect
          </Button>
        ) : undefined}
      />
    </StackPageShell>
  );
}

function RouteLoadFailureState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <StackPageShell
      title={title}
      actions={(
        <Button onClick={() => window.location.reload()} variant="secondary">
          Try Again
        </Button>
      )}
    >
      <StatusCard
        title="Could not load this page"
        description={description}
        tone="warning"
      />
    </StackPageShell>
  );
}

function EmptyFeedState({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
      <p className="text-base leading-7 text-muted-foreground">{message}</p>
    </div>
  );
}

function StatusCard({
  title,
  description,
  actions,
  tone = "default",
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const toneClassName = tone === "success"
    ? "border-emerald-500/20 bg-emerald-500/5"
    : tone === "warning"
      ? "border-amber-500/20 bg-amber-500/5"
      : "border-border-soft bg-card";

  return (
    <div className={`rounded-[var(--radius-3xl)] border px-5 py-5 ${toneClassName}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}

function HomePage() {
  const api = useApi();
  const session = useSession();
  const { copy } = useRouteMessages();
  const { locale: uiLocale } = useUiLocale();
  const preferredUiLocale: UiLocaleCode = session?.profile.preferred_locale
    && isUiLocaleCode(session.profile.preferred_locale)
    ? session.profile.preferred_locale
    : uiLocale;
  const contentLocale = React.useMemo(() => resolveViewerContentLocale({
    uiLocale: preferredUiLocale,
    browserLocales: typeof navigator === "undefined"
      ? []
      : [...navigator.languages, navigator.language].filter(Boolean),
  }), [preferredUiLocale]);
  const [activeSort, setActiveSort] = React.useState<FeedSort>("best");
  const [feedEntries, setFeedEntries] = React.useState<ApiHomeFeedItem[]>([]);
  const [authorProfiles, setAuthorProfiles] = React.useState<Record<string, ApiProfile | null>>({});
  const [listingsByAssetId, setListingsByAssetId] = React.useState<Record<string, ApiCommunityListing | undefined>>({});
  const [purchasesByAssetId, setPurchasesByAssetId] = React.useState<Record<string, ApiCommunityPurchase | undefined>>({});
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);
  const songPlayback = useSongPlayback(session?.accessToken ?? null);

  React.useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    void api.feed.home({
        locale: contentLocale,
        sort: activeSort,
      })
      .then(async (result) => {
        const nextFeedEntries = result.items;
        const nextAuthorProfiles = await loadProfilesByUserId(
          api,
          nextFeedEntries
            .map((entry) => entry.post.post.identity_mode === "public" ? entry.post.post.author_user_id : null)
            .filter((userId): userId is string => Boolean(userId)),
          session?.profile ? { [session.user.user_id]: session.profile } : {},
        );
        const songCommunityIds = [...new Set(
          nextFeedEntries
            .filter((entry) => entry.post.post.post_type === "song")
            .map((entry) => entry.community.community_id),
        )];
        const commerceByCommunity = await Promise.all(songCommunityIds.map(async (communityId) => {
          const [listings, purchases] = await Promise.all([
            api.communities.listListings(communityId)
              .then((response) => response.items)
              .catch(() => []),
            api.communities.listPurchases(communityId)
              .then((response) => response.items)
              .catch(() => []),
          ]);
          return { communityId, listings, purchases };
        }));

        if (cancelled) return;

        setFeedEntries(nextFeedEntries);
        setAuthorProfiles(nextAuthorProfiles);
        setListingsByAssetId(Object.fromEntries(
          commerceByCommunity.flatMap((result) => result.listings.map((listing) => (
            typeof listing.asset_id === "string" && listing.asset_id.length > 0
              ? [[listing.asset_id, listing] as const]
              : []
          ))),
        ));
        setPurchasesByAssetId(Object.fromEntries(
          commerceByCommunity.flatMap((result) => result.purchases.map((purchase) => (
            typeof purchase.asset_id === "string" && purchase.asset_id.length > 0
              ? [[purchase.asset_id, purchase] as const]
              : []
          ))),
        ));
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        if (isApiAuthError(nextError)) {
          clearSession();
          setFeedEntries([]);
          setAuthorProfiles({});
          setListingsByAssetId({});
          setPurchasesByAssetId({});
          setError(null);
          return;
        }
        setError(nextError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSort, api, contentLocale, session]);

  const feedItems = feedEntries.map((entry) => {
    const assetId = entry.post.post.asset_id ?? undefined;
    const listing = assetId ? listingsByAssetId[assetId] : undefined;
    const purchase = assetId ? purchasesByAssetId[assetId] : undefined;

    return toHomeFeedItem(entry, authorProfiles, entry.post.post.post_type === "song"
      ? {
        currentUserId: session?.user?.user_id,
        listing,
        playback: songPlayback,
        purchase,
      }
      : undefined);
  });

  if (error) {
    return (
      <RouteLoadFailureState
        description={getErrorMessage(error, "The home feed could not be loaded right now.")}
        title={copy.home.title}
      />
    );
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <Feed
        activeSort={activeSort}
        availableSorts={HOME_SORT_OPTIONS}
        emptyState={{
          action: (
            <Button onClick={() => navigate("/communities/new")} variant="secondary">
              Create community
            </Button>
          ),
          body: "Join a community or create one to start building your home feed.",
          title: "No posts yet.",
        }}
        items={feedItems}
        loading={loading}
        onSortChange={setActiveSort}
        title={copy.home.title}
      />
    </section>
  );
}

const HOME_SORT_OPTIONS: FeedSortOption[] = [
  { value: "best", label: "Best" },
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
];

const YOUR_COMMUNITIES_SORT_OPTIONS: FeedSortOption[] = [
  { value: "best", label: "Best" },
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
];

export const COMMUNITY_SORT_OPTIONS: FeedSortOption[] = [
  { value: "best", label: "Best" },
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
];

export type HomeFeedEntry = ApiHomeFeedItem;

function formatCommunityLabel(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "c/unknown";
  if (trimmed.toLowerCase().startsWith("c/")) return trimmed;
  return `c/${trimmed}`;
}

function getPostScore(post: ApiPost): number {
  return post.upvote_count - post.downvote_count;
}

function YourCommunitiesPage() {
  const { copy } = useRouteMessages();
  const [activeSort, setActiveSort] = React.useState<FeedSort>("best");

  return (
    <Feed
      activeSort={activeSort}
      availableSorts={YOUR_COMMUNITIES_SORT_OPTIONS}
      emptyState={{
        action: (
          <Button variant="secondary" onClick={() => navigate("/communities/new")}>
            Create community
          </Button>
        ),
        body: "Join a few communities or start one to make this feed useful.",
        title: "No posts yet.",
      }}
      items={[]}
      onSortChange={setActiveSort}
      title={copy.yourCommunities.title}
    />
  );
}

function CreatePostPage({ communityId }: { communityId: string }) {
  const api = useApi();
  const session = useSession();
  const [community, setCommunity] = React.useState<ApiCommunity | null>(null);
  const [eligibility, setEligibility] = React.useState<ApiJoinEligibility | null>(null);
  const [pricingPolicy, setPricingPolicy] = React.useState<ApiCommunityPricingPolicy | null>(null);
  const [loadError, setLoadError] = React.useState<unknown>(null);
  const [composerMode, setComposerMode] = React.useState<ComposerTab>("text");
  const [identityMode, setIdentityMode] = React.useState<"public" | "anonymous">("public");
  const [selectedQualifierIds, setSelectedQualifierIds] = React.useState<string[]>([]);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [caption, setCaption] = React.useState("");
  const [lyrics, setLyrics] = React.useState("");
  const [songState, setSongState] = React.useState<SongComposerState>(() => defaultSongState());
  const [monetizationState, setMonetizationState] = React.useState<MonetizationState>(() => defaultMonetizationState());
  const [songMode, setSongMode] = React.useState<SongMode>("original");
  const [derivativeStep, setDerivativeStep] = React.useState<DerivativeStepState | undefined>(undefined);
  const [pendingSongBundleId, setPendingSongBundleId] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const clearPendingSongBundle = React.useCallback(() => {
    setPendingSongBundleId(null);
    setDerivativeStep((current) => current?.trigger === "analysis" ? undefined : current);
  }, []);

  const songBundleInputFingerprint = React.useMemo(
    () => JSON.stringify({
      lyrics,
      primary: songState.primaryAudioUpload
        ? {
            name: songState.primaryAudioUpload.name,
            size: songState.primaryAudioUpload.size,
            lastModified: songState.primaryAudioUpload.lastModified,
          }
        : null,
      cover: songState.coverUpload
        ? {
            name: songState.coverUpload.name,
            size: songState.coverUpload.size,
            lastModified: songState.coverUpload.lastModified,
          }
        : null,
      preview: songState.previewAudioUpload
        ? {
            name: songState.previewAudioUpload.name,
            size: songState.previewAudioUpload.size,
            lastModified: songState.previewAudioUpload.lastModified,
          }
        : null,
      canvas: songState.canvasVideoUpload
        ? {
            name: songState.canvasVideoUpload.name,
            size: songState.canvasVideoUpload.size,
            lastModified: songState.canvasVideoUpload.lastModified,
          }
        : null,
      instrumental: songState.instrumentalAudioUpload
        ? {
            name: songState.instrumentalAudioUpload.name,
            size: songState.instrumentalAudioUpload.size,
            lastModified: songState.instrumentalAudioUpload.lastModified,
          }
        : null,
      vocal: songState.vocalAudioUpload
        ? {
            name: songState.vocalAudioUpload.name,
            size: songState.vocalAudioUpload.size,
            lastModified: songState.vocalAudioUpload.lastModified,
          }
        : null,
    }),
    [
      lyrics,
      songState.canvasVideoUpload,
      songState.coverUpload,
      songState.instrumentalAudioUpload,
      songState.previewAudioUpload,
      songState.primaryAudioUpload,
      songState.vocalAudioUpload,
    ],
  );
  const previousSongBundleInputFingerprint = React.useRef(songBundleInputFingerprint);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSubmitError(null);

    void Promise.all([
      api.communities.get(communityId),
      api.communities.getJoinEligibility(communityId),
      api.communities.getPricingPolicy(communityId).catch(() => null),
    ])
      .then(([communityResult, eligibilityResult, pricingPolicyResult]) => {
        if (cancelled) return;
        setCommunity(communityResult);
        setEligibility(eligibilityResult);
        setPricingPolicy(pricingPolicyResult);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, communityId]);

  React.useEffect(() => {
    if (previousSongBundleInputFingerprint.current !== songBundleInputFingerprint) {
      previousSongBundleInputFingerprint.current = songBundleInputFingerprint;
      clearPendingSongBundle();
      setSubmitError(null);
    }
  }, [clearPendingSongBundle, songBundleInputFingerprint]);

  React.useEffect(() => {
    if (!community) return;

    rememberKnownCommunity({
      avatarSrc: community.avatar_ref ?? undefined,
      communityId: community.community_id,
      displayName: community.display_name,
    });
  }, [community]);

  React.useEffect(() => {
    setMonetizationState((prev) => ({
      ...prev,
      regionalPricingAvailable: pricingPolicy?.regional_pricing_enabled === true,
      regionalPricingEnabled:
        pricingPolicy?.regional_pricing_enabled === true
          ? prev.regionalPricingEnabled ?? false
          : false,
    }));
  }, [pricingPolicy?.regional_pricing_enabled]);

  const availableIdentityQualifiers = React.useMemo(
    () => (community?.allowed_disclosed_qualifiers ?? []).map((qualifierId) => ({
      qualifierId,
      label: formatQualifierLabel(qualifierId),
    })),
    [community?.allowed_disclosed_qualifiers],
  );

  React.useEffect(() => {
    if (!community?.allow_anonymous_identity) {
      setIdentityMode("public");
    }
  }, [community?.allow_anonymous_identity]);

  React.useEffect(() => {
    if (composerMode === "song") {
      setIdentityMode("public");
    }
  }, [composerMode]);

  React.useEffect(() => {
    if (!availableIdentityQualifiers.length) {
      setSelectedQualifierIds([]);
      return;
    }

    const allowedQualifierIds = new Set(availableIdentityQualifiers.map((qualifier) => qualifier.qualifierId));
    setSelectedQualifierIds((current) => current.filter((qualifierId) => allowedQualifierIds.has(qualifierId)));
  }, [availableIdentityQualifiers]);

  const canSubmitText = title.trim().length > 0 && body.trim().length > 0;
  const canSubmitSong = Boolean(songState.primaryAudioUpload && lyrics.trim());
  const canSubmitLink = title.trim().length > 0 && linkUrl.trim().length > 0;
  const canSubmit = composerMode === "song" ? canSubmitSong : composerMode === "link" ? canSubmitLink : canSubmitText;
  const paidSongPriceUsd = composerMode === "song" && monetizationState.visible
    ? parseUsdInput(monetizationState.priceUsd ?? monetizationState.priceLabel)
    : null;
  const paidSongPriceInvalid = composerMode === "song" && monetizationState.visible && paidSongPriceUsd == null;
  const submitState = resolveComposerSubmitState({
    canSubmit,
    composerMode,
    derivativeStep,
    monetizationState,
    paidSongPriceInvalid,
    submitError,
  });

  const buildMatchedSourceReferences = React.useCallback((bundle: ApiSongArtifactBundle): ComposerReference[] => {
    const moderationResult = bundle.moderation_result && typeof bundle.moderation_result === "object"
      ? bundle.moderation_result as {
          audio_identification?: {
            provider_result?: {
              metadata?: {
                custom_files?: unknown[]
              }
            }
          }
        }
      : null
    const customFiles = moderationResult?.audio_identification?.provider_result?.metadata?.custom_files
    if (!Array.isArray(customFiles)) {
      return []
    }

    const seen = new Set<string>()
    return customFiles.flatMap((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return []
      }
      const acrid = "acrid" in entry && typeof entry.acrid === "string" ? entry.acrid : null
      const titleText = "title" in entry && typeof entry.title === "string" && entry.title.trim()
        ? entry.title.trim()
        : `Matched source ${index + 1}`
      const subtitleParts = [
        "community_id" in entry && typeof entry.community_id === "string" ? entry.community_id : null,
        "score" in entry && typeof entry.score === "number" ? `score ${entry.score}` : null,
      ].filter(Boolean)
      const id = acrid ? `acr:custom-file:${acrid}` : `acr:custom-file:match:${index}`
      if (seen.has(id)) {
        return []
      }
      seen.add(id)
      return [{
        id,
        title: titleText,
        subtitle: subtitleParts.length ? subtitleParts.join(" • ") : undefined,
      }]
    })
  }, [])

  const resolveBundleAnalysisState = React.useCallback((bundle: ApiSongArtifactBundle): string | null => {
    const moderationResult = bundle.moderation_result && typeof bundle.moderation_result === "object"
      ? bundle.moderation_result as { analysis_state?: string }
      : null
    return moderationResult?.analysis_state ?? null
  }, [])

  const uploadSongArtifact = React.useCallback(async (
    artifactKind: "primary_audio" | "cover_art" | "preview_audio" | "canvas_video" | "instrumental_audio" | "vocal_audio",
    file: File | null | undefined,
  ) => {
    if (!file) {
      return null;
    }

    const intent = await api.communities.createSongArtifactUpload(communityId, {
      artifact_kind: artifactKind,
      mime_type: file.type,
      filename: file.name,
      size_bytes: file.size,
    });
    const uploaded = await api.communities.uploadSongArtifactContent(
      communityId,
      intent.song_artifact_upload_id,
      await file.arrayBuffer(),
    );
    return uploaded;
  }, [api, communityId]);

  const handleSubmit = React.useCallback(async () => {
    if (submitState.disabled || !community || eligibility?.status !== "already_joined") {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      let result: ApiCreatedPost;
      const resolvedIdentityMode = composerMode === "song" || !community.allow_anonymous_identity
        ? "public"
        : identityMode;
      const anonymousScope = resolvedIdentityMode === "anonymous"
        ? (community.anonymous_identity_scope ?? "community_stable")
        : undefined;
      const disclosedQualifierIds = resolvedIdentityMode === "anonymous" && selectedQualifierIds.length > 0
        ? selectedQualifierIds
        : undefined;
      const isLockedSong = composerMode === "song" && paidSongPriceUsd != null;

      if (composerMode === "song") {
        if (monetizationState.visible && paidSongPriceUsd == null) {
          throw new Error("Enter a valid unlock price before publishing this song.");
        }

        if (isLockedSong && !monetizationState.rightsAttested) {
          throw new Error("Confirm you have the rights to sell this song before publishing it.");
        }

        const selectedSourceRefs = derivativeStep?.references?.map((reference) => reference.id) ?? [];
        if (derivativeStep?.required && selectedSourceRefs.length === 0) {
          throw new Error("Attach a source track before publishing this remix");
        }

        let bundleId = pendingSongBundleId;

        if (!bundleId) {
          const primaryAudio = await uploadSongArtifact("primary_audio", songState.primaryAudioUpload);
          if (!primaryAudio) {
            throw new Error("Primary audio is required");
          }

          const coverArt = await uploadSongArtifact("cover_art", songState.coverUpload);
          const previewAudio = await uploadSongArtifact("preview_audio", songState.previewAudioUpload);
          const canvasVideo = await uploadSongArtifact("canvas_video", songState.canvasVideoUpload);
          const instrumentalAudio = await uploadSongArtifact("instrumental_audio", songState.instrumentalAudioUpload);
          const vocalAudio = await uploadSongArtifact("vocal_audio", songState.vocalAudioUpload);

          const bundle = await api.communities.createSongArtifactBundle(communityId, {
            primary_audio: {
              song_artifact_upload_id: primaryAudio.song_artifact_upload_id,
            },
            lyrics: lyrics.trim(),
            cover_art: coverArt
              ? { song_artifact_upload_id: coverArt.song_artifact_upload_id }
              : null,
            preview_audio: previewAudio
              ? { song_artifact_upload_id: previewAudio.song_artifact_upload_id }
              : null,
            canvas_video: canvasVideo
              ? { song_artifact_upload_id: canvasVideo.song_artifact_upload_id }
              : null,
            instrumental_audio: instrumentalAudio
              ? { song_artifact_upload_id: instrumentalAudio.song_artifact_upload_id }
              : null,
            vocal_audio: vocalAudio
              ? { song_artifact_upload_id: vocalAudio.song_artifact_upload_id }
              : null,
          });

          bundleId = bundle.song_artifact_bundle_id;

          if (resolveBundleAnalysisState(bundle) === "allow_with_required_reference") {
            const matchedReferences = buildMatchedSourceReferences(bundle)
            setPendingSongBundleId(bundle.song_artifact_bundle_id)
            setSongMode("remix")
            setDerivativeStep((current) => ({
              visible: true,
              required: true,
              trigger: "analysis",
              requirementLabel: "This audio matches an existing song. Publish it as a remix and keep the source track attached.",
              searchResults: matchedReferences,
              references: matchedReferences.length
                ? matchedReferences
                : current?.references,
            }))
            setSubmitError(
              matchedReferences.length
                ? "Review the matched source track, then submit again as a remix."
                : "This audio matches an existing song. Attach a source track, then submit again as a remix.",
            )
            return;
          }
        }

        result = await api.communities.createPost(communityId, buildSongPostRequest({
          bundleId,
          derivativeStep,
          idempotencyKey: crypto.randomUUID(),
          paidSongPriceUsd,
          songMode,
          title,
        }));

        if (isLockedSong) {
          if (!result.asset_id) {
            throw new Error("The song published, but the paid asset was not created.");
          }

          const listingRequest = buildSongListingRequest({
            assetId: result.asset_id,
            paidSongPriceUsd,
            pricingPolicyRegionalPricingEnabled: pricingPolicy?.regional_pricing_enabled === true,
            regionalPricingEnabled: monetizationState.regionalPricingEnabled === true,
          });
          if (!listingRequest) {
            throw new Error("The song published, but the paid listing payload was not created.");
          }
          await api.communities.createListing(communityId, listingRequest);
        }
      } else if (composerMode === "link") {
        result = await api.communities.createPost(communityId, {
          idempotency_key: crypto.randomUUID(),
          post_type: "link",
          identity_mode: resolvedIdentityMode,
          anonymous_scope: anonymousScope,
          disclosed_qualifier_ids: disclosedQualifierIds,
          translation_policy: "machine_allowed",
          title: title.trim(),
          link_url: linkUrl.trim(),
          caption: caption.trim() || undefined,
        });
      } else {
        result = await api.communities.createPost(communityId, {
          idempotency_key: crypto.randomUUID(),
          post_type: "text",
          identity_mode: resolvedIdentityMode,
          anonymous_scope: anonymousScope,
          disclosed_qualifier_ids: disclosedQualifierIds,
          translation_policy: "machine_allowed",
          title: title.trim(),
          body: body.trim(),
        });
      }

      navigate(`/p/${result.post_id}`);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setSubmitError(apiError?.message ?? "Could not create post");
    } finally {
      setSubmitting(false);
    }
  }, [
    api,
    body,
    buildMatchedSourceReferences,
    caption,
    community,
    communityId,
    composerMode,
    derivativeStep?.references,
    derivativeStep?.required,
    eligibility?.status,
    lyrics,
    linkUrl,
    pendingSongBundleId,
    pricingPolicy?.regional_pricing_enabled,
    resolveBundleAnalysisState,
    songMode,
    songState.canvasVideoUpload,
    songState.coverUpload,
    songState.instrumentalAudioUpload,
    songState.previewAudioUpload,
    songState.primaryAudioUpload,
    songState.vocalAudioUpload,
    monetizationState.priceLabel,
    monetizationState.priceUsd,
    monetizationState.regionalPricingEnabled,
    monetizationState.rightsAttested,
    monetizationState.visible,
    identityMode,
    paidSongPriceUsd,
    submitState.disabled,
    title,
    selectedQualifierIds,
    uploadSongArtifact,
  ]);

  if (loading) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center py-20">
        <Spinner className="size-6" />
      </section>
    );
  }

  if (loadError) {
    if (isApiAuthError(loadError)) {
      return (
        <AuthRequiredRouteState
          description="Reconnect to open the post composer again."
          title="Create post"
        />
      );
    }

    if (isApiNotFoundError(loadError)) {
      return <NotFoundPage path={`/c/${communityId}/submit`} />;
    }

    return (
      <RouteLoadFailureState
        description={getErrorMessage(loadError, "The post composer could not be loaded right now.")}
        title="Create post"
      />
    );
  }

  if (!community || !eligibility) {
    return (
      <RouteLoadFailureState
        description="The community response was incomplete. Try loading the composer again."
        title="Create post"
      />
    );
  }

  if (eligibility.status !== "already_joined") {
    return (
      <ContentRailShell
        rail={<CommunitySidebar {...buildCommunitySidebar(community)} />}
      >
        <StackPageShell
          title="Create post"
          actions={(
            <Button onClick={() => navigate(`/c/${communityId}`)} variant="secondary">
              Back to community
            </Button>
          )}
        >
          <StatusCard
            title="Join this community before posting"
            description="Only community members can publish posts here."
            tone="warning"
          />
        </StackPageShell>
      </ContentRailShell>
    );
  }

  return (
    <ContentRailShell
      rail={<CommunitySidebar {...buildCommunitySidebar(community)} />}
    >
      <StackPageShell title="">
        <PostComposer
          availableTabs={["text", "link", "song"]}
          canCreateSongPost
          captionValue={caption}
          clubName={`c/${community.display_name}`}
          linkUrlValue={linkUrl}
          lyricsValue={lyrics}
          mode={composerMode}
          onCaptionValueChange={setCaption}
          onLinkUrlValueChange={setLinkUrl}
          onLyricsValueChange={setLyrics}
          onModeChange={setComposerMode}
          onMonetizationChange={setMonetizationState}
          onIdentityModeChange={setIdentityMode}
          onDerivativeStepChange={setDerivativeStep}
          onSelectedQualifierIdsChange={setSelectedQualifierIds}
          onSongChange={setSongState}
          onSongModeChange={setSongMode}
          onSubmit={() => void handleSubmit()}
          onTextBodyValueChange={setBody}
          onTitleValueChange={setTitle}
          monetization={monetizationState}
          identity={community
            ? {
              allowAnonymousIdentity: community.allow_anonymous_identity,
              allowQualifiersOnAnonymousPosts: community.allow_qualifiers_on_anonymous_posts ?? true,
              identityMode,
              publicHandle: resolvePublicIdentityLabel(session?.profile) ?? "@handle",
              anonymousLabel: resolveAnonymousComposerLabel(community.anonymous_identity_scope),
              availableQualifiers: availableIdentityQualifiers,
              selectedQualifierIds,
            }
            : undefined}
          derivativeStep={derivativeStep}
          song={songState}
          songMode={songMode}
          submitLabel={composerMode === "song" && derivativeStep?.required ? "Publish remix" : "Post"}
          submitDisabled={submitState.disabled}
          submitError={submitState.submitError}
          submitLoading={submitting}
          textBodyValue={body}
          titleCountLabel={`${title.length}/300`}
          titleValue={title}
        />
      </StackPageShell>
    </ContentRailShell>
  );
}

function formatRelativeTimestamp(isoString: string): string {
  const timestamp = new Date(isoString).getTime();
  if (Number.isNaN(timestamp)) return "";

  const diffMinutes = Math.floor((Date.now() - timestamp) / 60_000);

  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w`;

  return new Date(isoString).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

function formatQualifierLabel(qualifierTemplateId: string): string {
  const trimmed = qualifierTemplateId.trim();
  if (!trimmed) return "Qualifier";

  const normalized = trimmed
    .replace(/^qlf_/iu, "")
    .replace(/^vc_/iu, "")
    .replace(/^proof_/iu, "");

  if (normalized === "age_over_18") return "18+";
  if (normalized === "unique_human") return "Unique Human";
  if (normalized === "sanctions_clear") return "Sanctions Clear";

  return normalized
    .split(/[_-]+/u)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function resolveAnonymousComposerLabel(
  scope: ApiCommunity["anonymous_identity_scope"] | undefined | null,
): string {
  switch (scope) {
    case "thread_stable":
      return "anon_thread";
    case "post_ephemeral":
      return "anon_post";
    case "community_stable":
    default:
      return "anon_community";
  }
}

function resolvePublicIdentityLabel(
  profile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
): string | null {
  if (!profile?.global_handle?.label) {
    return null;
  }

  return getProfileHandleLabel(profile);
}

function resolvePublicAuthorFallback(
  authorUserId?: string | null,
  authorProfile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
): string {
  return resolvePublicIdentityLabel(authorProfile)
    ?? (authorUserId ? authorUserId.slice(0, 8) : "Pirate user");
}

function resolvePostAuthorLabel(
  post: Pick<ApiPost["post"], "agent_display_name_snapshot" | "anonymous_label" | "author_user_id" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
): string {
  if (post.identity_mode === "anonymous") {
    return post.anonymous_label ?? "anon";
  }

  return post.agent_display_name_snapshot
    ? post.agent_display_name_snapshot
    : resolvePublicAuthorFallback(post.author_user_id, authorProfile);
}

function resolveCommentAuthorLabel(
  comment: Pick<ApiCommentListItem["comment"], "anonymous_label" | "author_user_id" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
): string {
  if (comment.identity_mode === "anonymous") {
    return comment.anonymous_label ?? "anon";
  }

  return resolvePublicAuthorFallback(comment.author_user_id, authorProfile);
}

function resolvePostQualifierLabels(postResponse: ApiPost): string[] | undefined {
  const disclosedQualifierLabels = postResponse.post.disclosed_qualifiers_json
    ?.map((qualifier) => qualifier.rendered_label?.trim())
    .filter((label): label is string => Boolean(label));

  if (disclosedQualifierLabels?.length) {
    return disclosedQualifierLabels;
  }

  return postResponse.label?.label ? [postResponse.label.label] : undefined;
}

function toViewerVote(value: ApiPost["viewer_vote"]): PostCardProps["engagement"]["viewerVote"] {
  if (value === 1) return "up";
  if (value === -1) return "down";
  return null;
}

function toCommentViewerVote(value: ApiCommentListItem["viewer_vote"]): "up" | "down" | null {
  if (value === 1) return "up";
  if (value === -1) return "down";
  return null;
}

type SongPresentationOptions = {
  currentUserId?: string | null;
  listing?: ApiCommunityListing;
  purchase?: ApiCommunityPurchase;
  playback?: SongPlaybackController;
  onBuy?: () => void;
};

function toSongPlaybackDescriptor(
  postResponse: ApiPost,
  input: {
    currentUserId?: string | null;
    purchase?: ApiCommunityPurchase;
  },
): SongPlaybackDescriptor | null {
  const { post } = postResponse;
  const mediaRef = post.media_refs?.[0]?.storage_ref ?? null;
  const viewerOwnsPost = Boolean(input.currentUserId && post.author_user_id === input.currentUserId);
  const isLocked = (post.access_mode ?? "public") === "locked";
  const hasFullAccess = !isLocked || viewerOwnsPost || Boolean(input.purchase);

  if (!isLocked && mediaRef) {
    return {
      key: `public:${post.post_id}`,
      title: post.title ?? "song",
      kind: "source",
      sourcePath: mediaRef,
      requiresAuth: false,
    };
  }

  if (hasFullAccess && post.asset_id) {
    return {
      key: `asset:${post.asset_id}`,
      title: post.title ?? "song",
      kind: "asset",
      communityId: post.community_id,
      assetId: post.asset_id,
    };
  }

  if (mediaRef) {
    return {
      key: `preview:${post.post_id}`,
      title: post.title ?? "song preview",
      kind: "source",
      sourcePath: mediaRef,
      requiresAuth: false,
    };
  }

  return null;
}

function resolveTranslatedTextPresentation(resolvedLocale: string | null | undefined): {
  dir?: "rtl";
  lang?: string;
} {
  const normalized = String(resolvedLocale ?? "").toLowerCase();
  if (normalized === "ar" || normalized.startsWith("ar-")) {
    return {
      dir: "rtl",
      lang: "ar",
    };
  }
  return {};
}

function toCommunityPostContent(
  postResponse: ApiPost,
  songOptions?: SongPresentationOptions,
  opts?: {
    preferOriginalText?: boolean;
  },
): PostCardProps["content"] {
  const { post, translated_body, translated_caption, translated_title } = postResponse;
  const resolvedBody = opts?.preferOriginalText ? post.body ?? "" : translated_body ?? post.body ?? "";
  const resolvedCaption = opts?.preferOriginalText
    ? post.caption ?? undefined
    : translated_caption ?? post.caption ?? undefined;
  const translatedTextPresentation = !opts?.preferOriginalText
    && postResponse.translation_state === "ready"
    ? resolveTranslatedTextPresentation(postResponse.resolved_locale)
    : {};
  const primaryMedia = post.media_refs?.[0];
  const imageMedia = primaryMedia as ({ width?: number | null; height?: number | null } & typeof primaryMedia) | undefined;
  const title = opts?.preferOriginalText ? (post.title ?? "Untitled post") : (translated_title ?? post.title ?? "Untitled post");

  switch (post.post_type) {
    case "image": {
      const aspectRatio = typeof imageMedia?.width === "number" &&
        typeof imageMedia?.height === "number" &&
        imageMedia.height > 0
        ? imageMedia.width / imageMedia.height
        : undefined;

      return {
        type: "image",
        aspectRatio,
        alt: title,
        caption: resolvedCaption,
        captionDir: translatedTextPresentation.dir,
        captionLang: translatedTextPresentation.lang,
        src: primaryMedia?.storage_ref ?? "",
      };
    }
    case "video":
      return {
        type: "video",
        accessMode: "public",
        durationMs: primaryMedia?.duration_ms ?? undefined,
        src: primaryMedia?.storage_ref ?? "",
      };
    case "link":
      return {
        type: "link",
        href: post.link_url ?? "#",
        linkCaption: resolvedCaption,
        linkCaptionDir: translatedTextPresentation.dir,
        linkCaptionLang: translatedTextPresentation.lang,
        linkLabel: post.link_url ?? undefined,
        linkTitle: title,
        linkTitleDir: translatedTextPresentation.dir,
        linkTitleLang: translatedTextPresentation.lang,
      };
    case "song":
      {
        const listing = songOptions?.listing;
        const purchase = songOptions?.purchase;
        const playback = songOptions?.playback;
        const playbackDescriptor = toSongPlaybackDescriptor(postResponse, {
          currentUserId: songOptions?.currentUserId,
          purchase,
        });
        const playbackState = playbackDescriptor && playback
          ? playback.getPlaybackState(playbackDescriptor.key)
          : "idle";
        const upstreamAttributions = post.upstream_asset_refs?.map((assetRef, index) => ({
          assetId: assetRef,
          relationshipType: "remix_of" as const,
          title: `Source ${index + 1}`,
        }));

        return {
          type: "song",
          accessMode: post.access_mode ?? "public",
          ageGatePolicy: post.age_gate_policy,
          analysisState: post.analysis_state,
          contentSafetyState: post.content_safety_state,
          hasEntitlement: (post.access_mode ?? "public") === "public"
            || Boolean(purchase)
            || Boolean(songOptions?.currentUserId && post.author_user_id === songOptions.currentUserId),
          listingMode: listing ? "listed" : "not_listed",
          listingStatus: mapListingStatus(listing?.status),
          onBuy: songOptions?.onBuy,
          onPause: playbackDescriptor && playback
            ? () => playback.pauseTrack(playbackDescriptor.key)
            : undefined,
          onPlay: playbackDescriptor && playback
            ? () => void playback.playTrack(playbackDescriptor)
            : undefined,
          playbackState,
          priceLabel: listing ? formatUsdLabel(listing.price_usd) : undefined,
          rightsBasis: post.rights_basis ?? undefined,
          songMode: post.song_mode ?? undefined,
          title,
          upstreamAttributions: upstreamAttributions?.length ? upstreamAttributions : undefined,
        };
      }
    case "text":
    default:
      return {
        type: "text",
        body: resolvedBody,
        bodyDir: translatedTextPresentation.dir,
        bodyLang: translatedTextPresentation.lang,
      };
  }
}

export function toCommunityFeedItem(
  postResponse: ApiPost,
  authorProfiles: Record<string, ApiProfile | undefined>,
  songOptions?: SongPresentationOptions,
): FeedItem {
  const { post } = postResponse;
  const authorProfile = post.author_user_id ? authorProfiles[post.author_user_id] : undefined;
  const authorLabel = resolvePostAuthorLabel(post, authorProfile);

  return {
    id: post.post_id,
    post: {
      byline: {
        author: {
          kind: "user",
          label: authorLabel,
          href: post.identity_mode === "public" && post.author_user_id
            ? authorProfile
              ? buildPublicProfilePathForProfile(authorProfile)
              : undefined
            : undefined,
        },
        timestampLabel: formatRelativeTimestamp(post.created_at),
      },
      content: toCommunityPostContent(postResponse, songOptions),
      engagement: {
        commentCount: 0,
        score: postResponse.upvote_count - postResponse.downvote_count,
        viewerVote: toViewerVote(postResponse.viewer_vote),
      },
      identityPresentation: post.identity_mode === "anonymous" ? "anonymous_primary" : "author_primary",
      postHref: `/p/${post.post_id}`,
      qualifierLabels: resolvePostQualifierLabels(postResponse),
      title: postResponse.translated_title ?? post.title ?? undefined,
      titleDir: postResponse.translation_state === "ready"
        ? resolveTranslatedTextPresentation(postResponse.resolved_locale).dir
        : undefined,
      titleLang: postResponse.translation_state === "ready"
        ? resolveTranslatedTextPresentation(postResponse.resolved_locale).lang
        : undefined,
      titleHref: `/p/${post.post_id}`,
      viewContext: "community",
    },
  };
}

export function toHomeFeedItem(
  entry: HomeFeedEntry,
  authorProfiles: Record<string, ApiProfile | null>,
  songOptions?: SongPresentationOptions,
): FeedItem {
  const { community, post: postResponse } = entry;
  const { post } = postResponse;
  const authorProfile = post.author_user_id ? authorProfiles[post.author_user_id] ?? undefined : undefined;
  const authorLabel = resolvePostAuthorLabel(post, authorProfile);

  return {
    id: post.post_id,
    post: {
      byline: {
        author: {
          kind: "user",
          label: authorLabel,
          href: post.identity_mode === "public" && post.author_user_id
            ? authorProfile
              ? buildPublicProfilePathForProfile(authorProfile)
              : undefined
            : undefined,
        },
        community: {
          kind: "community",
          href: `/c/${community.community_id}`,
          label: formatCommunityLabel(community.route_slug ?? community.display_name),
        },
        timestampLabel: formatRelativeTimestamp(post.created_at),
      },
      content: toCommunityPostContent(postResponse, songOptions),
      engagement: {
        commentCount: postResponse.thread_snapshot?.comment_count ?? 0,
        score: getPostScore(postResponse),
        viewerVote: toViewerVote(postResponse.viewer_vote),
      },
      identityPresentation: post.identity_mode === "anonymous"
        ? "anonymous_primary"
        : "author_with_community",
      postHref: `/p/${post.post_id}`,
      qualifierLabels: resolvePostQualifierLabels(postResponse),
      title: postResponse.translated_title ?? post.title ?? undefined,
      titleDir: postResponse.translation_state === "ready"
        ? resolveTranslatedTextPresentation(postResponse.resolved_locale).dir
        : undefined,
      titleLang: postResponse.translation_state === "ready"
        ? resolveTranslatedTextPresentation(postResponse.resolved_locale).lang
        : undefined,
      titleHref: `/p/${post.post_id}`,
      viewContext: "home",
    },
  };
}

function toThreadPostCard(
  postResponse: ApiPost,
  community: ApiCommunity | null,
  authorProfile?: ApiProfile,
  songOptions?: SongPresentationOptions,
  opts?: {
    preferOriginalText?: boolean;
  },
): PostCardProps {
  const { post } = postResponse;
  const authorLabel = resolvePostAuthorLabel(post, authorProfile);

  return {
    byline: {
      author: {
        kind: "user",
        label: authorLabel,
        href: post.identity_mode === "public" && post.author_user_id
          ? authorProfile
            ? buildPublicProfilePathForProfile(authorProfile)
            : undefined
          : undefined,
      },
      community: community
        ? {
          kind: "community",
          label: `c/${community.display_name}`,
          href: `/c/${community.community_id}`,
        }
        : undefined,
      timestampLabel: formatRelativeTimestamp(post.created_at),
    },
    content: toCommunityPostContent(postResponse, songOptions, opts),
    engagement: {
      commentCount: 0,
      score: postResponse.upvote_count - postResponse.downvote_count,
      viewerVote: toViewerVote(postResponse.viewer_vote),
    },
    identityPresentation: post.identity_mode === "anonymous"
      ? "anonymous_primary"
      : "author_with_community",
    postHref: `/p/${post.post_id}`,
    qualifierLabels: resolvePostQualifierLabels(postResponse),
    title: opts?.preferOriginalText
      ? post.title ?? undefined
      : postResponse.translated_title ?? post.title ?? undefined,
    titleDir: !opts?.preferOriginalText && postResponse.translation_state === "ready"
      ? resolveTranslatedTextPresentation(postResponse.resolved_locale).dir
      : undefined,
    titleLang: !opts?.preferOriginalText && postResponse.translation_state === "ready"
      ? resolveTranslatedTextPresentation(postResponse.resolved_locale).lang
      : undefined,
    titleHref: `/p/${post.post_id}`,
    viewContext: "home",
  };
}

function shouldShowOriginalPost(postResponse: ApiPost): boolean {
  if (postResponse.translation_state !== "ready") {
    return false;
  }

  return (postResponse.translated_body ?? null) !== (postResponse.post.body ?? null)
    || (postResponse.translated_title ?? null) !== (postResponse.post.title ?? null)
    || (postResponse.translated_caption ?? null) !== (postResponse.post.caption ?? null);
}

function collectCommentAuthorUserIds(items: ApiCommentListItem[]): string[] {
  return [...new Set(items
    .map((item) => item.comment.identity_mode === "public" ? item.comment.author_user_id : null)
    .filter((value): value is string => Boolean(value)))];
}

function collectThreadCommentAuthorUserIds(nodes: ThreadCommentNode[]): string[] {
  return [...new Set(nodes.flatMap((node) => [
    ...collectCommentAuthorUserIds([node.item]),
    ...collectThreadCommentAuthorUserIds(node.children),
  ]))];
}

export function createThreadCommentNode(item: ApiCommentListItem): ThreadCommentNode {
  return {
    item,
    children: [],
    hasLoadedReplies: false,
    loadingReplies: false,
    nextRepliesCursor: null,
  };
}

export function mergeThreadCommentNodes(
  previousNodes: ThreadCommentNode[],
  nextNodes: ThreadCommentNode[],
): ThreadCommentNode[] {
  const previousByCommentId = new Map(
    previousNodes.map((node) => [node.item.comment.comment_id, node] as const),
  );

  return nextNodes.map((node) => {
    const previousNode = previousByCommentId.get(node.item.comment.comment_id);
    if (!previousNode) {
      return node;
    }

    return {
      ...node,
      children: mergeThreadCommentNodes(previousNode.children, node.children.length > 0 ? node.children : previousNode.children),
      hasLoadedReplies: previousNode.hasLoadedReplies,
      loadingReplies: previousNode.loadingReplies,
      nextRepliesCursor: previousNode.nextRepliesCursor,
    };
  });
}

async function listAllCommentPages(
  fetchPage: (cursor: string | null) => Promise<{
    items: ApiCommentListItem[];
    next_cursor: string | null;
  }>,
): Promise<ApiCommentListItem[]> {
  const items: ApiCommentListItem[] = [];
  let cursor: string | null = null;

  while (true) {
    const page = await fetchPage(cursor);
    items.push(...page.items);
    if (!page.next_cursor) {
      return items;
    }
    cursor = page.next_cursor;
  }
}

async function loadThreadCommentTree(
  api: ReturnType<typeof useApi>,
  communityId: string,
  postId: string,
  locale: string,
  canMutate = true,
): Promise<ThreadCommentNode[]> {
  const topLevelComments = await listAllCommentPages((cursor) => canMutate
    ? api.communities.listComments(communityId, postId, {
      cursor,
      limit: THREAD_COMMENT_PAGE_LIMIT,
      locale,
      sort: "best",
    })
    : api.publicComments.listPostComments(postId, {
      cursor,
      limit: THREAD_COMMENT_PAGE_LIMIT,
      locale,
      sort: "best",
    }));

  return topLevelComments.map((item) => createThreadCommentNode(item));
}

function updateThreadCommentNode(
  nodes: ThreadCommentNode[],
  commentId: string,
  updater: (node: ThreadCommentNode) => ThreadCommentNode,
): ThreadCommentNode[] {
  return nodes.map((node) => {
    if (node.item.comment.comment_id === commentId) {
      return updater(node);
    }

    if (node.children.length === 0) {
      return node;
    }

    const nextChildren = updateThreadCommentNode(node.children, commentId, updater);
    return nextChildren === node.children ? node : { ...node, children: nextChildren };
  });
}

function findThreadCommentNode(
  nodes: ThreadCommentNode[],
  commentId: string,
): ThreadCommentNode | null {
  for (const node of nodes) {
    if (node.item.comment.comment_id === commentId) {
      return node;
    }
    const child = findThreadCommentNode(node.children, commentId);
    if (child) {
      return child;
    }
  }
  return null;
}

function toThreadComment(
  item: ApiCommentListItem,
  authorProfiles: Record<string, ApiProfile | null>,
  labels: {
    cancelReplyLabel: string;
    loadMoreRepliesLabel: string;
    loadRepliesLabel: string;
    loadingRepliesLabel: string;
    replyActionLabel: string;
    replyPlaceholder: string;
    showOriginalLabel: string;
    submitReplyLabel: string;
    showTranslationLabel: string;
  },
  opts?: {
    loadingReplies?: boolean;
    moreRepliesLabel?: string;
    onLoadMoreReplies?: () => void;
    onReplySubmit?: (body: string) => Promise<void> | void;
    onVote?: (direction: "up" | "down") => void;
  },
  children?: PostThreadComment[],
): PostThreadComment {
  const { comment } = item;
  const authorProfile = comment.author_user_id ? authorProfiles[comment.author_user_id] : null;
  const authorLabel = resolveCommentAuthorLabel(comment, authorProfile);
  const defaultBody = item.translated_body ?? comment.body ?? "";
  const originalBody = item.translation_state === "ready"
    && item.translated_body
    && item.translated_body !== comment.body
    ? comment.body ?? undefined
    : undefined;

  return {
    authorHref: comment.identity_mode === "public" && comment.author_user_id && authorProfile
      ? buildPublicProfilePathForProfile(authorProfile)
      : undefined,
    authorLabel,
    body: defaultBody,
    bodyDir: item.translation_state === "ready"
      ? resolveTranslatedTextPresentation(item.resolved_locale).dir ?? "auto"
      : "auto",
    bodyLang: item.translation_state === "ready"
      ? resolveTranslatedTextPresentation(item.resolved_locale).lang
      : undefined,
    children,
    commentId: comment.comment_id,
    cancelReplyLabel: opts?.onReplySubmit ? labels.cancelReplyLabel : undefined,
    moreRepliesLabel: opts?.moreRepliesLabel,
    onLoadMoreReplies: opts?.onLoadMoreReplies,
    onReplySubmit: opts?.onReplySubmit,
    onVote: opts?.onVote,
    originalBody,
    replyActionLabel: opts?.onReplySubmit ? labels.replyActionLabel : undefined,
    replyPlaceholder: opts?.onReplySubmit ? labels.replyPlaceholder : undefined,
    scoreLabel: String(comment.score),
    submitReplyLabel: opts?.onReplySubmit ? labels.submitReplyLabel : undefined,
    showOriginalLabel: originalBody ? labels.showOriginalLabel : undefined,
    showTranslationLabel: originalBody ? labels.showTranslationLabel : undefined,
    status: comment.status,
    timestampLabel: formatRelativeTimestamp(comment.created_at),
    viewerVote: toCommentViewerVote(item.viewer_vote),
  };
}

function buildThreadMoreRepliesLabel(
  node: ThreadCommentNode,
  labels: {
    loadMoreRepliesLabel: string;
    loadRepliesLabel: string;
    loadingRepliesLabel: string;
  },
): string | undefined {
  if (node.loadingReplies) {
    return labels.loadingRepliesLabel;
  }

  const remainingReplies = Math.max(node.item.comment.direct_reply_count - node.children.length, 0);
  if (remainingReplies <= 0) {
    return undefined;
  }

  if (!node.hasLoadedReplies) {
    return `${labels.loadRepliesLabel} (${remainingReplies})`;
  }

  if (node.nextRepliesCursor) {
    return `${labels.loadMoreRepliesLabel} (${remainingReplies})`;
  }

  return undefined;
}

function mapThreadCommentNode(
  node: ThreadCommentNode,
  authorProfiles: Record<string, ApiProfile | null>,
  labels: {
    cancelReplyLabel: string;
    loadMoreRepliesLabel: string;
    loadRepliesLabel: string;
    loadingRepliesLabel: string;
    replyActionLabel: string;
    replyPlaceholder: string;
    showOriginalLabel: string;
    submitReplyLabel: string;
    showTranslationLabel: string;
  },
  onLoadReplies: (commentId: string) => void,
  onReplySubmit?: (commentId: string, body: string) => Promise<void>,
  onVote?: (commentId: string, direction: "up" | "down") => void,
): PostThreadComment {
  return toThreadComment(
    node.item,
    authorProfiles,
    labels,
    {
      loadingReplies: node.loadingReplies,
      moreRepliesLabel: buildThreadMoreRepliesLabel(node, labels),
      onLoadMoreReplies: node.item.comment.direct_reply_count > 0
        ? () => onLoadReplies(node.item.comment.comment_id)
        : undefined,
      onReplySubmit: onReplySubmit
        ? async (body) => await onReplySubmit(node.item.comment.comment_id, body)
        : undefined,
      onVote: onVote
        ? (direction) => onVote(node.item.comment.comment_id, direction)
        : undefined,
    },
    node.children.map((child) => mapThreadCommentNode(
      child,
      authorProfiles,
      labels,
      onLoadReplies,
      onReplySubmit,
      onVote,
    )),
  );
}

function buildCommunitySidebar(community: ApiCommunity) {
  const charityHref = community.donation_partner?.provider_partner_ref
    ? `https://app.endaoment.org/orgs/${community.donation_partner.provider_partner_ref}`
    : undefined;

  return {
    avatarSrc: community.avatar_ref ?? undefined,
    charity: community.donation_policy_mode !== "none" && community.donation_partner
      ? {
        avatarSrc: community.donation_partner.image_url ?? undefined,
        href: charityHref,
        name: community.donation_partner.display_name,
      }
      : null,
    createdAt: community.created_at,
    description: community.description ?? "",
    displayName: community.display_name,
    memberCount: community.member_count ?? undefined,
    membershipMode: community.membership_mode,
    referenceLinks: community.reference_links?.map((link) => ({
      communityReferenceLinkId: link.community_reference_link_id,
      label: link.label ?? null,
      linkStatus: link.link_status,
      metadata: {
        displayName: link.metadata.display_name ?? null,
        imageUrl: link.metadata.image_url ?? null,
      },
      platform: link.platform,
      position: link.position,
      url: link.url,
      verified: link.verified,
    })),
    rules: getCommunitySidebarRules(community),
  };
}

const DEFAULT_COMMUNITY_RULES = [
  {
    title: "Respect others and be civil",
    body: "No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness.",
  },
  {
    title: "No spam",
    body: "Excessive promotion, spam, or advertising of any kind is not allowed.",
  },
] as const;

function getCommunitySidebarRules(community: ApiCommunity | null): CommunitySidebarRule[] {
  return community?.community_profile?.rules?.map((rule) => ({
    body: rule.body,
    position: rule.position,
    ruleId: rule.rule_id,
    status: rule.status,
    title: rule.title,
  })) ?? [];
}

function getCommunityActionLabel(status: ApiJoinEligibility["status"]): string {
  if (status === "requestable") return "Request to Join";
  if (status === "verification_required") return "Verify to Join";
  if (status === "already_joined") return "Joined";
  if (status === "banned") return "Unavailable";
  if (status === "gate_failed") return "Not eligible";
  return "Join";
}

function getNamespaceActionLabel(community: ApiCommunity): string | null {
  if (community.namespace_verification_id) {
    return null;
  }

  return community.pending_namespace_verification_session_id
    ? "Resume verification"
    : "Verify namespace";
}

function buildCommunityModerationPath(
  communityId: string,
  section: "rules" | "links" | "donations" | "gates" | "safety" | "namespace",
): string {
  return `/c/${encodeURIComponent(communityId)}/mod/${section}`;
}

const PENDING_SELF_JOIN_SESSION_STORAGE_KEY_PREFIX = "pirate_pending_self_join_session:";

type PendingSelfJoinSession = {
  communityId: string;
  requestedCapabilities: ApiJoinEligibility["missing_capabilities"];
  verificationSessionId: string;
};

function getPendingSelfJoinSessionStorageKey(communityId: string): string {
  return `${PENDING_SELF_JOIN_SESSION_STORAGE_KEY_PREFIX}${communityId}`;
}

function readPendingSelfJoinSession(communityId: string): PendingSelfJoinSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(getPendingSelfJoinSessionStorageKey(communityId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PendingSelfJoinSession>;
    if (
      typeof parsed?.communityId !== "string"
      || typeof parsed?.verificationSessionId !== "string"
      || !Array.isArray(parsed?.requestedCapabilities)
    ) {
      return null;
    }

    return {
      communityId: parsed.communityId,
      requestedCapabilities: parsed.requestedCapabilities
        .filter((capability): capability is ApiJoinEligibility["missing_capabilities"][number] =>
          capability === "unique_human"
          || capability === "age_over_18"
          || capability === "nationality"
          || capability === "gender"),
      verificationSessionId: parsed.verificationSessionId,
    };
  } catch {
    return null;
  }
}

function writePendingSelfJoinSession(value: PendingSelfJoinSession): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    getPendingSelfJoinSessionStorageKey(value.communityId),
    JSON.stringify(value),
  );
}

function clearPendingSelfJoinSession(communityId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(getPendingSelfJoinSessionStorageKey(communityId));
}

function buildCommunityModerationSections(
  activeSection: "rules" | "links" | "donations" | "gates" | "safety" | "namespace",
  communityId: string,
) {
  return [{
    label: "Moderation",
    items: [
      {
        active: activeSection === "rules",
        icon: Gavel,
        label: "Rules",
        onSelect: () => navigate(buildCommunityModerationPath(communityId, "rules")),
      },
      {
        active: activeSection === "links",
        icon: LinkSimple,
        label: "Links",
        onSelect: () => navigate(buildCommunityModerationPath(communityId, "links")),
      },
      {
        active: activeSection === "donations",
        icon: Heart,
        label: "Donations",
        onSelect: () => navigate(buildCommunityModerationPath(communityId, "donations")),
      },
      {
        active: activeSection === "gates",
        icon: Lock,
        label: "Gates",
        onSelect: () => navigate(buildCommunityModerationPath(communityId, "gates")),
      },
      {
        active: activeSection === "safety",
        icon: Shield,
        label: "Safety",
        onSelect: () => navigate(buildCommunityModerationPath(communityId, "safety")),
      },
      {
        active: activeSection === "namespace",
        icon: SealCheck,
        label: "Namespace verification",
        onSelect: () => navigate(buildCommunityModerationPath(communityId, "namespace")),
      },
    ],
  }];
}

function getCommunityAdultContentPolicyState(community: ApiCommunity) {
  const defaults = createDefaultCommunitySafetyAdultContentPolicy();

  return {
    artistic_nudity: community.adult_content_policy?.artistic_nudity ?? defaults.artistic_nudity,
    explicit_nudity: community.adult_content_policy?.explicit_nudity ?? defaults.explicit_nudity,
    explicit_sexual_content:
      community.adult_content_policy?.explicit_sexual_content ?? defaults.explicit_sexual_content,
    fetish_content: community.adult_content_policy?.fetish_content ?? defaults.fetish_content,
    suggestive: community.adult_content_policy?.suggestive ?? defaults.suggestive,
  };
}

function getCommunityGraphicContentPolicyState(community: ApiCommunity) {
  const defaults = createDefaultCommunitySafetyGraphicContentPolicy();

  return {
    animal_harm: community.graphic_content_policy?.animal_harm ?? defaults.animal_harm,
    body_horror_disturbing:
      community.graphic_content_policy?.body_horror_disturbing ?? defaults.body_horror_disturbing,
    extreme_gore: community.graphic_content_policy?.extreme_gore ?? defaults.extreme_gore,
    gore: community.graphic_content_policy?.gore ?? defaults.gore,
    injury_medical: community.graphic_content_policy?.injury_medical ?? defaults.injury_medical,
  };
}

function getCommunityCivilityPolicyState(community: ApiCommunity) {
  const defaults = createDefaultCommunitySafetyCivilityPolicy();

  return {
    group_directed_demeaning_language:
      community.civility_policy?.group_directed_demeaning_language
      ?? defaults.group_directed_demeaning_language,
    targeted_harassment:
      community.civility_policy?.targeted_harassment ?? defaults.targeted_harassment,
    targeted_insults: community.civility_policy?.targeted_insults ?? defaults.targeted_insults,
    threatening_language:
      community.civility_policy?.threatening_language ?? defaults.threatening_language,
  };
}

function getCommunityOpenAIModerationSettingsState(community: ApiCommunity) {
  const defaults = createDefaultCommunitySafetyProviderSettings();

  return {
    scanCaptions: community.openai_moderation_settings?.scan_captions ?? defaults.scanCaptions,
    scanImages: community.openai_moderation_settings?.scan_images ?? defaults.scanImages,
    scanLinkPreviewText:
      community.openai_moderation_settings?.scan_link_preview_text ?? defaults.scanLinkPreviewText,
    scanPostBodies: community.openai_moderation_settings?.scan_post_bodies ?? defaults.scanPostBodies,
    scanTitles: community.openai_moderation_settings?.scan_titles ?? defaults.scanTitles,
  };
}

function useCommunityPageData(communityId: string, contentLocale: string, activeSort: FeedSort) {
  const api = useApi();
  const session = useSession();
  const [community, setCommunity] = React.useState<ApiCommunity | null>(null);
  const [preview, setPreview] = React.useState<ApiCommunityPreview | null>(null);
  const [eligibility, setEligibility] = React.useState<ApiJoinEligibility | null>(null);
  const [posts, setPosts] = React.useState<ApiPost[]>([]);
  const [authorProfiles, setAuthorProfiles] = React.useState<Record<string, ApiProfile | undefined>>({});
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([
      api.communities.get(communityId),
      api.communities.preview(communityId),
      api.communities.getJoinEligibility(communityId),
      api.communities.listPosts(communityId, { locale: contentLocale, sort: activeSort }),
    ])
      .then(async ([communityResult, previewResult, eligibilityResult, postResponse]) => {
        const uniqueAuthorIds = Array.from(
          new Set(
            postResponse.items
              .map((item) => item.post.identity_mode === "public" ? item.post.author_user_id : null)
              .filter((userId): userId is string => typeof userId === "string" && userId.length > 0),
          ),
        );
        const profileFallbacks = session?.profile
          ? { [session.user.user_id]: session.profile }
          : {};

        const profileEntries = await Promise.all(
          uniqueAuthorIds.map(async (userId) => {
            try {
              return [userId, profileFallbacks[userId] ?? await api.profiles.getByUserId(userId)] as const;
            } catch {
              return [userId, undefined] as const;
            }
          }),
        );

        if (cancelled) return;
        setCommunity(communityResult);
        setPreview(previewResult);
        setEligibility(eligibilityResult);
        setPosts(postResponse.items);
        setAuthorProfiles(Object.fromEntries(profileEntries));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeSort, api, communityId, contentLocale, session]);

  React.useEffect(() => {
    if (!community) return;

    rememberKnownCommunity({
      avatarSrc: community.avatar_ref ?? undefined,
      communityId: community.community_id,
      displayName: community.display_name,
    });
  }, [community]);

  const refetchEligibility = React.useCallback(async () => {
    const e = await api.communities.getJoinEligibility(communityId);
    setEligibility(e);
    return e;
  }, [api, communityId]);

  const replaceCommunity = React.useCallback((nextCommunity: ApiCommunity) => {
    setCommunity(nextCommunity);
  }, []);

  return {
    authorProfiles,
    community,
    preview,
    eligibility,
    error,
    loading,
    posts,
    replaceCommunity,
    refetchEligibility,
  };
}

function CommunityPage({ communityId }: { communityId: string }) {
  const api = useApi();
  const session = useSession();
  const { locale: uiLocale } = useUiLocale();
  const preferredUiLocale: UiLocaleCode = session?.profile.preferred_locale
    && isUiLocaleCode(session.profile.preferred_locale)
    ? session.profile.preferred_locale
    : uiLocale;
  const contentLocale = React.useMemo(() => resolveViewerContentLocale({
    uiLocale: preferredUiLocale,
    browserLocales: typeof navigator === "undefined"
      ? []
      : [...navigator.languages, navigator.language].filter(Boolean),
  }), [preferredUiLocale]);
  const [activeSort, setActiveSort] = React.useState<FeedSort>("best");
  const {
    authorProfiles,
    community,
    preview,
    eligibility,
    error,
    loading,
    posts,
    refetchEligibility,
  } = useCommunityPageData(communityId, contentLocale, activeSort);
  const commerceEnabled = Boolean(session?.user?.user_id) && eligibility?.status === "already_joined";
  const {
    listingsByAssetId,
    purchasesByAssetId,
    refresh: refreshSongCommerce,
  } = useSongCommerceState(communityId, commerceEnabled);
  const songPlayback = useSongPlayback(session?.accessToken ?? null);
  const [joinLoading, setJoinLoading] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [joinRequested, setJoinRequested] = React.useState(false);
  const [selfSession, setSelfSession] = React.useState<VerificationSession | null>(null);
  const [selfRequestedCapabilities, setSelfRequestedCapabilities] = React.useState<ApiJoinEligibility["missing_capabilities"]>([]);
  const [selfLoading, setSelfLoading] = React.useState(false);
  const [selfError, setSelfError] = React.useState<string | null>(null);
  const ownsCommunity = session?.user?.user_id === community?.created_by_user_id;

  const handleBuySong = React.useCallback(async (listing: ApiCommunityListing, titleText: string) => {
    const settlementWalletAttachmentId = session?.user.primary_wallet_attachment_id;
    if (!settlementWalletAttachmentId) {
      toast.error("Connect a primary wallet before buying this song.");
      return;
    }

    let quoteId: string | null = null;
    try {
      const quote = await api.communities.createPurchaseQuote(communityId, {
        listing_id: listing.listing_id,
        client_estimated_hop_count: 0,
        client_estimated_slippage_bps: 0,
      });
      quoteId = quote.quote_id;

      const settlement = await api.communities.settlePurchase(communityId, {
        quote_id: quote.quote_id,
        settlement_wallet_attachment_id: settlementWalletAttachmentId,
        settlement_tx_ref: `ui:${crypto.randomUUID()}`,
      });
      await refreshSongCommerce();
      toast.success(
        `${titleText} unlocked for ${formatUsdLabel(settlement.purchase_price_usd) ?? "the quoted price"}.`,
      );
    } catch (error) {
      if (quoteId) {
        void api.communities.failPurchase(communityId, { quote_id: quoteId }).catch(() => undefined);
      }
      toast.error(getErrorMessage(error, "Could not unlock this song."));
    }
  }, [api.communities, communityId, refreshSongCommerce, session?.user.primary_wallet_attachment_id]);

  const startSelfVerification = React.useCallback(async () => {
    const requestedCapabilities = eligibility
      ? getSelfVerificationCapabilities(eligibility)
      : [];

    if (requestedCapabilities.length === 0) {
      setSelfError("This community is missing the Self verification details needed to continue.");
      return;
    }

    setSelfLoading(true);
    setSelfError(null);
    setJoinError(null);
    try {
      const result = await api.verification.startSession({
        provider: "self",
        requested_capabilities: requestedCapabilities,
        verification_intent: "community_join",
      });
      setSelfRequestedCapabilities(requestedCapabilities);
      setSelfSession(result);
      writePendingSelfJoinSession({
        communityId,
        requestedCapabilities,
        verificationSessionId: result.verification_session_id,
      });
    } catch (e: unknown) {
      const apiError = e as ApiError;
      setSelfError(apiError?.message ?? "Could not start self verification");
    } finally {
      setSelfLoading(false);
    }
  }, [api, communityId, eligibility]);

  const completeSelfAndRetryJoin = React.useCallback(async ({
    proof,
    verificationSessionId,
  }: {
    proof: string;
    verificationSessionId: string;
  }) => {
    setSelfLoading(true);
    setSelfError(null);
    try {
      await api.verification.completeSession(verificationSessionId, { proof });
      setSelfSession(null);
      setSelfRequestedCapabilities([]);
      clearPendingSelfJoinSession(communityId);
      const updatedEligibility = await refetchEligibility();

      if (updatedEligibility.status === "joinable") {
        const joinResult = await api.communities.join(communityId);
        if (joinResult.status === "joined") {
          await refetchEligibility();
        }
      } else if (updatedEligibility.status === "requestable") {
        const joinResult = await api.communities.join(communityId);
        if (joinResult.status === "requested") {
          setJoinRequested(true);
          await refetchEligibility();
        }
      } else if (updatedEligibility.status === "gate_failed") {
        setJoinError("Verification succeeded but you still do not meet this community's requirements.");
      }
    } catch (e: unknown) {
      const apiError = e as ApiError;
      setSelfError(apiError?.message ?? "Verification completion failed");
    } finally {
      setSelfLoading(false);
    }
  }, [api, communityId, refetchEligibility]);

  const handleJoin = React.useCallback(async () => {
    setJoinLoading(true);
    setJoinError(null);

    if (eligibility?.status === "verification_required") {
      setJoinLoading(false);
      await startSelfVerification();
      return;
    }

    try {
      const result = await api.communities.join(communityId);

      if (result.status === "joined") {
        await refetchEligibility();
      } else if (result.status === "requested") {
        setJoinRequested(true);
        await refetchEligibility();
      }
    } catch (e: unknown) {
      const apiError = e as ApiError;
      if (apiError?.code === "gate_failed" && apiError.details) {
        const details = apiError.details as ApiGateFailureDetails;
        if (details.failure_reason === "missing_verification") {
          setJoinLoading(false);
          await startSelfVerification();
          return;
        }

        const gateFailureMessage = getGateFailureMessage(details);
        if (gateFailureMessage) {
          setJoinError(gateFailureMessage);
        } else {
          toast.error(apiError.message);
        }
      } else {
        toast.error(apiError?.message ?? "Join failed");
      }
    } finally {
      setJoinLoading(false);
    }
  }, [api, communityId, eligibility, refetchEligibility, startSelfVerification]);

  React.useEffect(() => {
    function handleSelfCallback() {
      const url = new URL(window.location.href);
      if (
        !url.searchParams.has("proof")
        && !url.searchParams.has("error")
        && url.searchParams.get("expired") !== "true"
      ) {
        return;
      }

      const pendingSession = readPendingSelfJoinSession(communityId);
      if (!pendingSession || pendingSession.communityId !== communityId) {
        setSelfError("Verification session was lost. Start the ID check again.");
        setSelfSession(null);
        setSelfRequestedCapabilities([]);
        clearPendingSelfJoinSession(communityId);
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      setSelfRequestedCapabilities(pendingSession.requestedCapabilities);

      const result = parseSelfCallback(url);
      if (result.status === "completed") {
        void completeSelfAndRetryJoin({
          proof: result.proof,
          verificationSessionId: pendingSession.verificationSessionId,
        });
      } else if (result.status === "expired") {
        setSelfError("Verification session expired. Please try again.");
        setSelfSession(null);
        setSelfRequestedCapabilities([]);
        clearPendingSelfJoinSession(communityId);
      } else {
        setSelfError(result.reason);
        setSelfSession(null);
        setSelfRequestedCapabilities([]);
        clearPendingSelfJoinSession(communityId);
      }

      window.history.replaceState({}, "", window.location.pathname);
    }

    window.addEventListener("popstate", handleSelfCallback);
    handleSelfCallback();

    return () => window.removeEventListener("popstate", handleSelfCallback);
  }, [communityId, completeSelfAndRetryJoin]);

  if (loading) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center py-20">
        <Spinner className="size-6" />
      </section>
    );
  }

  if (error) {
    if (isApiAuthError(error)) {
      return (
        <AuthRequiredRouteState
          description="Reconnect to load this community again."
          title="Community"
        />
      );
    }

    if (isApiNotFoundError(error)) {
      return <NotFoundPage path={`/c/${communityId}`} />;
    }

    return (
      <RouteLoadFailureState
        description={getErrorMessage(error, "The community could not be loaded right now.")}
        title="Community"
      />
    );
  }

  if (!preview || !community) {
    return (
      <RouteLoadFailureState
        description="The community response was incomplete. Try loading it again."
        title="Community"
      />
    );
  }

  const selfLaunch = selfSession?.launch?.self_app;
  const selfDeeplinkUrl = selfLaunch
    ? `${selfLaunch.endpoint}?session_id=${encodeURIComponent(selfLaunch.session_id)}&scope=${encodeURIComponent(selfLaunch.scope)}`
    : null;
  const selfPrompt = selfSession
    ? {
      ...getVerificationPromptCopy("self", selfRequestedCapabilities),
      href: selfDeeplinkUrl,
    }
    : null;
  const canCreatePost = eligibility?.status === "already_joined";
  const feedItems = posts.map((post) => {
    const assetId = post.post.asset_id ?? undefined;
    const listing = assetId ? listingsByAssetId[assetId] : undefined;
    const purchase = assetId ? purchasesByAssetId[assetId] : undefined;
    return toCommunityFeedItem(post, authorProfiles, post.post.post_type === "song"
      ? {
        currentUserId: session?.user?.user_id,
        listing,
        onBuy: listing
          ? () => void handleBuySong(listing, post.post.title ?? "song")
          : undefined,
        playback: songPlayback,
        purchase,
      }
      : undefined);
  });
  const namespaceActionLabel = ownsCommunity && !community.namespace_verification_id
    ? getNamespaceActionLabel(community)
    : null;
  const modToolsAction = ownsCommunity && community.namespace_verification_id ? (
    <Button onClick={() => navigate(buildCommunityModerationPath(communityId, "rules"))} variant="secondary">
      Mod Tools
    </Button>
  ) : null;
  const primaryHeaderAction = canCreatePost ? (
    <Button
      leadingIcon={<Plus className="size-5" />}
      onClick={() => navigate(`/c/${communityId}/submit`)}
    >
      Create Post
    </Button>
  ) : eligibility && preview.membership_gate_summaries.length === 0 ? (
    <Button
      disabled={eligibility.status !== "joinable" && eligibility.status !== "requestable" && eligibility.status !== "verification_required"}
      loading={joinLoading}
      onClick={handleJoin}
    >
      {getCommunityActionLabel(eligibility.status)}
    </Button>
  ) : null;
  const headerAction = namespaceActionLabel || modToolsAction || primaryHeaderAction ? (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {namespaceActionLabel ? (
        <Button onClick={() => navigate(buildCommunityModerationPath(communityId, "namespace"))} variant="secondary">
          {namespaceActionLabel}
        </Button>
      ) : null}
      {modToolsAction}
      {primaryHeaderAction}
    </div>
  ) : null;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      {preview.membership_gate_summaries.length > 0 ? (
        <CommunityMembershipGatePanel
          eligibility={eligibility}
          gates={preview.membership_gate_summaries}
          joinError={joinError}
          joinLoading={joinLoading}
          joinRequested={joinRequested}
          verificationError={selfError}
          verificationLoading={selfLoading}
          verificationPrompt={selfPrompt}
          onCancelVerification={() => {
            setSelfSession(null);
            setSelfRequestedCapabilities([]);
            setSelfError(null);
            clearPendingSelfJoinSession(communityId);
          }}
          onJoin={handleJoin}
        />
      ) : null}
      <CommunityPageShell
        activeSort={activeSort}
        avatarSrc={community.avatar_ref ?? undefined}
        availableSorts={COMMUNITY_SORT_OPTIONS}
        bannerSrc={community.banner_ref ?? undefined}
        communityId={community.community_id}
        headerAction={headerAction}
        items={feedItems}
        onSortChange={setActiveSort}
        routeLabel={community.route_slug ? `c/${community.route_slug}` : `c/${community.community_id}`}
        routeVerified={Boolean(community.namespace_verification_id)}
        sidebar={{
          ...buildCommunitySidebar(community),
          rulesAction: ownsCommunity ? (
            <Button onClick={() => navigate(buildCommunityModerationPath(communityId, "rules"))} variant="ghost">
              Edit
            </Button>
          ) : undefined,
          namespacePanel: ownsCommunity
            ? {
                routeLabel: community.route_slug ? `c/${community.route_slug}` : `c/${community.community_id}`,
                status: community.namespace_verification_id
                  ? "verified"
                  : community.pending_namespace_verification_session_id
                    ? "pending"
                    : "available",
                onOpen: community.namespace_verification_id ? undefined : () => navigate(buildCommunityModerationPath(communityId, "namespace")),
              }
            : null,
        }}
        title={community.display_name}
      />
    </section>
  );
}

function useCommunityRecord(communityId: string) {
  const api = useApi();
  const [community, setCommunity] = React.useState<ApiCommunity | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void api.communities.get(communityId)
      .then((result) => {
        if (cancelled) return;
        setCommunity(result);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setError(nextError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, communityId]);

  return { community, error, loading, setCommunity };
}

function CommunityModerationGuard({
  community,
  error,
  loading,
  session,
  title,
}: {
  community: ApiCommunity | null;
  error: unknown;
  loading: boolean;
  session: ReturnType<typeof useSession>;
  title: string;
}) {
  if (loading) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center py-20">
        <Spinner className="size-6" />
      </section>
    );
  }

  if (error) {
    if (isApiAuthError(error)) {
      return (
        <AuthRequiredRouteState
          description="Reconnect to open mod tools."
          title={title}
        />
      );
    }

    if (isApiNotFoundError(error)) {
      return <NotFoundPage path={window.location.pathname} />;
    }

    return (
      <RouteLoadFailureState
        description={getErrorMessage(error, "This moderation page could not be loaded right now.")}
        title={title}
      />
    );
  }

  if (!community) {
    return (
      <RouteLoadFailureState
        description="The community response was incomplete."
        title={title}
      />
    );
  }

  if (session?.user?.user_id !== community.created_by_user_id) {
    return (
      <StackPageShell title={title}>
        <StatusCard
          description="Only community moderators can open this page."
          title="Moderator access required"
          tone="warning"
        />
      </StackPageShell>
    );
  }

  return null;
}

type CommunityModerationSection = "rules" | "links" | "donations" | "gates" | "safety" | "namespace";
export type ThreadCommentNode = {
  item: ApiCommentListItem;
  children: ThreadCommentNode[];
  hasLoadedReplies: boolean;
  loadingReplies: boolean;
  nextRepliesCursor: string | null;
};

const THREAD_COMMENT_PAGE_LIMIT = "100";

function getCommunityLinkDrafts(community: ApiCommunity): CommunityLinkEditorItem[] {
  return (community.reference_links ?? []).map((link) => ({
    id: link.community_reference_link_id,
    label: link.label ?? link.metadata.display_name ?? "",
    platform: link.platform,
    url: link.url,
    verified: link.verified,
  }));
}

function getCommunityDonationPartnerPreview(community: ApiCommunity): DonationPartnerPreview | null {
  if (!community.donation_partner || !community.donation_partner_id) {
    return null;
  }

  return {
    donationPartnerId: community.donation_partner_id,
    displayName: community.donation_partner.display_name,
    imageUrl: community.donation_partner.image_url ?? null,
    provider: "Endaoment",
    providerPartnerRef: community.donation_partner.provider_partner_ref ?? null,
  };
}

function buildEndaomentOrgUrl(providerPartnerRef: string | null | undefined): string {
  if (!providerPartnerRef?.trim()) {
    return "";
  }

  return `https://app.endaoment.org/orgs/${providerPartnerRef.trim()}`;
}

function extractRequiredValue(
  config: unknown,
): string | null {
  if (!config || typeof config !== "object") {
    return null;
  }

  const value = (config as Record<string, unknown>).required_value;
  return typeof value === "string" ? value : null;
}

function getCommunityGateDrafts(community: ApiCommunity): IdentityGateDraft[] {
  const drafts: IdentityGateDraft[] = [];

  for (const rule of community.gate_rules ?? []) {
    if (rule.scope !== "membership" || rule.gate_family !== "identity_proof" || rule.status !== "active") {
      continue;
    }

    const requiredValue = extractRequiredValue(rule.proof_requirements?.[0]?.config ?? rule.gate_config);

    if (rule.gate_type === "nationality" && requiredValue && /^[A-Z]{2}$/.test(requiredValue)) {
      drafts.push({
        gateType: "nationality" as const,
        provider: "self" as const,
        requiredValue,
        gateRuleId: rule.gate_rule_id,
      });
      continue;
    }

    if (rule.gate_type === "gender" && (requiredValue === "M" || requiredValue === "F")) {
      drafts.push({
        gateType: "gender" as const,
        provider: "self" as const,
        requiredValue,
        gateRuleId: rule.gate_rule_id,
      });
    }
  }

  return drafts;
}

function CommunityModerationPage({
  communityId,
  section,
}: {
  communityId: string;
  section: CommunityModerationSection;
}) {
  const api = useApi();
  const session = useSession();
  const { community, error, loading, setCommunity } = useCommunityRecord(communityId);
  const [ruleName, setRuleName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [reportReason, setReportReason] = React.useState("");
  const [links, setLinks] = React.useState<CommunityLinkEditorItem[]>([]);
  const [donationMode, setDonationMode] = React.useState<DonationPolicyMode>("none");
  const [endaomentUrl, setEndaomentUrl] = React.useState("");
  const [partnerPreview, setPartnerPreview] = React.useState<DonationPartnerPreview | null>(null);
  const [resolveError, setResolveError] = React.useState<string | null>(null);
  const [resolvingDonationPartner, setResolvingDonationPartner] = React.useState(false);
  const [savingRules, setSavingRules] = React.useState(false);
  const [savingLinks, setSavingLinks] = React.useState(false);
  const [savingDonations, setSavingDonations] = React.useState(false);
  const [membershipMode, setMembershipMode] = React.useState<"open" | "request" | "gated">("open");
  const [defaultAgeGatePolicy, setDefaultAgeGatePolicy] = React.useState<"none" | "18_plus">("none");
  const [allowAnonymousIdentity, setAllowAnonymousIdentity] = React.useState(true);
  const [anonymousIdentityScope, setAnonymousIdentityScope] =
    React.useState<"community_stable" | "thread_stable" | "post_ephemeral">("community_stable");
  const [gateDrafts, setGateDrafts] = React.useState<IdentityGateDraft[]>([]);
  const [activeNamespaceSessionId, setActiveNamespaceSessionId] = React.useState<string | null>(null);
  const [providerSettings, setProviderSettings] = React.useState(
    createDefaultCommunitySafetyProviderSettings(),
  );
  const [adultContentPolicy, setAdultContentPolicy] = React.useState(
    createDefaultCommunitySafetyAdultContentPolicy(),
  );
  const [graphicContentPolicy, setGraphicContentPolicy] = React.useState(
    createDefaultCommunitySafetyGraphicContentPolicy(),
  );
  const [civilityPolicy, setCivilityPolicy] = React.useState(
    createDefaultCommunitySafetyCivilityPolicy(),
  );
  const [savingSafety, setSavingSafety] = React.useState(false);
  const [savingGates, setSavingGates] = React.useState(false);

  React.useEffect(() => {
    if (!community) return;

    rememberKnownCommunity({
      avatarSrc: community.avatar_ref ?? undefined,
      communityId: community.community_id,
      displayName: community.display_name,
    });
  }, [community]);

  React.useEffect(() => {
    const firstRule = community?.community_profile?.rules?.[0];
    setRuleName(firstRule?.title ?? "");
    setDescription(firstRule?.body ?? "");
    setReportReason(firstRule?.report_reason?.trim() || (firstRule?.title ?? ""));
  }, [community]);

  React.useEffect(() => {
    if (!community) return;
    setLinks(getCommunityLinkDrafts(community));
    setDonationMode(community.donation_policy_mode ?? "none");
    setEndaomentUrl(buildEndaomentOrgUrl(community.donation_partner?.provider_partner_ref));
    setPartnerPreview(getCommunityDonationPartnerPreview(community));
    setResolveError(null);
    setMembershipMode(community.membership_mode);
    setDefaultAgeGatePolicy(community.default_age_gate_policy ?? "none");
    setAllowAnonymousIdentity(community.allow_anonymous_identity);
    setAnonymousIdentityScope(community.anonymous_identity_scope ?? "community_stable");
    setGateDrafts(getCommunityGateDrafts(community));
    setProviderSettings(getCommunityOpenAIModerationSettingsState(community));
    setAdultContentPolicy(getCommunityAdultContentPolicyState(community));
    setGraphicContentPolicy(getCommunityGraphicContentPolicyState(community));
    setCivilityPolicy(getCommunityCivilityPolicyState(community));
  }, [community]);

  React.useEffect(() => {
    setActiveNamespaceSessionId(community?.pending_namespace_verification_session_id ?? null);
  }, [community?.pending_namespace_verification_session_id]);

  const effectiveNamespaceSessionId =
    activeNamespaceSessionId ?? community?.pending_namespace_verification_session_id ?? null;

  const title = section === "rules"
    ? "Rules"
    : section === "links"
      ? "Links"
      : section === "donations"
        ? "Donations"
        : section === "gates"
        ? "Gates"
        : section === "safety"
          ? "Safety"
          : "Namespace verification";

  const blocked = CommunityModerationGuard({
    community,
    error,
    loading,
    session,
    title,
  });

  const namespaceVerificationCallbacks = React.useMemo<NamespaceVerificationCallbacks>(() => ({
    onStartSession: async ({ family, rootLabel }) => {
      console.info("[community-namespace] starting session", {
        communityId,
        family,
        rootLabel,
      });
      const result = await api.verification.startNamespaceSession({
        family,
        root_label: rootLabel,
      });

      setActiveNamespaceSessionId(result.namespace_verification_session_id);

      if (communityId) {
        try {
          const updatedCommunity = await api.communities.setPendingNamespaceSession(
            communityId,
            result.namespace_verification_session_id,
          );
          setCommunity(updatedCommunity);
          console.info("[community-namespace] persisted pending session", {
            communityId,
            namespaceVerificationSessionId: result.namespace_verification_session_id,
          });
        } catch (error) {
          console.error("[community-namespace] failed to persist pending session", {
            communityId,
            namespaceVerificationSessionId: result.namespace_verification_session_id,
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      }

      return toNamespaceSessionResult(result);
    },
    onCompleteSession: async ({
      namespaceVerificationSessionId,
      restartChallenge,
      signaturePayload,
    }) => {
      const result = await api.verification.completeNamespaceSession(
        namespaceVerificationSessionId,
        {
          restart_challenge: restartChallenge ?? null,
          signature_payload: signaturePayload ?? null,
        },
      );

      if (result.status === "verified" && result.namespace_verification_id) {
        const updatedCommunity = await api.communities.attachNamespace(
          communityId,
          result.namespace_verification_id,
        );
        setCommunity(updatedCommunity);
        setActiveNamespaceSessionId(null);
      }

      return {
        status: result.status,
        namespaceVerificationId: result.namespace_verification_id ?? null,
        failureReason: result.failure_reason ?? null,
      };
    },
    onGetSession: async ({ namespaceVerificationSessionId }) => {
      console.info("[community-namespace] restoring session", {
        communityId,
        namespaceVerificationSessionId,
      });
      const result = await api.verification.getNamespaceSession(namespaceVerificationSessionId);
      return toNamespaceSessionResult(result);
    },
  }), [api, communityId, setCommunity]);

  const handleSaveRules = React.useCallback(() => {
    if (!community || savingRules) {
      return;
    }

    const existingRules = community.community_profile?.rules ?? [];
    const nextRules = [
      {
        rule_id: existingRules[0]?.rule_id ?? null,
        title: ruleName,
        body: description,
        report_reason: reportReason.trim() || ruleName.trim(),
        position: 0,
        status: "active" as const,
      },
      ...existingRules.slice(1).map((rule, index) => ({
        rule_id: rule.rule_id,
        title: rule.title,
        body: rule.body,
        report_reason: rule.report_reason?.trim() || rule.title,
        position: index + 1,
        status: rule.status,
      })),
    ];

    setSavingRules(true);
    void api.communities.updateRules(community.community_id, { rules: nextRules })
      .then((updatedCommunity) => {
        setCommunity(updatedCommunity);
        toast.success("Rules saved.");
      })
      .catch((nextError: unknown) => {
        console.warn("[community-rules] failed to save rules", nextError);
        toast.error(getErrorMessage(nextError, "Could not save rules."));
      })
      .finally(() => {
        setSavingRules(false);
      });
  }, [
    api.communities,
    community,
    description,
    ruleName,
    savingRules,
    setCommunity,
  ]);

  const handleSaveSafety = React.useCallback(() => {
    if (!community || savingSafety) {
      return;
    }

    setSavingSafety(true);
    void api.communities.updateSafety(community.community_id, {
      adult_content_policy: {
        suggestive: adultContentPolicy.suggestive,
        artistic_nudity: adultContentPolicy.artistic_nudity,
        explicit_nudity: adultContentPolicy.explicit_nudity,
        explicit_sexual_content: adultContentPolicy.explicit_sexual_content,
        fetish_content: adultContentPolicy.fetish_content,
      },
      graphic_content_policy: {
        injury_medical: graphicContentPolicy.injury_medical,
        gore: graphicContentPolicy.gore,
        extreme_gore: graphicContentPolicy.extreme_gore,
        body_horror_disturbing: graphicContentPolicy.body_horror_disturbing,
        animal_harm: graphicContentPolicy.animal_harm,
      },
      civility_policy: {
        group_directed_demeaning_language: civilityPolicy.group_directed_demeaning_language,
        targeted_insults: civilityPolicy.targeted_insults,
        targeted_harassment: civilityPolicy.targeted_harassment,
        threatening_language: civilityPolicy.threatening_language,
      },
      openai_moderation_settings: {
        scan_titles: providerSettings.scanTitles,
        scan_post_bodies: providerSettings.scanPostBodies,
        scan_captions: providerSettings.scanCaptions,
        scan_link_preview_text: providerSettings.scanLinkPreviewText,
        scan_images: providerSettings.scanImages,
      },
    })
      .then((updatedCommunity) => {
        setCommunity(updatedCommunity);
        toast.success("Safety settings saved.");
      })
      .catch((nextError: unknown) => {
        console.warn("[community-safety] failed to save safety settings", nextError);
        toast.error(getErrorMessage(nextError, "Could not save safety settings."));
      })
      .finally(() => {
        setSavingSafety(false);
      });
  }, [
    adultContentPolicy,
    api.communities,
    civilityPolicy,
    community,
    graphicContentPolicy,
    providerSettings,
    savingSafety,
    setCommunity,
  ]);

  const handleSaveLinks = React.useCallback(() => {
    if (!community || savingLinks) {
      return;
    }

    setSavingLinks(true);
    void api.communities.updateReferenceLinks(community.community_id, {
      reference_links: links
        .filter((link) => link.url.trim())
        .map((link, index) => ({
          community_reference_link_id: link.id.startsWith("draft-") ? null : link.id,
          label: link.label.trim() || null,
          platform: link.platform as NonNullable<ApiCommunity["reference_links"]>[number]["platform"],
          position: index,
          url: link.url.trim(),
        })),
    })
      .then((updatedCommunity) => {
        setCommunity(updatedCommunity);
        setLinks(getCommunityLinkDrafts(updatedCommunity));
        toast.success("Links saved.");
      })
      .catch((nextError: unknown) => {
        console.warn("[community-links] failed to save links", nextError);
        toast.error(getErrorMessage(nextError, "Could not save links."));
      })
      .finally(() => {
        setSavingLinks(false);
      });
  }, [api.communities, community, links, savingLinks, setCommunity]);

  const handleResolveDonationPartner = React.useCallback(() => {
    if (!community || resolvingDonationPartner || !endaomentUrl.trim()) {
      return;
    }

    setResolvingDonationPartner(true);
    setResolveError(null);
    void api.communities.resolveDonationPartner(community.community_id, {
      endaoment_url: endaomentUrl.trim(),
    })
      .then((resolvedPartner) => {
        setPartnerPreview({
          donationPartnerId: resolvedPartner.donation_partner_id,
          displayName: resolvedPartner.display_name,
          imageUrl: resolvedPartner.image_url ?? null,
          provider: "Endaoment",
          providerPartnerRef: resolvedPartner.provider_partner_ref ?? null,
        });
        setEndaomentUrl(buildEndaomentOrgUrl(resolvedPartner.provider_partner_ref));
      })
      .catch((nextError: unknown) => {
        console.warn("[community-donations] failed to resolve partner", nextError);
        setPartnerPreview(null);
        setResolveError(getErrorMessage(nextError, "Could not find that Endaoment organization."));
      })
      .finally(() => {
        setResolvingDonationPartner(false);
      });
  }, [api.communities, community, endaomentUrl, resolvingDonationPartner]);

  const handleSaveDonations = React.useCallback(() => {
    if (!community || savingDonations) {
      return;
    }

    if (donationMode !== "none" && !partnerPreview) {
      setResolveError("Resolve an Endaoment organization before saving.");
      return;
    }

    setSavingDonations(true);
    setResolveError(null);
    void api.communities.updateDonationPolicy(community.community_id, {
      donation_policy_mode: donationMode,
      donation_partner_id: donationMode === "none" ? null : (partnerPreview?.donationPartnerId ?? null),
      donation_partner: donationMode === "none" || !partnerPreview
        ? null
        : {
          donation_partner_id: partnerPreview.donationPartnerId,
          display_name: partnerPreview.displayName,
          provider: "endaoment",
          provider_partner_ref: partnerPreview.providerPartnerRef ?? null,
          image_url: partnerPreview.imageUrl ?? null,
        },
    })
      .then((updatedCommunity) => {
        setCommunity(updatedCommunity);
        setDonationMode(updatedCommunity.donation_policy_mode ?? "none");
        setPartnerPreview(getCommunityDonationPartnerPreview(updatedCommunity));
        setEndaomentUrl(buildEndaomentOrgUrl(updatedCommunity.donation_partner?.provider_partner_ref));
        toast.success("Donations saved.");
      })
      .catch((nextError: unknown) => {
        console.warn("[community-donations] failed to save donation policy", nextError);
        toast.error(getErrorMessage(nextError, "Could not save donations."));
      })
      .finally(() => {
        setSavingDonations(false);
      });
  }, [api.communities, community, donationMode, partnerPreview, savingDonations, setCommunity]);

  const handleSaveGates = React.useCallback(() => {
    if (!community || savingGates) {
      return;
    }

    const gateRules = gateDrafts.map((draft) => ({
      scope: "membership" as const,
      gate_family: "identity_proof" as const,
      gate_type: draft.gateType,
      gate_rule_id: draft.gateRuleId ?? null,
      proof_requirements: [
        {
          proof_type: draft.gateType,
          accepted_providers: ["self"] as ("self" | "very" | "passport")[],
          config: { required_value: draft.requiredValue },
        },
      ],
    }));

    setSavingGates(true);
    void api.communities.updateGates(community.community_id, {
      membership_mode: membershipMode,
      default_age_gate_policy: defaultAgeGatePolicy,
      allow_anonymous_identity: allowAnonymousIdentity,
      anonymous_identity_scope: allowAnonymousIdentity ? anonymousIdentityScope : null,
      gate_rules: gateRules,
    })
      .then((updatedCommunity) => {
        setCommunity(updatedCommunity);
        toast.success("Access settings saved.");
      })
      .catch((nextError: unknown) => {
        console.warn("[community-gates] failed to save gates", nextError);
        toast.error(getErrorMessage(nextError, "Could not save access settings."));
      })
      .finally(() => {
        setSavingGates(false);
      });
  }, [
    allowAnonymousIdentity,
    anonymousIdentityScope,
    api.communities,
    community,
    defaultAgeGatePolicy,
    gateDrafts,
    membershipMode,
    savingGates,
    setCommunity,
  ]);

  let content = blocked;

  if (!content && community) {
    if (section === "rules") {
      content = (
        <CommunityRulesEditorPage
          description={description}
          onBackClick={() => navigate(`/c/${communityId}`)}
          onDescriptionChange={setDescription}
          onReportReasonChange={setReportReason}
          onRuleNameChange={setRuleName}
          onSave={handleSaveRules}
          reportReason={reportReason}
          ruleName={ruleName}
          saveDisabled={!ruleName.trim() || !description.trim() || savingRules}
          saveLoading={savingRules}
        />
      );
    } else if (section === "links") {
      content = (
        <CommunityLinksEditorPage
          links={links}
          onAddLink={() => setLinks((current) => [...current, createEmptyCommunityLinkEditorItem()])}
          onLinkChange={(id, patch) => {
            setLinks((current) => current.map((link) => link.id === id ? { ...link, ...patch } : link));
          }}
          onRemoveLink={(id) => {
            setLinks((current) => current.filter((link) => link.id !== id));
          }}
          onSave={handleSaveLinks}
          saveDisabled={savingLinks || links.some((link) => !link.url.trim())}
          saveLoading={savingLinks}
        />
      );
    } else if (section === "donations") {
      content = (
        <CommunityDonationsEditorPage
          donationMode={donationMode}
          endaomentUrl={endaomentUrl}
          onClearPartner={() => {
            setPartnerPreview(null);
            setEndaomentUrl("");
            setResolveError(null);
            if (donationMode !== "none") {
              setDonationMode("none");
            }
          }}
          onDonationModeChange={(value) => {
            setDonationMode(value);
            if (value === "none") {
              setResolveError(null);
            }
          }}
          onEndaomentUrlChange={(value) => {
            setEndaomentUrl(value);
            setPartnerPreview(null);
            setResolveError(null);
          }}
          onResolve={handleResolveDonationPartner}
          onSave={handleSaveDonations}
          partnerPreview={partnerPreview}
          resolveError={resolveError}
          resolving={resolvingDonationPartner}
          saveDisabled={savingDonations || (donationMode !== "none" && !partnerPreview)}
          saveLoading={savingDonations}
        />
      );
    } else if (section === "gates") {
      content = (
        <CommunityGatesEditorPage
          allowAnonymousIdentity={allowAnonymousIdentity}
          anonymousIdentityScope={anonymousIdentityScope}
          defaultAgeGatePolicy={defaultAgeGatePolicy}
          gateDrafts={gateDrafts}
          membershipMode={membershipMode}
          onAllowAnonymousIdentityChange={setAllowAnonymousIdentity}
          onAnonymousIdentityScopeChange={setAnonymousIdentityScope}
          onBackClick={() => navigate(`/c/${communityId}`)}
          onDefaultAgeGatePolicyChange={setDefaultAgeGatePolicy}
          onGateDraftsChange={setGateDrafts}
          onMembershipModeChange={setMembershipMode}
          onSave={handleSaveGates}
          saveDisabled={savingGates || (membershipMode === "gated" && gateDrafts.length === 0)}
          showSaveAction
        />
      );
    } else if (section === "safety") {
      content = (
        <CommunitySafetyPage
          adultContentPolicy={adultContentPolicy}
          civilityPolicy={civilityPolicy}
          graphicContentPolicy={graphicContentPolicy}
          onAdultContentPolicyChange={setAdultContentPolicy}
          onBackClick={() => navigate(`/c/${communityId}`)}
          onCivilityPolicyChange={setCivilityPolicy}
          onGraphicContentPolicyChange={setGraphicContentPolicy}
          onProviderSettingsChange={setProviderSettings}
          onSave={handleSaveSafety}
          providerSettings={providerSettings}
          saveDisabled={savingSafety}
          saveLoading={savingSafety}
        />
      );
    } else {
      content = (
        <CommunityNamespaceVerificationPage
          activeSessionId={effectiveNamespaceSessionId}
          callbacks={namespaceVerificationCallbacks}
          initialRootLabel={community.route_slug ?? ""}
          onBackClick={() => navigate(`/c/${communityId}`)}
          onSessionCleared={() => {
            setActiveNamespaceSessionId(null);
            setCommunity((current) => current
              ? {
                ...current,
                pending_namespace_verification_session_id: null,
              }
              : current);
            void api.communities.setPendingNamespaceSession(communityId, null)
              .then((updatedCommunity) => {
                setCommunity(updatedCommunity);
              })
              .catch((nextError) => {
                console.warn("[community-namespace] failed to clear pending session", nextError);
                toast.error("Could not clear the saved namespace verification.");
              });
          }}
          onSessionStarted={setActiveNamespaceSessionId}
        />
      );
    }
  }

  return (
    <CommunityModerationShell
      communityAvatarSrc={community?.avatar_ref ?? undefined}
      communityLabel={community ? `r/${community.display_name}` : "Moderator tools"}
      onExitClick={() => navigate(`/c/${communityId}`)}
      sections={buildCommunityModerationSections(section, communityId)}
    >
      {content}
    </CommunityModerationShell>
  );
}

async function loadProfilesByUserId(
  api: ReturnType<typeof useApi>,
  userIds: readonly string[],
  fallbackProfilesByUserId: Record<string, ApiProfile | null | undefined> = {},
): Promise<Record<string, ApiProfile | null>> {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  const profileEntries = await Promise.all(uniqueUserIds.map(async (userId) => [
    userId,
    fallbackProfilesByUserId[userId]
      ?? await api.profiles.getByUserId(userId).catch(() => null),
  ] as const));

  return Object.fromEntries(profileEntries);
}

function usePost(
  postId: string,
  locale: string,
  canMutate: boolean,
  labels: {
    cancelReplyLabel: string;
    loadMoreRepliesLabel: string;
    loadRepliesLabel: string;
    loadingRepliesLabel: string;
    replyActionLabel: string;
    replyPlaceholder: string;
    showOriginalLabel: string;
    submitReplyLabel: string;
    showTranslationLabel: string;
  },
) {
  const api = useApi();
  const session = useSession();
  const [post, setPost] = React.useState<ApiPost | null>(null);
  const [community, setCommunity] = React.useState<ApiCommunity | null>(null);
  const [authorProfile, setAuthorProfile] = React.useState<ApiProfile | null>(null);
  const [commentNodes, setCommentNodes] = React.useState<ThreadCommentNode[]>([]);
  const [authorProfilesByUserId, setAuthorProfilesByUserId] = React.useState<Record<string, ApiProfile | null>>({});
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);

  const loadTopLevelComments = React.useCallback(async (communityId: string) => {
    const nextCommentNodes = await loadThreadCommentTree(api, communityId, postId, locale, canMutate);
    const nextAuthorProfilesByUserId = await loadProfilesByUserId(
      api,
      collectThreadCommentAuthorUserIds(nextCommentNodes),
      session?.profile ? { [session.user.user_id]: session.profile } : {},
    );

    return {
      authorProfilesByUserId: nextAuthorProfilesByUserId,
      commentNodes: nextCommentNodes,
    };
  }, [api, canMutate, locale, postId, session]);

  const refreshTopLevelComments = React.useCallback(async (communityId: string) => {
    const nextThreadState = await loadTopLevelComments(communityId);
    setAuthorProfilesByUserId((current) => ({
      ...current,
      ...nextThreadState.authorProfilesByUserId,
    }));
    setCommentNodes((current) => mergeThreadCommentNodes(current, nextThreadState.commentNodes));
  }, [loadTopLevelComments]);

  const loadRepliesForComment = React.useCallback(async (commentId: string) => {
    const currentNode = findThreadCommentNode(commentNodes, commentId);
    if (!currentNode || currentNode.loadingReplies) {
      return;
    }
    if (currentNode.hasLoadedReplies && !currentNode.nextRepliesCursor) {
      return;
    }

    setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
      ...node,
      loadingReplies: true,
    })));

    try {
      const repliesPage = canMutate
        ? await api.comments.listReplies(commentId, {
          cursor: currentNode.hasLoadedReplies ? currentNode.nextRepliesCursor : null,
          limit: THREAD_COMMENT_PAGE_LIMIT,
          locale,
          sort: "best",
        })
        : await api.publicComments.listReplies(commentId, {
          cursor: currentNode.hasLoadedReplies ? currentNode.nextRepliesCursor : null,
          limit: THREAD_COMMENT_PAGE_LIMIT,
          locale,
          sort: "best",
        });
      const nextProfiles = await loadProfilesByUserId(
        api,
        collectCommentAuthorUserIds(repliesPage.items),
        session?.profile ? { [session.user.user_id]: session.profile } : {},
      );
      setAuthorProfilesByUserId((current) => ({
        ...current,
        ...nextProfiles,
      }));
      setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
        ...node,
        children: [...node.children, ...repliesPage.items.map((item) => createThreadCommentNode(item))],
        hasLoadedReplies: true,
        loadingReplies: false,
        nextRepliesCursor: repliesPage.next_cursor,
      })));
    } catch (nextError) {
      console.warn("[post-thread] failed to load replies", { commentId, message: getErrorMessage(nextError, "unknown") });
      setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
        ...node,
        loadingReplies: false,
      })));
      toast.error(getErrorMessage(nextError, "Could not load replies."));
    }
  }, [api, canMutate, commentNodes, locale, session]);

  const createTopLevelComment = React.useCallback(async (body: string) => {
    if (!canMutate || !post) {
      return;
    }

    try {
      await api.communities.createComment(post.post.community_id, post.post.post_id, { body });
      await refreshTopLevelComments(post.post.community_id);
    } catch (nextError) {
      toast.error(getErrorMessage(nextError, "Could not post this reply."));
      throw nextError;
    }
  }, [api, canMutate, post, refreshTopLevelComments]);

  const createReply = React.useCallback(async (commentId: string, body: string) => {
    if (!canMutate) {
      return;
    }
    try {
      await api.comments.createReply(commentId, { body });
      const context = await api.comments.getContext(commentId, {
        limit: THREAD_COMMENT_PAGE_LIMIT,
        locale,
      });
      const nextProfiles = await loadProfilesByUserId(api, [
        ...collectCommentAuthorUserIds([context.comment]),
        ...collectCommentAuthorUserIds(context.replies),
      ], session?.profile ? { [session.user.user_id]: session.profile } : {});

      setAuthorProfilesByUserId((current) => ({
        ...current,
        ...nextProfiles,
      }));
      setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
        ...node,
        item: context.comment,
        children: context.replies.map((item) => createThreadCommentNode(item)),
        hasLoadedReplies: true,
        loadingReplies: false,
        nextRepliesCursor: context.next_replies_cursor,
      })));
    } catch (nextError) {
      toast.error(getErrorMessage(nextError, "Could not post this reply."));
      throw nextError;
    }
  }, [api, canMutate, locale, session]);

  const voteOnComment = React.useCallback(async (commentId: string, direction: "up" | "down") => {
    if (!canMutate) {
      return;
    }
    const nextValue = direction === "up" ? 1 : -1;
    const currentNode = findThreadCommentNode(commentNodes, commentId);
    const previousVote = currentNode?.item.viewer_vote ?? null;
    const previousScore = currentNode?.item.comment.score ?? 0;

    setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
      ...node,
      item: {
        ...node.item,
        comment: {
          ...node.item.comment,
          score: node.item.comment.score + (nextValue - (node.item.viewer_vote ?? 0)),
        },
        viewer_vote: nextValue,
      },
    })));

    try {
      const response = await api.comments.vote(commentId, nextValue);
      setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
        ...node,
        item: {
          ...node.item,
          viewer_vote: response.value,
        },
      })));
    } catch (nextError) {
      setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
        ...node,
        item: {
          ...node.item,
          comment: {
            ...node.item.comment,
            score: previousScore,
          },
          viewer_vote: previousVote,
        },
      })));
      toast.error(getErrorMessage(nextError, "Could not update this vote."));
    }
  }, [api, canMutate, commentNodes]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCommentNodes([]);
    setAuthorProfilesByUserId({});

    const postRequest = canMutate
      ? api.posts.get(postId, { locale })
      : api.publicPosts.get(postId, { locale });

    void postRequest
      .then(async (p) => {
        const [communityResult, commentTree] = await Promise.all([
          (canMutate
            ? api.communities.get(p.post.community_id)
            : Promise.resolve(null)).catch(() => null),
          loadTopLevelComments(p.post.community_id),
        ]);
        const authorProfilesByUserId = await loadProfilesByUserId(api, [
          ...(p.post.identity_mode === "public" && p.post.author_user_id ? [p.post.author_user_id] : []),
        ], session?.profile ? { [session.user.user_id]: session.profile } : {});
        if (cancelled) return;
        setPost(p);
        setCommunity(communityResult);
        setAuthorProfile(
          p.post.identity_mode === "public" && p.post.author_user_id
            ? authorProfilesByUserId[p.post.author_user_id] ?? null
            : null,
        );
        setCommentNodes(commentTree.commentNodes);
        setAuthorProfilesByUserId({
          ...commentTree.authorProfilesByUserId,
          ...authorProfilesByUserId,
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, canMutate, loadTopLevelComments, locale, postId, session]);

  const comments = React.useMemo(
    () => commentNodes.map((node) => mapThreadCommentNode(
      node,
      authorProfilesByUserId,
      labels,
      loadRepliesForComment,
      canMutate ? createReply : undefined,
      canMutate ? voteOnComment : undefined,
    )),
    [authorProfilesByUserId, canMutate, commentNodes, createReply, labels, loadRepliesForComment, voteOnComment],
  );

  React.useEffect(() => {
    if (!community) return;

    rememberKnownCommunity({
      avatarSrc: community.avatar_ref ?? undefined,
      communityId: community.community_id,
      displayName: community.display_name,
    });
  }, [community]);

  return {
    post,
    community,
    authorProfile,
    comments,
    createTopLevelComment: canMutate ? createTopLevelComment : undefined,
    error,
    loading,
  };
}

function PostPage({ postId }: { postId: string }) {
  const api = useApi();
  const session = useSession();
  const { copy } = useRouteMessages();
  const { locale: uiLocale } = useUiLocale();
  const preferredUiLocale: UiLocaleCode = session?.profile.preferred_locale
    && isUiLocaleCode(session.profile.preferred_locale)
    ? session.profile.preferred_locale
    : uiLocale;
  const contentLocale = React.useMemo(() => resolveViewerContentLocale({
    uiLocale: preferredUiLocale,
    browserLocales: typeof navigator === "undefined"
      ? []
      : [...navigator.languages, navigator.language].filter(Boolean),
  }), [preferredUiLocale]);
  const translationLabels = React.useMemo(() => ({
    cancelReplyLabel: copy.common.cancelReply,
    loadMoreRepliesLabel: copy.common.loadMoreReplies,
    loadRepliesLabel: copy.common.loadReplies,
    loadingRepliesLabel: copy.common.loadingReplies,
    replyActionLabel: copy.common.replyAction,
    replyPlaceholder: copy.common.replyPlaceholder,
    showOriginalLabel: copy.common.showOriginal,
    submitReplyLabel: copy.common.submitReply,
    showTranslationLabel: copy.common.showTranslation,
  }), [
    copy.common.cancelReply,
    copy.common.loadMoreReplies,
    copy.common.loadReplies,
    copy.common.loadingReplies,
    copy.common.replyAction,
    copy.common.replyPlaceholder,
    copy.common.showOriginal,
    copy.common.submitReply,
    copy.common.showTranslation,
  ]);
  const canMutate = Boolean(session?.accessToken);
  const { post, community, authorProfile, comments, createTopLevelComment, error, loading } = usePost(
    postId,
    contentLocale,
    canMutate,
    translationLabels,
  );
  const commerceEnabled = Boolean(session?.user?.user_id && community?.community_id);
  const {
    listingsByAssetId,
    purchasesByAssetId,
    refresh: refreshSongCommerce,
  } = useSongCommerceState(community?.community_id ?? "", commerceEnabled);
  const songPlayback = useSongPlayback(session?.accessToken ?? null);

  const handleBuySong = React.useCallback(async (listing: ApiCommunityListing, titleText: string, nextCommunityId: string) => {
    const settlementWalletAttachmentId = session?.user.primary_wallet_attachment_id;
    if (!settlementWalletAttachmentId) {
      toast.error("Connect a primary wallet before buying this song.");
      return;
    }

    let quoteId: string | null = null;
    try {
      const quote = await api.communities.createPurchaseQuote(nextCommunityId, {
        listing_id: listing.listing_id,
        client_estimated_hop_count: 0,
        client_estimated_slippage_bps: 0,
      });
      quoteId = quote.quote_id;

      const settlement = await api.communities.settlePurchase(nextCommunityId, {
        quote_id: quote.quote_id,
        settlement_wallet_attachment_id: settlementWalletAttachmentId,
        settlement_tx_ref: `ui:${crypto.randomUUID()}`,
      });
      await refreshSongCommerce();
      toast.success(
        `${titleText} unlocked for ${formatUsdLabel(settlement.purchase_price_usd) ?? "the quoted price"}.`,
      );
    } catch (purchaseError) {
      if (quoteId) {
        void api.communities.failPurchase(nextCommunityId, { quote_id: quoteId }).catch(() => undefined);
      }
      toast.error(getErrorMessage(purchaseError, "Could not unlock this song."));
    }
  }, [api.communities, refreshSongCommerce, session?.user.primary_wallet_attachment_id]);

  if (loading) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center py-20">
        <Spinner className="size-6" />
      </section>
    );
  }

  if (error) {
    if (isApiAuthError(error)) {
      return (
        <AuthRequiredRouteState
          description="Reconnect to load this post again."
          title="Post"
        />
      );
    }

    if (isApiNotFoundError(error)) {
      return <NotFoundPage path={`/p/${postId}`} />;
    }

    return (
      <RouteLoadFailureState
        description={getErrorMessage(error, "The post could not be loaded right now.")}
        title="Post"
      />
    );
  }

  if (!post) {
    return (
      <RouteLoadFailureState
        description="The post response was incomplete. Try loading it again."
        title="Post"
      />
    );
  }

  const threadAssetId = post.post.asset_id ?? null;
  const threadListing = threadAssetId ? listingsByAssetId[threadAssetId] : undefined;
  const threadPurchase = threadAssetId ? purchasesByAssetId[threadAssetId] : undefined;
  const songOptions = post.post.post_type === "song" && community && threadAssetId
    ? {
      currentUserId: session?.user?.user_id,
      listing: threadListing,
      onBuy: threadListing
        ? () => void handleBuySong(
          threadListing,
          post.post.title ?? "song",
          community.community_id,
        )
        : undefined,
      playback: songPlayback,
      purchase: threadPurchase,
    }
    : undefined;
  const localizedPostCard = toThreadPostCard(
    post,
    community,
    authorProfile ?? undefined,
    songOptions,
  );
  const originalPostCard = shouldShowOriginalPost(post)
    ? toThreadPostCard(
      post,
      community,
      authorProfile ?? undefined,
      songOptions,
      { preferOriginalText: true },
    )
    : undefined;

  return (
    <ContentRailShell rail={community ? <CommunitySidebar {...buildCommunitySidebar(community)} /> : undefined}>
      <PostThread
        commentsHeading={copy.common.commentsHeading}
        commentsHeadingDir={contentLocale === "ar" ? "rtl" : undefined}
        commentsHeadingLang={contentLocale === "ar" ? "ar" : undefined}
        emptyCommentsLabel={copy.common.noComments}
        onRootReplySubmit={createTopLevelComment}
        post={localizedPostCard}
        postOriginal={originalPostCard}
        postShowOriginalLabel={originalPostCard ? copy.common.showOriginal : undefined}
        postShowTranslationLabel={originalPostCard ? copy.common.showTranslation : undefined}
        comments={comments}
        rootReplyActionLabel={copy.common.replyAction}
        rootReplyCancelLabel={copy.common.cancelReply}
        rootReplyPlaceholder={copy.common.replyPlaceholder}
        rootReplySubmitLabel={copy.common.submitReply}
      />
    </ContentRailShell>
  );
}

function apiProfileToProps(
  profile: ApiProfile,
  ownProfile: boolean,
  joinedStatLabel: string,
  followState: ReturnType<typeof useProfileFollowState>,
) {
  const handle = profile.primary_public_handle?.label ?? profile.global_handle?.label ?? "";

  return {
    profile: {
      displayName: profile.display_name ?? handle,
      handle,
      bio: profile.bio ?? "",
      avatarSrc: profile.avatar_ref ?? undefined,
      bannerSrc: profile.cover_ref ?? undefined,
      meta: [],
      viewerContext: ownProfile ? ("self" as const) : ("public" as const),
      viewerFollows: followState.isFollowing,
      canMessage: !ownProfile,
      followBusy: followState.followBusy,
      followDisabled: followState.followDisabled || followState.followLoading,
      followLoading: followState.followLoading,
      onToggleFollow: followState.onToggleFollow,
    },
    rightRail: {
      stats: [
        { label: "Followers", value: followState.followerCount ?? "—" },
        { label: "Following", value: followState.followingCount },
        { label: joinedStatLabel, value: new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) },
      ],
      walletAddress: profile.primary_wallet_address ?? undefined,
    },
    overviewItems: [],
    posts: [],
    comments: [],
    scrobbles: [],
  };
}

function mapProfileLinkedHandles(profile: ApiProfile): SettingsHandle[] {
  const linkedHandles = profile.linked_handles ?? [{
    linked_handle_id: `global:${profile.global_handle.global_handle_id}`,
    label: profile.global_handle.label,
    kind: "pirate" as const,
    verification_state: "verified" as const,
  }];
  const primaryLinkedHandleId = profile.primary_public_handle?.linked_handle_id ?? null;

  return linkedHandles.map((handle) => ({
    handleId: handle.kind === "pirate" ? null : handle.linked_handle_id,
    kind: handle.kind,
    label: handle.label,
    primary: handle.kind === "pirate"
      ? primaryLinkedHandleId == null
      : primaryLinkedHandleId === handle.linked_handle_id,
    verificationState: handle.verification_state,
  }));
}

function getSelectedProfileHandleLabel(profile: ApiProfile, linkedHandleId: string | null): string {
  if (linkedHandleId == null) {
    return profile.global_handle.label;
  }

  return profile.linked_handles?.find((handle) => handle.linked_handle_id === linkedHandleId)?.label
    ?? profile.primary_public_handle?.label
    ?? profile.global_handle.label;
}

const SETTINGS_LOCALE_OPTIONS: Array<{ label: string; value: UiLocaleCode }> = [
  { label: "English", value: "en" },
  { label: "Arabic", value: "ar" },
  { label: "Pseudo", value: "pseudo" },
];

function buildSettingsPath(tab: SettingsTab): string {
  return `/settings/${tab}`;
}

function formatWalletChainLabel(chainNamespace: string): string {
  switch (chainNamespace) {
    case "eip155:1":
      return "Ethereum";
    case "eip155:8453":
      return "Base";
    default:
      return chainNamespace;
  }
}

function isUiLocaleCode(value: string): value is UiLocaleCode {
  return (SUPPORTED_UI_LOCALES as readonly string[]).includes(value);
}

function CurrentUserProfilePage() {
  const { copy } = useRouteMessages();
  const session = useSession();
  const profile = session?.profile ?? null;
  const followState = useProfileFollowState(profile?.primary_wallet_address ?? null, true);

  console.info("[/me] CurrentUserProfilePage rendered", {
    hasSession: !!session,
    hasProfile: !!profile,
    onboarding: session?.onboarding,
    profileDisplayName: profile?.display_name,
  });

  const handleFlow = useGlobalHandleFlow({
    currentHandleLabel: profile?.global_handle?.label ?? "",
    onRenamed: async () => {
      toast.success("Handle updated");
    },
  });

  if (!profile) {
    console.warn("[/me] No profile in session — showing sign-in prompt");
    return (
      <AuthRequiredRouteState
        description="Reconnect to load your profile again."
        title="Profile"
      />
    );
  }

  const currentHandle = profile.global_handle?.label
    ? profile.global_handle.label.replace(/\.pirate$/i, "").concat(".pirate")
    : "";

  return (
    <ProfilePageComposition
      {...apiProfileToProps(profile, true, copy.common.joinedStatLabel, followState)}
      onEditProfile={() => {
        handleFlow.clearDraft();
        navigate(buildSettingsPath("profile"));
      }}
    />
  );
}

function CurrentUserSettingsPage({ activeTab }: { activeTab: SettingsTab }) {
  const api = useApi();
  const session = useSession();
  const profile = session?.profile ?? null;
  const walletAttachments = session?.walletAttachments ?? [];
  const { locale, setLocale } = useUiLocale();
  const syncedPrimaryWalletRef = React.useRef<string | null>(null);

  const [displayName, setDisplayName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [preferredLocale, setPreferredLocale] = React.useState<UiLocaleCode>("en");
  const [selectedPrimaryHandleId, setSelectedPrimaryHandleId] = React.useState<string | null>(null);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = React.useState(false);
  const [coverRemoved, setCoverRemoved] = React.useState(false);
  const [displayNameError, setDisplayNameError] = React.useState<string | undefined>(undefined);
  const [profileSubmitState, setProfileSubmitState] = React.useState<SettingsSubmitState>({ kind: "idle" });
  const [preferencesSubmitState, setPreferencesSubmitState] = React.useState<SettingsSubmitState>({ kind: "idle" });

  React.useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    const profileLocale = profile.preferred_locale ?? "";
    setPreferredLocale(isUiLocaleCode(profileLocale) ? profileLocale : locale);
    setSelectedPrimaryHandleId(profile.primary_public_handle?.linked_handle_id ?? null);
    setAvatarFile(null);
    setCoverFile(null);
    setAvatarRemoved(false);
    setCoverRemoved(false);
    setDisplayNameError(undefined);
    setProfileSubmitState({ kind: "idle" });
    setPreferencesSubmitState({ kind: "idle" });
  }, [locale, profile]);

  const handleFlow = useGlobalHandleFlow({
    currentHandleLabel: profile?.global_handle?.label ?? "",
    onRenamed: async () => {
      const refreshedProfile = await api.profiles.getMe();
      updateSessionProfile(refreshedProfile);
      toast.success("Handle updated");
    },
  });

  const currentHandle = profile?.global_handle?.label
    ? profile.global_handle.label.replace(/\.pirate$/i, "").concat(".pirate")
    : "";
  const profilePrimaryHandleId = profile?.primary_public_handle?.linked_handle_id ?? null;
  const linkedHandles = profile ? mapProfileLinkedHandles(profile) : [];
  const postAuthorLabel = profile ? getSelectedProfileHandleLabel(profile, selectedPrimaryHandleId) : currentHandle;

  React.useEffect(() => {
    if (!profile || activeTab !== "profile") {
      return;
    }

    const primaryWalletAttachmentId = session?.user.primary_wallet_attachment_id ?? null;
    const hasEthereumWallet = walletAttachments.some((wallet) => wallet.chain_namespace === "eip155:1");
    if (!primaryWalletAttachmentId || !hasEthereumWallet) {
      return;
    }

    const syncKey = `${profile.user_id}:${primaryWalletAttachmentId}`;
    if (syncedPrimaryWalletRef.current === syncKey) {
      return;
    }

    syncedPrimaryWalletRef.current = syncKey;
    let cancelled = false;

    void api.profiles.syncLinkedHandles()
      .then((updatedProfile) => {
        if (cancelled) {
          return;
        }
        updateSessionProfile(updatedProfile);
        setSelectedPrimaryHandleId(updatedProfile.primary_public_handle?.linked_handle_id ?? null);
      })
      .catch((error: unknown) => {
        console.warn("[settings] linked handle sync failed", error);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, api, profile, session?.user.primary_wallet_attachment_id, walletAttachments]);

  const profileHasChanges = profile == null
    ? false
    : (
      displayName.trim() !== (profile.display_name ?? "").trim()
      || bio !== (profile.bio ?? "")
      || avatarFile !== null
      || coverFile !== null
      || (avatarRemoved && profile.avatar_ref != null)
      || (coverRemoved && profile.cover_ref != null)
      || selectedPrimaryHandleId !== profilePrimaryHandleId
    );

  const preferencesChanged = profile == null
    ? false
    : preferredLocale !== (isUiLocaleCode(profile.preferred_locale ?? "") ? profile.preferred_locale : locale);

  const handleProfileSave = React.useCallback(async () => {
    if (!profile) return;

    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      setDisplayNameError("Display name is required.");
      return;
    }

    setDisplayNameError(undefined);
    setProfileSubmitState({ kind: "saving" });
    try {
      let avatarRef = avatarRemoved ? null : profile.avatar_ref ?? null;
      let coverRef = coverRemoved ? null : profile.cover_ref ?? null;

      if (avatarFile) {
        avatarRef = (await api.profiles.uploadMedia({
          kind: "avatar",
          file: avatarFile,
        })).media_ref;
      }

      if (coverFile) {
        coverRef = (await api.profiles.uploadMedia({
          kind: "cover",
          file: coverFile,
        })).media_ref;
      }

      const updatedProfile = await api.profiles.updateMe({
        display_name: trimmedDisplayName,
        bio: bio.trim() ? bio : null,
        avatar_ref: avatarRef,
        cover_ref: coverRef,
      });

      const finalProfile = selectedPrimaryHandleId !== profilePrimaryHandleId
        ? await api.profiles.setPrimaryPublicHandle(selectedPrimaryHandleId)
        : updatedProfile;

      updateSessionProfile(finalProfile);
      setAvatarFile(null);
      setCoverFile(null);
      setAvatarRemoved(finalProfile.avatar_ref == null);
      setCoverRemoved(finalProfile.cover_ref == null);
      setSelectedPrimaryHandleId(finalProfile.primary_public_handle?.linked_handle_id ?? null);
      setProfileSubmitState({ kind: "idle" });
      toast.success("Profile updated");
    } catch (e: unknown) {
      const apiErr = e as ApiError;
      setProfileSubmitState({ kind: "error", message: apiErr?.message ?? "Failed to save profile." });
    }
  }, [
    api,
    avatarFile,
    avatarRemoved,
    bio,
    coverFile,
    coverRemoved,
    displayName,
    profile,
    profilePrimaryHandleId,
    selectedPrimaryHandleId,
  ]);

  const handlePreferencesSave = React.useCallback(async () => {
    if (!profile) return;

    setPreferencesSubmitState({ kind: "saving" });
    try {
      const updatedProfile = await api.profiles.updateMe({
        preferred_locale: preferredLocale,
      });
      updateSessionProfile(updatedProfile);
      setLocale(preferredLocale);
      setPreferencesSubmitState({ kind: "idle" });
      toast.success("Preferences updated");
    } catch (e: unknown) {
      const apiErr = e as ApiError;
      setPreferencesSubmitState({ kind: "error", message: apiErr?.message ?? "Failed to save preferences." });
    }
  }, [api, preferredLocale, profile, setLocale]);

  if (!profile) {
    return (
      <AuthRequiredRouteState
        description="Reconnect to load your settings again."
        title="Settings"
      />
    );
  }

  return (
    <SettingsPage
      activeTab={activeTab}
      onTabChange={(tab) => navigate(buildSettingsPath(tab))}
      preferences={{
        ageStatusLabel: session?.user.verification_capabilities?.age_over_18?.state === "verified"
          ? "18+ verified"
          : "Not verified",
        locale: preferredLocale,
        localeOptions: SETTINGS_LOCALE_OPTIONS,
        onLocaleChange: (next) => {
          if (isUiLocaleCode(next)) {
            setPreferredLocale(next);
            setPreferencesSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev);
          }
        },
        onSave: handlePreferencesSave,
        saveDisabled: !preferencesChanged || preferencesSubmitState.kind === "saving",
        submitState: preferencesSubmitState,
      }}
      profile={{
        avatarSrc: avatarRemoved ? undefined : profile.avatar_ref ?? undefined,
        bio,
        coverSrc: coverRemoved ? undefined : profile.cover_ref ?? undefined,
        currentHandle,
        displayName,
        displayNameError,
        handleFlow,
        linkedHandles,
        primaryHandleId: selectedPrimaryHandleId,
        onAvatarRemove: () => {
          setAvatarFile(null);
          setAvatarRemoved(true);
          setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev);
        },
        onAvatarSelect: (file) => {
          setAvatarFile(file);
          setAvatarRemoved(false);
          setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev);
        },
        onBioChange: (next) => {
          setBio(next);
          setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev);
        },
        onCoverRemove: () => {
          setCoverFile(null);
          setCoverRemoved(true);
          setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev);
        },
        onCoverSelect: (file) => {
          setCoverFile(file);
          setCoverRemoved(false);
          setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev);
        },
        onDisplayNameChange: (next) => {
          setDisplayName(next);
          setDisplayNameError(undefined);
          setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev);
        },
        onPrimaryHandleChange: (handleId) => {
          setSelectedPrimaryHandleId(handleId);
          setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev);
        },
        onSave: handleProfileSave,
        pendingAvatarLabel: avatarFile?.name,
        pendingCoverLabel: coverFile?.name,
        postAuthorLabel,
        saveDisabled: !profileHasChanges || profileSubmitState.kind === "saving",
        submitState: profileSubmitState,
      }}
      title="Settings"
      wallet={{
        connectedWallets: walletAttachments.map((wallet) => ({
          address: wallet.wallet_address,
          chainLabel: formatWalletChainLabel(wallet.chain_namespace),
          isPrimary: wallet.is_primary,
        })),
        primaryAddress: profile.primary_wallet_address ?? undefined,
      }}
    />
  );
}

function resolveOnboardingPhase(status: OnboardingStatus): OnboardingPhase {
  const phase = (() => {
    if (status.reddit_verification_status !== "verified") {
      return "import_karma";
    }
    if (status.reddit_import_status !== "succeeded") {
      return "import_karma";
    }
    if (status.cleanup_rename_available) {
      return "choose_name";
    }
    return "suggested_communities";
  })();
  console.info("[resolveOnboardingPhase]", { phase, status });
  return phase;
}

function mapRedditVerification(
  apiResult: ApiRedditVerification,
  usernameValue: string,
): RedditVerificationState {
  const stateMap: Record<string, RedditVerificationState["verificationState"]> = {
    pending: "code_ready",
    verified: "verified",
    failed: "failed",
    expired: "failed",
  };

  return {
    usernameValue,
    verifiedUsername: apiResult.status === "verified" ? apiResult.reddit_username : undefined,
    verificationState: stateMap[apiResult.status] ?? "not_started",
    verificationHint: apiResult.verification_hint ?? undefined,
    codePlacementSurface: apiResult.code_placement_surface ?? undefined,
    errorTitle: apiResult.failure_code
      ? apiResult.failure_code.replace(/_/g, " ")
      : undefined,
  };
}

function mapImportJobStatus(
  apiStatus: OnboardingStatus["reddit_import_status"],
  importSummary?: ApiRedditImportSummary | null,
): ImportJobState {
  const statusMap: Record<string, ImportJobState["status"]> = {
    not_started: "not_started",
    queued: "queued",
    running: "running",
    succeeded: "succeeded",
    failed: "failed",
  };

  return {
    status: statusMap[apiStatus] ?? "not_started",
    sourceLabel: importSummary?.coverage_note ?? undefined,
  };
}

function markImportQueued(
  status: OnboardingStatus | null,
  setOnboardingStatus: React.Dispatch<React.SetStateAction<OnboardingStatus | null>>,
): void {
  setOnboardingStatus(status ? {
    ...status,
    reddit_import_status: "queued",
  } : status);
}

function OnboardingPage() {
  const { copy } = useRouteMessages();
  const api = useApi();
  const session = useSession();

  const [phase, setPhase] = React.useState<OnboardingPhase>("import_karma");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const [onboardingStatus, setOnboardingStatus] = React.useState<OnboardingStatus | null>(null);

  const [redditUsername, setRedditUsername] = React.useState("");
  const [redditVerification, setRedditVerification] = React.useState<RedditVerificationState>({
    usernameValue: "",
    verificationState: "not_started",
  });
  const [importJob, setImportJob] = React.useState<ImportJobState>({ status: "not_started" });
  const [snapshot, setSnapshot] = React.useState<SnapshotState | undefined>(undefined);
  const [generatedHandle, setGeneratedHandle] = React.useState("");

  const [actionLoading, setActionLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void api.onboarding.getStatus()
      .then((status) => {
        if (cancelled) return;
        setOnboardingStatus(status);
        setImportJob(mapImportJobStatus(status.reddit_import_status));
        setPhase(resolveOnboardingPhase(status));

        if (status.reddit_verification_status === "verified") {
          setRedditVerification({
            usernameValue: "",
            verificationState: "verified",
          });
        }

        setGeneratedHandle(session?.profile?.global_handle?.label ?? "");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, session?.profile?.global_handle?.label]);

  React.useEffect(() => {
    if (phase !== "import_karma" || !onboardingStatus) return;
    if (onboardingStatus.reddit_import_status === "queued" || onboardingStatus.reddit_import_status === "running") {
      const interval = setInterval(() => {
        void api.onboarding.getStatus()
          .then((status) => {
            setOnboardingStatus(status);
            setImportJob(mapImportJobStatus(status.reddit_import_status));

            if (status.reddit_import_status === "succeeded" || status.reddit_import_status === "failed") {
              clearInterval(interval);
              if (status.reddit_import_status === "succeeded") {
                void api.onboarding.getLatestRedditImport()
                  .then((summary) => {
                    setSnapshot({
                      accountAgeDays: summary.account_age_days ?? undefined,
                      globalKarma: summary.global_karma ?? null,
                      topSubreddits: summary.top_subreddits.map((s) => ({
                        subreddit: s.subreddit,
                        karma: s.karma ?? null,
                        posts: s.posts ?? null,
                        rankSource: s.rank_source ?? undefined,
                      })),
                      moderatorOf: summary.moderator_of,
                      inferredInterests: summary.inferred_interests,
                      suggestedCommunities: summary.suggested_communities.map((c) => ({
                        communityId: c.community_id,
                        name: c.name,
                        reason: c.reason,
                      })),
                    });
                    updateSessionOnboarding(status);
                    setPhase(resolveOnboardingPhase(status));
                  });
              }
            }
          });
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [phase, onboardingStatus, api]);

  const handleImportKarmaNext = React.useCallback(() => {
    if (actionLoading) return;
    console.info("[onboarding] continue clicked", {
      phase,
      redditVerificationState: redditVerification.verificationState,
      importJobStatus: importJob.status,
      redditUsername,
    });
    setActionLoading(true);
    setError(null);

    const isVerified = redditVerification.verificationState === "verified";
    const isCodeReady = redditVerification.verificationState === "code_ready";
    const isNotStarted = redditVerification.verificationState === "not_started";
    const isImportDone = importJob.status === "succeeded";

    if (isImportDone) {
      console.info("[onboarding] import already complete, advancing to choose_name");
      setPhase("choose_name");
      setActionLoading(false);
      return;
    }

    if (isVerified && !isImportDone) {
      const username = redditVerification.verifiedUsername ?? redditUsername;
      console.info("[onboarding] starting reddit import", { username });
      void api.onboarding.startRedditImport(username)
        .then(() => {
          console.info("[onboarding] reddit import queued");
          markImportQueued(onboardingStatus, setOnboardingStatus);
          setImportJob({ status: "queued" });
        })
        .catch((e: unknown) => {
          console.error("[onboarding] reddit import failed", e);
          setError(e instanceof Error ? e.message : "Failed to start import");
        })
        .finally(() => setActionLoading(false));
      return;
    }

    if (isCodeReady) {
      console.info("[onboarding] checking existing reddit verification code", { redditUsername });
      void api.onboarding.startRedditVerification(redditUsername)
        .then((result) => {
          console.info("[onboarding] reddit verification result", result);
          setRedditVerification(mapRedditVerification(result, redditUsername));

          if (result.status === "verified") {
            return api.onboarding.startRedditImport(result.reddit_username);
          }
          return undefined;
        })
        .then((importResult) => {
          if (importResult) {
            markImportQueued(onboardingStatus, setOnboardingStatus);
            setImportJob({ status: "queued" });
          }
        })
        .catch((e: unknown) => {
          console.error("[onboarding] reddit verification check failed", e);
          setError(e instanceof Error ? e.message : "Verification check failed");
        })
        .finally(() => setActionLoading(false));
      return;
    }

    if (isNotStarted && redditUsername.trim().length > 0) {
      console.info("[onboarding] creating reddit verification", { redditUsername });
      setRedditVerification((prev) => ({ ...prev, verificationState: "checking" }));
      void api.onboarding.startRedditVerification(redditUsername)
        .then((result) => {
          console.info("[onboarding] reddit verification created/result", result);
          setRedditVerification(mapRedditVerification(result, redditUsername));

          if (result.status === "verified") {
            return api.onboarding.startRedditImport(result.reddit_username);
          }
          return undefined;
        })
        .then((importResult) => {
          if (importResult) {
            markImportQueued(onboardingStatus, setOnboardingStatus);
            setImportJob({ status: "queued" });
          }
        })
        .catch((e: unknown) => {
          console.error("[onboarding] reddit verification failed", e);
          setRedditVerification((prev) => ({ ...prev, verificationState: "failed", errorTitle: e instanceof Error ? e.message : "Verification failed" }));
        })
        .finally(() => setActionLoading(false));
      return;
    }

    console.warn("[onboarding] continue click had no eligible action", {
      redditVerificationState: redditVerification.verificationState,
      importJobStatus: importJob.status,
      redditUsername,
    });
    setActionLoading(false);
  }, [actionLoading, redditVerification, importJob, redditUsername, api, phase, onboardingStatus]);

  const handleChooseNameContinue = React.useCallback(() => {
    if (actionLoading) return;
    if (generatedHandle.trim().length === 0) {
      setError("Choose a handle before continuing");
      return;
    }
    setActionLoading(true);
    setError(null);

    void api.profiles.renameHandle(generatedHandle.replace(/\.pirate$/, ""))
      .then(() => {
        return api.profiles.getMe()
          .then((profile) => {
            updateSessionProfile(profile);
          });
      })
      .then(() => {
        updateSessionOnboarding({
          ...onboardingStatus!,
          cleanup_rename_available: false,
        });
        setPhase("suggested_communities");
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Handle rename failed");
      })
      .finally(() => setActionLoading(false));
  }, [actionLoading, generatedHandle, api, onboardingStatus]);

  const handleSkip = React.useCallback(() => {
    navigate("/");
  }, []);

  if (loading) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center py-20">
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6" />
        </div>
      </section>
    );
  }

  if (error && !onboardingStatus) {
    if (isApiAuthError(error)) {
      return (
        <AuthRequiredRouteState
          description="Reconnect to continue onboarding."
          title={copy.onboarding.title}
        />
      );
    }

    return (
      <RouteLoadFailureState
        description={getErrorMessage(error, "The onboarding flow could not be loaded right now.")}
        title={copy.onboarding.title}
      />
    );
  }

  if (!session) {
    return (
      <AuthRequiredRouteState
        description="Reconnect to continue onboarding."
        title={copy.onboarding.title}
      />
    );
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="mx-auto w-full max-w-5xl">
        <OnboardingRedditBootstrap
          actions={{
            tertiaryLabel: "Skip",
          }}
          busy={actionLoading}
          callbacks={{
            onUsernameChange: (value) => {
              setRedditUsername(value);
              setRedditVerification((prev) => ({ ...prev, usernameValue: value }));
            },
            onImportKarmaNext: handleImportKarmaNext,
            onImportKarmaSkip: handleSkip,
            onHandleChange: (value) => setGeneratedHandle(value),
            onGenerateHandle: () => {},
            onChooseNameContinue: handleChooseNameContinue,
            onSuggestedCommunitiesContinue: () => navigate("/"),
            onSuggestedCommunitiesSkip: () => navigate("/"),
          }}
          canSkip
          generatedHandle={generatedHandle}
          handleSuggestion={
            redditVerification.verifiedUsername
              ? { suggestedLabel: redditVerification.verifiedUsername, availability: "available" as const, source: "verified_reddit_username" as const }
              : undefined
          }
          importJob={importJob}
          phase={phase}
          phaseError={onboardingStatus && typeof error === "string" ? error : null}
          reddit={redditVerification}
          snapshot={snapshot}
        />
      </div>
    </section>
  );
}

function InboxPlaceholderPage() {
  const { copy } = useRouteMessages();

  return (
    <StackPageShell
      title={copy.inbox.title}
      description={copy.inbox.description}
    >
      <EmptyFeedState message={copy.inbox.body} />
    </StackPageShell>
  );
}

function toSpacesChallengePayload(
  value: Record<string, unknown> | null | undefined,
): SpacesChallengePayload | null {
  if (!value) {
    return null;
  }

  if (
    value.kind !== "schnorr_sign" ||
    typeof value.domain !== "string" ||
    typeof value.root_label !== "string" ||
    typeof value.root_pubkey !== "string" ||
    typeof value.nonce !== "string" ||
    typeof value.issued_at !== "string" ||
    typeof value.expires_at !== "string" ||
    typeof value.message !== "string" ||
    typeof value.digest !== "string"
  ) {
    return null;
  }

  return {
    kind: "schnorr_sign",
    domain: value.domain,
    root_label: value.root_label,
    root_pubkey: value.root_pubkey,
    nonce: value.nonce,
    issued_at: value.issued_at,
    expires_at: value.expires_at,
    message: value.message,
    digest: value.digest,
  };
}

function toNamespaceSessionResult(result: {
  namespace_verification_session_id: string;
  family: "hns" | "spaces";
  submitted_root_label: string;
  challenge_host?: string | null;
  challenge_txt_value?: string | null;
  challenge_payload?: Record<string, unknown> | null;
  challenge_expires_at?: string | null;
  assertions?: {
    pirate_dns_authority_verified?: boolean | null;
  } | null;
  operation_class?: "owner_managed_namespace" | "routing_only_namespace" | "pirate_delegated_namespace" | "owner_signed_updates_namespace" | null;
  setup_nameservers?: string[] | null;
  status: "draft" | "inspecting" | "dns_setup_required" | "challenge_required" | "challenge_pending" | "verifying" | "verified" | "failed" | "expired" | "disputed";
}) {
  return {
    namespaceVerificationSessionId: result.namespace_verification_session_id,
    family: result.family,
    rootLabel: result.submitted_root_label,
    challengeHost: result.challenge_host ?? null,
    challengeTxtValue: result.challenge_txt_value ?? null,
    challengePayload: toSpacesChallengePayload(result.challenge_payload),
    challengeExpiresAt: result.challenge_expires_at ?? null,
    status: result.status,
    operationClass: result.operation_class ?? null,
    pirateDnsAuthorityVerified: result.assertions?.pirate_dns_authority_verified ?? null,
    setupNameservers: result.setup_nameservers ?? null,
  };
}

function CreateCommunityPage() {
  const { copy } = useRouteMessages();
  const api = useApi();
  const session = useSession();
  const [verificationSessionId, setVerificationSessionId] = React.useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = React.useState(false);
  const [verificationError, setVerificationError] = React.useState<string | null>(null);
  const widgetRef = React.useRef<{ destroy?: () => void; open?: () => void } | null>(null);

  const cleanupWidget = React.useCallback(() => {
    widgetRef.current?.destroy?.();
    widgetRef.current = null;
  }, []);

  React.useEffect(() => {
    return () => {
      cleanupWidget();
    };
  }, [cleanupWidget]);

  const refreshOnboardingStatus = React.useCallback(async () => {
    const status = await api.onboarding.getStatus();
    updateSessionOnboarding(status);
    return status;
  }, [api]);

  const openVeryWidget = React.useCallback(async (result: VerificationSession) => {
    const launch = result.launch?.very_widget;
    if (!launch) {
      throw new Error("Very launch data was not returned");
    }

    cleanupWidget();

    widgetRef.current = createVeryWidget({
      appId: launch.app_id,
      context: launch.context,
      typeId: launch.type_id,
      query: JSON.stringify(launch.query),
      verifyUrl: launch.verify_url ?? `${resolveApiBaseUrl()}/very/verify`,
      onSuccess: async (proof: string) => {
        console.info("[very-widget] proof received", {
          verificationSessionId: result.verification_session_id,
          proofLength: proof.length,
        });
        try {
          console.info("[very-widget] completing verification session", {
            verificationSessionId: result.verification_session_id,
          });
          await api.verification.completeSession(result.verification_session_id, {
            provider_payload_ref: proof,
          });
          await refreshOnboardingStatus();
          setVerificationSessionId(null);
          setVerificationError(null);
        } catch (e: unknown) {
          const apiError = e as ApiError;
          setVerificationError(apiError?.message ?? "Could not complete Very verification");
        } finally {
          setVerificationLoading(false);
          cleanupWidget();
        }
      },
      onError: (error: string) => {
        console.error("[very-widget] verification failed", {
          verificationSessionId: result.verification_session_id,
          error,
        });
        setVerificationError(error || "Very verification failed");
        setVerificationLoading(false);
        cleanupWidget();
      },
      theme: "dark",
    });

    widgetRef.current.open?.();
  }, [api, cleanupWidget, refreshOnboardingStatus]);

  const handleStartVeryVerification = React.useCallback(async () => {
    setVerificationLoading(true);
    setVerificationError(null);

    try {
      const result = await api.verification.startSession({
        provider: "very",
        verification_intent: "community_creation",
      });
      setVerificationSessionId(result.verification_session_id);
      await openVeryWidget(result);
    } catch (e: unknown) {
      const apiError = e as ApiError;
      setVerificationError(apiError?.message ?? (e instanceof Error ? e.message : "Could not start Very verification"));
      setVerificationLoading(false);
    } finally {
      if (!widgetRef.current) {
        setVerificationLoading(false);
      }
    }
  }, [api, openVeryWidget]);

  const creatorVerificationState = session?.onboarding
    ? {
        uniqueHumanVerified: session.onboarding.unique_human_verification_status === "verified",
        ageOver18Verified: false,
      }
    : { uniqueHumanVerified: false, ageOver18Verified: false };

  const veryVerificationState = creatorVerificationState.uniqueHumanVerified
    ? "verified"
    : verificationSessionId
      ? "pending"
      : "not_started";

  const handleCreate = React.useCallback(async (input: {
    avatarFile: File | null;
    avatarRef: string | null;
    bannerFile: File | null;
    bannerRef: string | null;
    displayName: string;
    description: string | null;
    membershipMode: "open" | "request" | "gated";
    defaultAgeGatePolicy: "none" | "18_plus";
    allowAnonymousIdentity: boolean;
    anonymousIdentityScope: "community_stable" | "thread_stable" | "post_ephemeral";
    gateDrafts: IdentityGateDraft[];
  }) => {
    try {
      const avatarRef = input.avatarFile
        ? (await api.communities.uploadMedia({
          kind: "avatar",
          file: input.avatarFile,
        })).media_ref
        : input.avatarRef;
      const bannerRef = input.bannerFile
        ? (await api.communities.uploadMedia({
          kind: "banner",
          file: input.bannerFile,
        })).media_ref
        : input.bannerRef;
      const gateRules = input.gateDrafts.map((draft) => ({
        scope: "membership" as const,
        gate_family: "identity_proof" as const,
        gate_type: draft.gateType,
        proof_requirements: [
          {
            proof_type: draft.gateType,
            accepted_providers: ["self"] as ("self" | "very" | "passport")[],
            config: { required_value: draft.requiredValue },
          },
        ],
      }));

      const result = await api.communities.create({
        avatar_ref: avatarRef,
        banner_ref: bannerRef,
        display_name: input.displayName,
        description: input.description,
        membership_mode: input.membershipMode,
        default_age_gate_policy: input.defaultAgeGatePolicy,
        allow_anonymous_identity: input.allowAnonymousIdentity,
        anonymous_identity_scope: input.anonymousIdentityScope,
        handle_policy: { policy_template: "standard" },
        governance_mode: "centralized",
        gate_rules: gateRules.length > 0 ? gateRules : undefined,
        community_bootstrap: {
          rules: DEFAULT_COMMUNITY_RULES.map((rule) => ({
            title: rule.title,
            body: rule.body,
            report_reason: rule.title,
          })),
        },
      });

      rememberKnownCommunity({
        avatarSrc: result.community.avatar_ref ?? undefined,
        communityId: result.community.community_id,
        displayName: result.community.display_name ?? input.displayName,
      });
      navigate(`/c/${result.community.community_id}`);
      return { communityId: result.community.community_id };
    } catch (e: unknown) {
      const apiError = e as ApiError;
      throw new Error(apiError?.message ?? "Community creation failed");
    }
  }, [api]);

  if (!session) {
    return (
      <AuthRequiredRouteState
        description="Reconnect to create a community."
        title={copy.createCommunity.title}
      />
    );
  }

  if (!creatorVerificationState.uniqueHumanVerified) {
    return (
      <StackPageShell
        title={copy.createCommunity.title}
        description="Verify your identity before creating a community."
      >
        {verificationError ? <FormNote tone="warning">{verificationError}</FormNote> : null}
        <StatusCard
          title={
            veryVerificationState === "pending"
              ? "Finish your Very verification"
              : "Verify with Very"
          }
          description={
            veryVerificationState === "pending"
              ? "Complete the palm scan in Very."
              : "You must complete unique-human verification before creating a community."
          }
          tone="warning"
          actions={(
            <>
              {veryVerificationState === "not_started" ? (
                <Button loading={verificationLoading} onClick={handleStartVeryVerification}>
                  Start Verification
                </Button>
              ) : null}
              {veryVerificationState === "pending" ? (
                <>
                  <Button loading={verificationLoading} onClick={handleStartVeryVerification}>
                    Reopen Very
                  </Button>
                </>
              ) : null}
            </>
          )}
        />
      </StackPageShell>
    );
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="mx-auto w-full max-w-5xl">
        <CreateCommunityComposer
          creatorVerificationState={creatorVerificationState}
          onCreate={handleCreate}
        />
      </div>
    </section>
  );
}

function NotFoundPage({ path }: { path: string }) {
  const { copy } = useRouteMessages();

  return (
    <StackPageShell
      title={copy.notFound.title}
      description={interpolateMessage(copy.notFound.description, { path })}
      actions={
        <Button onClick={() => navigate("/")} variant="secondary">
          {copy.common.backHome}
        </Button>
      }
    >
      <EmptyFeedState message={copy.notFound.body} />
    </StackPageShell>
  );
}

function CreatePostGlobalPage() {
  const knownCommunities = useKnownCommunities();
  const [selectedCommunityId, setSelectedCommunityId] = React.useState<string | null>(null);
  const pickerItems: CommunityPickerItem[] = React.useMemo(
    () => knownCommunities.map((c) => ({
      communityId: c.communityId,
      displayName: c.displayName,
      avatarSrc: c.avatarSrc,
    })),
    [knownCommunities],
  );

  if (selectedCommunityId) {
    return <CreatePostPage communityId={selectedCommunityId} />;
  }

  return (
    <PostComposer
      clubName="Choose a community"
      communityPickerEmptyLabel="No recent communities."
      communityPickerItems={pickerItems}
      mode="text"
      onSelectCommunity={setSelectedCommunityId}
      submitDisabled
    />
  );
}

export function renderAuthenticatedRoute(route: AppRoute): React.ReactNode {
  console.info("[renderAuthenticatedRoute]", route.kind, route);
  switch (route.kind) {
    case "home":
      return <HomePage />;
    case "your-communities":
      return <YourCommunitiesPage />;
    case "create-post-global":
      return <CreatePostGlobalPage />;
    case "create-post":
      return <CreatePostPage communityId={route.communityId} />;
    case "community-moderation":
      return <CommunityModerationPage communityId={route.communityId} section={route.section} />;
    case "community":
      return <CommunityPage communityId={route.communityId} />;
    case "create-community":
      return <CreateCommunityPage />;
    case "post":
      return <PostPage postId={route.postId} />;
    case "inbox":
      return <InboxPlaceholderPage />;
    case "me":
      return <CurrentUserProfilePage />;
    case "settings":
      return <CurrentUserSettingsPage activeTab={route.section} />;
    case "onboarding":
      return <OnboardingPage />;
    case "not-found":
      return <NotFoundPage path={route.path} />;
  }
}
