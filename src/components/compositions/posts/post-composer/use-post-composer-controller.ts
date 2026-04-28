"use client";

import * as React from "react";

import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

import type {
  AuthorMode,
  CharityContributionState,
  ComposerAudienceState,
  ComposerTab,
  DerivativeStepState,
  IdentityMode,
  LiveComposerState,
  LiveRoomKind,
  MonetizationState,
  PostComposerProps,
  AssetLicenseState,
  SongComposerState,
  VideoComposerState,
} from "./post-composer.types";
import {
  defaultAssetLicenseState,
  defaultAudienceState,
  defaultCharityContributionState,
  defaultMonetizationState,
  defaultSongState,
  defaultTabs,
  defaultVideoState,
} from "./post-composer-config";
import {
  deriveLiveStateForRoomKindChange,
  shouldClearSelectedQualifiers,
  shouldForcePublicIdentityForAuthor,
  shouldForcePublicIdentityForTab,
} from "./post-composer-invariants";
import { deriveDerivativeSearchResults } from "./post-composer-sections";

function deriveSelectedQualifierIds(
  identity: NonNullable<PostComposerProps["identity"]>,
): string[] {
  return identity.selectedQualifierIds ?? [];
}

function defaultLiveState(live?: LiveComposerState): LiveComposerState {
  return live ?? {
    roomKind: "solo",
    accessMode: "free",
    visibility: "public",
    setlistItems: [],
    setlistStatus: "draft",
    performerAllocations: [{ userId: "", role: "host", sharePct: 100 }],
  };
}

export function usePostComposerController(props: PostComposerProps) {
  const {
    availableTabs = defaultTabs,
    canCreateSongPost = false,
    clubAvatarSrc,
    clubName,
    communityPickerEmptyLabel,
    communityPickerItems,
    onSelectCommunity,
  } = props;
  const { actions, draft, submit } = props;
  const mode = draft?.mode ?? props.mode ?? "text";
  const titleValue = draft?.titleValue ?? props.titleValue ?? "";
  const textBodyValue = draft?.textBodyValue ?? props.textBodyValue ?? "";
  const captionValue = draft?.captionValue ?? props.captionValue ?? "";
  const imageUpload = draft?.imageUpload !== undefined ? draft.imageUpload : props.imageUpload;
  const imageUploadLabel = draft?.imageUploadLabel ?? props.imageUploadLabel;
  const lyricsValue = draft?.lyricsValue ?? props.lyricsValue ?? "";
  const linkUrlValue = draft?.linkUrlValue ?? props.linkUrlValue ?? "";
  const linkPreview = draft?.linkPreview ?? props.linkPreview;
  const songMode = draft?.songMode ?? props.songMode;
  const song = draft?.song ?? props.song;
  const license = draft?.license ?? props.license;
  const video = draft?.video ?? props.video;
  const derivativeStep = draft?.derivativeStep ?? props.derivativeStep;
  const monetization = draft?.monetization ?? props.monetization;
  const charityPartner = draft?.charityPartner ?? props.charityPartner;
  const charityContribution = draft?.charityContribution ?? props.charityContribution;
  const audience = draft?.audience ?? props.audience;
  const identity = draft?.identity ?? props.identity;
  const live = draft?.live ?? props.live;
  const onTitleValueChange = actions?.onTitleValueChange ?? props.onTitleValueChange;
  const onTextBodyValueChange = actions?.onTextBodyValueChange ?? props.onTextBodyValueChange;
  const onCaptionValueChange = actions?.onCaptionValueChange ?? props.onCaptionValueChange;
  const onImageUploadChange = actions?.onImageUploadChange ?? props.onImageUploadChange;
  const onLyricsValueChange = actions?.onLyricsValueChange ?? props.onLyricsValueChange;
  const onLinkUrlValueChange = actions?.onLinkUrlValueChange ?? props.onLinkUrlValueChange;
  const onSongChange = actions?.onSongChange ?? props.onSongChange;
  const onLicenseChange = actions?.onLicenseChange ?? props.onLicenseChange;
  const onVideoChange = actions?.onVideoChange ?? props.onVideoChange;
  const onSongModeChange = actions?.onSongModeChange ?? props.onSongModeChange;
  const onModeChange = actions?.onModeChange ?? props.onModeChange;
  const onDerivativeStepChange = actions?.onDerivativeStepChange ?? props.onDerivativeStepChange;
  const onMonetizationChange = actions?.onMonetizationChange ?? props.onMonetizationChange;
  const onCharityContributionChange = actions?.onCharityContributionChange ?? props.onCharityContributionChange;
  const onAudienceChange = actions?.onAudienceChange ?? props.onAudienceChange;
  const onAuthorModeChange = actions?.onAuthorModeChange ?? props.onAuthorModeChange;
  const onIdentityModeChange = actions?.onIdentityModeChange ?? props.onIdentityModeChange;
  const onSelectedQualifierIdsChange = actions?.onSelectedQualifierIdsChange ?? props.onSelectedQualifierIdsChange;
  const onSubmit = submit?.onSubmit ?? props.onSubmit;
  const baseSubmitDisabled = submit?.disabled ?? props.submitDisabled ?? false;
  const submitError = submit?.error ?? props.submitError ?? null;
  const submitLabel = submit?.label ?? props.submitLabel;
  const submitLoading = submit?.loading ?? props.submitLoading ?? false;
  const { isRtl, locale } = useUiLocale();
  const isMobile = useIsMobile();
  const routesCopy = getLocaleMessages(locale, "routes");
  const copy = routesCopy.createPost;
  const visibleTabs = React.useMemo(
    () => availableTabs.filter((tab) => tab !== "song" || canCreateSongPost),
    [availableTabs, canCreateSongPost],
  );
  const [activeTab, setActiveTab] = React.useState<ComposerTab>(visibleTabs[0] ?? "text");
  const [uncontrolledSongMode, setUncontrolledSongMode] = React.useState<NonNullable<PostComposerProps["songMode"]>>(
    songMode ?? "original",
  );
  const [uncontrolledSongState, setUncontrolledSongState] = React.useState<SongComposerState>(
    () => defaultSongState(song),
  );
  const [uncontrolledLicenseState, setUncontrolledLicenseState] = React.useState<AssetLicenseState>(
    () => defaultAssetLicenseState(license),
  );
  const [uncontrolledVideoState, setUncontrolledVideoState] = React.useState<VideoComposerState>(
    () => defaultVideoState(video),
  );
  const [uncontrolledImageUpload, setUncontrolledImageUpload] = React.useState<File | null>(
    imageUpload ?? null,
  );
  const [identityMode, setIdentityMode] = React.useState<IdentityMode>(
    identity?.identityMode ?? "public",
  );
  const [authorMode, setAuthorMode] = React.useState<AuthorMode>(
    identity?.authorMode ?? "human",
  );
  const [selectedQualifierIds, setSelectedQualifierIds] = React.useState<string[]>(
    identity ? deriveSelectedQualifierIds(identity) : [],
  );
  const [uncontrolledMonetizationState, setUncontrolledMonetizationState] = React.useState<MonetizationState>(
    () => defaultMonetizationState(monetization),
  );
  const [uncontrolledCharityContribution, setUncontrolledCharityContribution] = React.useState<CharityContributionState>(
    () => defaultCharityContributionState(charityContribution),
  );
  const [uncontrolledAudienceState, setUncontrolledAudienceState] = React.useState<ComposerAudienceState>(
    () => defaultAudienceState(audience),
  );
  const [uncontrolledDerivativeState, setUncontrolledDerivativeState] = React.useState<DerivativeStepState | undefined>(
    derivativeStep,
  );
  const [derivativePickerKey, setDerivativePickerKey] = React.useState(0);
  const [liveState, setLiveState] = React.useState<LiveComposerState>(() => defaultLiveState(live));
  const [prevRoomKind, setPrevRoomKind] = React.useState<LiveRoomKind>(liveState.roomKind);
  const activeSongMode = songMode ?? uncontrolledSongMode;
  const activeImageUpload = imageUpload === undefined ? uncontrolledImageUpload : imageUpload;
  const songState = song ?? uncontrolledSongState;
  const licenseState = license ?? uncontrolledLicenseState;
  const videoState = video ?? uncontrolledVideoState;
  const monetizationState = monetization ?? uncontrolledMonetizationState;
  const charityContributionState = charityContribution ?? uncontrolledCharityContribution;
  const audienceState = audience ?? uncontrolledAudienceState;
  const derivativeState = derivativeStep ?? uncontrolledDerivativeState;

  const setSongModeWithCallback = React.useCallback((next: NonNullable<PostComposerProps["songMode"]>) => {
    if (songMode === undefined) {
      setUncontrolledSongMode(next);
    }
    onSongModeChange?.(next);
  }, [onSongModeChange, songMode]);

  const setIdentityModeWithCallback = React.useCallback((next: IdentityMode) => {
    setIdentityMode(next);
    onIdentityModeChange?.(next);
  }, [onIdentityModeChange]);

  const setAuthorModeWithCallback = React.useCallback((next: AuthorMode) => {
    setAuthorMode(next);
    onAuthorModeChange?.(next);
  }, [onAuthorModeChange]);

  const setSelectedQualifierIdsWithCallback = React.useCallback((next: string[]) => {
    setSelectedQualifierIds(next);
    onSelectedQualifierIdsChange?.(next);
  }, [onSelectedQualifierIdsChange]);

  const updateSongState = React.useCallback((updater: (current: SongComposerState) => SongComposerState) => {
    const next = updater(songState);
    if (song === undefined) {
      setUncontrolledSongState(next);
    }
    onSongChange?.(next);
  }, [onSongChange, song, songState]);

  const updateLicenseState = React.useCallback((updater: (current: AssetLicenseState) => AssetLicenseState) => {
    const next = updater(licenseState);
    if (license === undefined) {
      setUncontrolledLicenseState(next);
    }
    onLicenseChange?.(next);
  }, [license, licenseState, onLicenseChange]);

  const updateVideoState = React.useCallback((updater: (current: VideoComposerState) => VideoComposerState) => {
    const next = updater(videoState);
    if (video === undefined) {
      setUncontrolledVideoState(next);
    }
    onVideoChange?.(next);
  }, [onVideoChange, video, videoState]);

  const setImageUploadWithCallback = React.useCallback((next: File | null) => {
    if (imageUpload === undefined) {
      setUncontrolledImageUpload(next);
    }
    onImageUploadChange?.(next);
  }, [imageUpload, onImageUploadChange]);

  const updateDerivativeState = React.useCallback((updater: (current: DerivativeStepState | undefined) => DerivativeStepState | undefined) => {
    const next = updater(derivativeState);
    if (derivativeStep === undefined) {
      setUncontrolledDerivativeState(next);
    }
    onDerivativeStepChange?.(next);
  }, [derivativeState, derivativeStep, onDerivativeStepChange]);

  const handleSongModeChange = React.useCallback((next: NonNullable<PostComposerProps["songMode"]>) => {
    setSongModeWithCallback(next);
    if (next === "remix") {
      updateDerivativeState((current) => {
        if (current && current.trigger !== "remix") return current;
        return {
          visible: true,
          required: true,
          trigger: "remix",
          searchResults: current?.searchResults ?? [],
          references: current?.references ?? [],
          sourceTermsAccepted: current?.sourceTermsAccepted === true,
        };
      });
    } else if (next === "original") {
      updateDerivativeState((current) => {
        if (current?.trigger === "remix") return undefined;
        return current;
      });
    }
  }, [setSongModeWithCallback, updateDerivativeState]);

  const derivativeMissingRefs = Boolean(
    derivativeState?.visible && derivativeState.required && !(derivativeState.references?.length),
  );
  const derivativeMissingSourceTermsAcceptance = Boolean(
    derivativeState?.visible
    && derivativeState.required
    && (derivativeState.references?.length ?? 0) > 0
    && derivativeState.sourceTermsAccepted !== true,
  );
  const submitDisabled = baseSubmitDisabled || derivativeMissingRefs || derivativeMissingSourceTermsAcceptance;

  const updateMonetizationState = React.useCallback((updater: (current: MonetizationState) => MonetizationState) => {
    const next = updater(monetizationState);
    if (monetization === undefined) {
      setUncontrolledMonetizationState(next);
    }
    onMonetizationChange?.(next);
  }, [monetization, monetizationState, onMonetizationChange]);

  const updateCharityContributionState = React.useCallback((updater: (current: CharityContributionState) => CharityContributionState) => {
    const next = updater(charityContributionState);
    if (charityContribution === undefined) {
      setUncontrolledCharityContribution(next);
    }
    onCharityContributionChange?.(next);
  }, [charityContribution, charityContributionState, onCharityContributionChange]);

  const updateAudienceState = React.useCallback((updater: (current: ComposerAudienceState) => ComposerAudienceState) => {
    const next = updater(audienceState);
    if (audience === undefined) {
      setUncontrolledAudienceState(next);
    }
    onAudienceChange?.(next);
  }, [audience, audienceState, onAudienceChange]);

  React.useEffect(() => {
    const nextLiveState = deriveLiveStateForRoomKindChange({
      current: liveState,
      previousRoomKind: prevRoomKind,
    });
    if (nextLiveState) {
      setLiveState(nextLiveState);
      setPrevRoomKind(liveState.roomKind);
    }
  }, [liveState, prevRoomKind]);

  React.useEffect(() => {
    if (visibleTabs.includes(mode)) {
      setActiveTab(mode);
      return;
    }

    setActiveTab(visibleTabs[0] ?? "text");
  }, [mode, visibleTabs]);

  React.useEffect(() => {
    setDerivativePickerKey(0);
  }, [derivativeStep]);

  React.useEffect(() => {
    setAuthorMode(identity?.authorMode ?? "human");
  }, [identity?.authorMode]);

  React.useEffect(() => {
    if (derivativeState?.trigger === "analysis" && activeSongMode !== "remix") {
      setSongModeWithCallback("remix");
    }
  }, [activeSongMode, derivativeState?.trigger, setSongModeWithCallback]);

  React.useEffect(() => {
    if (live) {
      setLiveState(live);
    }
  }, [live]);

  React.useEffect(() => {
    if (!identity) {
      return;
    }

    setIdentityMode(identity.identityMode ?? "public");
    setSelectedQualifierIds(deriveSelectedQualifierIds(identity));
  }, [identity]);

  React.useEffect(() => {
    if (shouldForcePublicIdentityForTab({
      activeTab,
      identityMode,
      monetizationVisible: monetizationState.visible,
    })) {
      setIdentityModeWithCallback("public");
    }
  }, [activeTab, identityMode, monetizationState.visible, setIdentityModeWithCallback]);

  React.useEffect(() => {
    if (shouldForcePublicIdentityForAuthor({ authorMode, identityMode })) {
      setIdentityModeWithCallback("public");
    }
  }, [authorMode, identityMode, setIdentityModeWithCallback]);

  React.useEffect(() => {
    if (shouldClearSelectedQualifiers({
      authorMode,
      identity,
      identityMode,
      selectedQualifierCount: selectedQualifierIds.length,
    })) {
      setSelectedQualifierIdsWithCallback([]);
    }
  }, [authorMode, identity?.allowQualifiersOnAnonymousPosts, identityMode, selectedQualifierIds.length, setSelectedQualifierIdsWithCallback]);

  const derivativeSearchResults = React.useMemo(
    () => deriveDerivativeSearchResults(derivativeState),
    [derivativeState],
  );
  const shouldShowAssetLicense =
    (activeTab === "song" && activeSongMode === "original")
    || (activeTab === "video" && monetizationState.visible);
  const assetLicenseCopy = activeTab === "song" || activeTab === "video"
    ? copy.assetLicense[activeTab]
    : null;
  const tabLabels: Record<ComposerTab, string> = {
    text: copy.tabs.text,
    image: copy.tabs.image,
    video: copy.tabs.video,
    link: copy.tabs.link,
    song: copy.tabs.song,
    live: copy.tabs.live,
  };

  return {
    audience: {
      state: audienceState,
      update: updateAudienceState,
    },
    charity: {
      partner: charityPartner,
      state: charityContributionState,
      update: updateCharityContributionState,
    },
    commerce: {
      monetizationState,
      updateMonetizationState,
    },
    community: {
      avatarSrc: clubAvatarSrc,
      emptyLabel: communityPickerEmptyLabel ?? routesCopy.common.noRecentCommunities,
      items: communityPickerItems,
      name: clubName,
      onSelect: onSelectCommunity,
      pickerTitle: routesCopy.common.chooseCommunity,
    },
    copy,
    fields: {
      captionValue,
      linkPreview,
      linkUrlValue,
      lyricsValue,
      onCaptionValueChange,
      onLinkUrlValueChange,
      onLyricsValueChange,
      onTextBodyValueChange,
      onTitleValueChange,
      textBodyValue,
      titleValue,
    },
    identity: {
      authorMode,
      identity,
      identityMode,
      selectedQualifierIds,
      setAuthorMode: setAuthorModeWithCallback,
      setIdentityMode: setIdentityModeWithCallback,
      setSelectedQualifierIds: setSelectedQualifierIdsWithCallback,
    },
    isMobile,
    isRtl,
    license: {
      assetLicenseCopy,
      shouldShowAssetLicense,
      state: licenseState,
      update: updateLicenseState,
    },
    media: {
      activeImageUpload,
      imageUploadLabel,
      setImageUpload: setImageUploadWithCallback,
      videoState,
      updateVideoState,
    },
    primary: {
      activeSongMode,
      derivativePickerKey,
      derivativeSearchResults,
      derivativeState,
      handleSongModeChange,
      liveState,
      setLiveState,
      updateDerivativeState,
    },
    song: {
      state: songState,
      update: updateSongState,
    },
    submit: {
      disabled: submitDisabled,
      error: submitError,
      label: submitLabel ?? copy.actions.post,
      loading: submitLoading,
      mobileEnabled: Boolean(submit),
      onSubmit,
    },
    tabs: {
      activeTab,
      labels: tabLabels,
      onTabChange: (nextTab: ComposerTab) => {
        setActiveTab(nextTab);
        onModeChange?.(nextTab);
      },
      visibleTabs,
    },
    advanceDerivativePicker: () => setDerivativePickerKey((current) => current + 1),
  };
}

export type PostComposerController = ReturnType<typeof usePostComposerController>;
