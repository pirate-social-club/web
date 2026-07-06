"use client";

import * as React from "react";

import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

import type {
  AuthorMode,
  AuthorAgeGatePolicy,
  CharityContributionState,
  ComposerAudienceState,
  ComposerEventState,
  ComposerStep,
  ComposerTab,
  DerivativeStepState,
  IdentityMode,
  LinkPreviewState,
  LiveComposerState,
  LiveRoomKind,
  MonetizationState,
  PostComposerProps,
  AssetLicenseState,
  AssetRoyaltySplitState,
  SongComposerState,
  VideoComposerState,
} from "./post-composer.types";
import {
  defaultAssetLicenseState,
  defaultAssetRoyaltySplitState,
  defaultAudienceState,
  defaultCharityContributionState,
  defaultEventState,
  defaultLiveComposerState,
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

export function usePostComposerController(props: PostComposerProps) {
  const {
    availableTabs = defaultTabs,
    canCreateSongPost = false,
    clubAvatarSrc,
    clubName,
    communityPickerEmptyLabel,
    communityPickerItems,
    currentUserWalletAddress,
    onSearchEventPlaces,
    onSelectCommunity,
  } = props;
  const { actions, draft, submit } = props;
  const controlledComposerStep = props.composerStep;
  const onComposerStepChange = props.onComposerStepChange;
  const mode = draft?.mode ?? props.mode ?? "text";
  const providedTitleValue = draft?.titleValue ?? props.titleValue ?? "";
  const providedTextBodyValue = draft?.textBodyValue ?? props.textBodyValue ?? "";
  const providedCaptionValue = draft?.captionValue ?? props.captionValue ?? "";
  const imageUpload = draft?.imageUpload !== undefined ? draft.imageUpload : props.imageUpload;
  const imageUploadLabel = draft?.imageUploadLabel ?? props.imageUploadLabel;
  const providedLyricsValue = draft?.lyricsValue ?? props.lyricsValue ?? "";
  const providedLinkUrlValue = draft?.linkUrlValue ?? props.linkUrlValue ?? "";
  const providedLinkPreview = draft?.linkPreview ?? props.linkPreview;
  const songMode = draft?.songMode ?? props.songMode;
  const song = draft?.song ?? props.song;
  const license = draft?.license ?? props.license;
  const royaltySplit = draft?.royaltySplit ?? props.royaltySplit;
  const video = draft?.video ?? props.video;
  const derivativeStep = draft?.derivativeStep ?? props.derivativeStep;
  const monetization = draft?.monetization ?? props.monetization;
  const regionalPricingPreview = draft?.regionalPricingPreview ?? props.regionalPricingPreview;
  const charityPartner = draft?.charityPartner ?? props.charityPartner;
  const charityContribution = draft?.charityContribution ?? props.charityContribution;
  const audience = draft?.audience ?? props.audience;
  const ageGatePolicy = draft?.ageGatePolicy ?? props.ageGatePolicy;
  const identity = draft?.identity ?? props.identity;
  const live = draft?.live ?? props.live;
  const event = draft?.event ?? props.event;
  const onTitleValueChange = actions?.onTitleValueChange ?? props.onTitleValueChange;
  const onTextBodyValueChange = actions?.onTextBodyValueChange ?? props.onTextBodyValueChange;
  const onCaptionValueChange = actions?.onCaptionValueChange ?? props.onCaptionValueChange;
  const onImageUploadChange = actions?.onImageUploadChange ?? props.onImageUploadChange;
  const onLyricsValueChange = actions?.onLyricsValueChange ?? props.onLyricsValueChange;
  const onLinkUrlValueChange = actions?.onLinkUrlValueChange ?? props.onLinkUrlValueChange;
  const onLinkPreviewChange = actions?.onLinkPreviewChange ?? props.onLinkPreviewChange;
  const onSongChange = actions?.onSongChange ?? props.onSongChange;
  const onLicenseChange = actions?.onLicenseChange ?? props.onLicenseChange;
  const onRoyaltySplitChange = actions?.onRoyaltySplitChange ?? props.onRoyaltySplitChange;
  const onVideoChange = actions?.onVideoChange ?? props.onVideoChange;
  const onSongModeChange = actions?.onSongModeChange ?? props.onSongModeChange;
  const onModeChange = actions?.onModeChange ?? props.onModeChange;
  const onDerivativeStepChange = actions?.onDerivativeStepChange ?? props.onDerivativeStepChange;
  const onMonetizationChange = actions?.onMonetizationChange ?? props.onMonetizationChange;
  const onCharityContributionChange = actions?.onCharityContributionChange ?? props.onCharityContributionChange;
  const onAudienceChange = actions?.onAudienceChange ?? props.onAudienceChange;
  const onAgeGatePolicyChange = actions?.onAgeGatePolicyChange ?? props.onAgeGatePolicyChange;
  const onAuthorModeChange = actions?.onAuthorModeChange ?? props.onAuthorModeChange;
  const onIdentityModeChange = actions?.onIdentityModeChange ?? props.onIdentityModeChange;
  const onSelectedQualifierIdsChange = actions?.onSelectedQualifierIdsChange ?? props.onSelectedQualifierIdsChange;
  const onLiveChange = actions?.onLiveChange ?? props.onLiveChange;
  const onEventChange = actions?.onEventChange ?? props.onEventChange;
  const onSubmit = submit?.onSubmit ?? props.onSubmit;
  const baseSubmitDisabled = submit?.disabled ?? props.submitDisabled ?? false;
  const baseContinueDisabled = submit?.canContinue === undefined
    ? baseSubmitDisabled
    : !submit.canContinue;
  const basePostDisabled = submit?.canPost === undefined
    ? baseSubmitDisabled
    : !submit.canPost;
  const submitError = submit?.error ?? props.submitError ?? null;
  const submitLabel = submit?.label ?? props.submitLabel;
  const submitLoading = submit?.loading ?? props.submitLoading ?? false;
  const submitProgress = submit?.progress ?? null;
  const { isRtl, locale } = useUiLocale();
  const isMobile = useIsMobile();
  const routesCopy = getLocaleMessages(locale, "routes");
  const copy = routesCopy.createPost;
  const visibleTabs = React.useMemo(
    () => availableTabs.filter((tab) => tab !== "song" || canCreateSongPost),
    [availableTabs, canCreateSongPost],
  );
  const [activeTab, setActiveTab] = React.useState<ComposerTab>(visibleTabs[0] ?? "text");
  const [uncontrolledTitleValue, setUncontrolledTitleValue] = React.useState(providedTitleValue);
  const [uncontrolledTextBodyValue, setUncontrolledTextBodyValue] = React.useState(providedTextBodyValue);
  const [uncontrolledCaptionValue, setUncontrolledCaptionValue] = React.useState(providedCaptionValue);
  const [uncontrolledLyricsValue, setUncontrolledLyricsValue] = React.useState(providedLyricsValue);
  const [uncontrolledLinkUrlValue, setUncontrolledLinkUrlValue] = React.useState(providedLinkUrlValue);
  const [uncontrolledLinkPreview, setUncontrolledLinkPreview] = React.useState(props.linkPreview);
  const [uncontrolledComposerStep, setUncontrolledComposerStep] = React.useState<ComposerStep>(
    controlledComposerStep ?? "write",
  );
  const [uncontrolledSongMode, setUncontrolledSongMode] = React.useState<NonNullable<PostComposerProps["songMode"]>>(
    songMode ?? "original",
  );
  const [uncontrolledSongState, setUncontrolledSongState] = React.useState<SongComposerState>(
    () => defaultSongState(song),
  );
  const [uncontrolledLicenseState, setUncontrolledLicenseState] = React.useState<AssetLicenseState>(
    () => defaultAssetLicenseState(license),
  );
  const [uncontrolledRoyaltySplitState, setUncontrolledRoyaltySplitState] = React.useState<AssetRoyaltySplitState>(
    () => defaultAssetRoyaltySplitState(royaltySplit, currentUserWalletAddress),
  );
  // The wallet prop may be empty on first mount and load shortly after. Keep the
  // untouched creator default in sync with it, while preserving any user edit
  // (a controlled split, or one that already has collaborators / extra rows).
  React.useEffect(() => {
    if (royaltySplit !== undefined) return;
    setUncontrolledRoyaltySplitState((current) => {
      if (current.allocations.length !== 1) return current;
      const [creator] = current.allocations;
      if (creator.recipientKind !== "creator") return current;
      if ((creator.walletAddress ?? "") === (currentUserWalletAddress ?? "")) return current;
      return { allocations: [{ ...creator, walletAddress: currentUserWalletAddress }] };
    });
  }, [currentUserWalletAddress, royaltySplit]);
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
  const [uncontrolledAgeGatePolicy, setUncontrolledAgeGatePolicy] = React.useState<AuthorAgeGatePolicy>(
    ageGatePolicy ?? "none",
  );
  const [uncontrolledDerivativeState, setUncontrolledDerivativeState] = React.useState<DerivativeStepState | undefined>(
    derivativeStep,
  );
  const [derivativePickerKey, setDerivativePickerKey] = React.useState(0);
  const [liveState, setLiveState] = React.useState<LiveComposerState>(() => defaultLiveComposerState(live));
  const [eventState, setEventState] = React.useState<ComposerEventState>(() => defaultEventState(event));
  const [prevRoomKind, setPrevRoomKind] = React.useState<LiveRoomKind>(liveState.roomKind);
  const titleValue = onTitleValueChange ? providedTitleValue : uncontrolledTitleValue;
  const textBodyValue = onTextBodyValueChange ? providedTextBodyValue : uncontrolledTextBodyValue;
  const captionValue = onCaptionValueChange ? providedCaptionValue : uncontrolledCaptionValue;
  const lyricsValue = onLyricsValueChange ? providedLyricsValue : uncontrolledLyricsValue;
  const linkUrlValue = onLinkUrlValueChange ? providedLinkUrlValue : uncontrolledLinkUrlValue;
  const linkPreview = onLinkPreviewChange ? providedLinkPreview : uncontrolledLinkPreview;
  const activeSongMode = songMode ?? uncontrolledSongMode;
  const composerStep = controlledComposerStep ?? uncontrolledComposerStep;
  const activeImageUpload = imageUpload === undefined ? uncontrolledImageUpload : imageUpload;
  const songState = song ?? uncontrolledSongState;
  const licenseState = license ?? uncontrolledLicenseState;
  const royaltySplitState = royaltySplit ?? uncontrolledRoyaltySplitState;
  const videoState = video ?? uncontrolledVideoState;
  const monetizationState = monetization ?? uncontrolledMonetizationState;
  const charityContributionState = charityContribution ?? uncontrolledCharityContribution;
  const audienceState = audience ?? uncontrolledAudienceState;
  const ageGatePolicyState = ageGatePolicy ?? uncontrolledAgeGatePolicy;
  const derivativeState = derivativeStep ?? uncontrolledDerivativeState;
  const songStateRef = React.useRef(songState);
  const derivativeStateRef = React.useRef(derivativeState);
  songStateRef.current = songState;
  derivativeStateRef.current = derivativeState;

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
    const next = updater(songStateRef.current);
    if (song === undefined) {
      setUncontrolledSongState(next);
    }
    onSongChange?.(next);
  }, [onSongChange, song]);

  const updateLicenseState = React.useCallback((updater: (current: AssetLicenseState) => AssetLicenseState) => {
    const next = updater(licenseState);
    if (license === undefined) {
      setUncontrolledLicenseState(next);
    }
    onLicenseChange?.(next);
  }, [license, licenseState, onLicenseChange]);

  const updateRoyaltySplitState = React.useCallback((
    updater: (current: AssetRoyaltySplitState) => AssetRoyaltySplitState,
  ) => {
    const next = updater(royaltySplitState);
    if (royaltySplit === undefined) {
      setUncontrolledRoyaltySplitState(next);
    }
    onRoyaltySplitChange?.(next);
  }, [onRoyaltySplitChange, royaltySplit, royaltySplitState]);

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

  const setTitleValueWithCallback = React.useCallback((next: string) => {
    if (!onTitleValueChange) {
      setUncontrolledTitleValue(next);
    }
    onTitleValueChange?.(next);
  }, [onTitleValueChange]);

  const setTextBodyValueWithCallback = React.useCallback((next: string) => {
    if (!onTextBodyValueChange) {
      setUncontrolledTextBodyValue(next);
    }
    onTextBodyValueChange?.(next);
  }, [onTextBodyValueChange]);

  const setCaptionValueWithCallback = React.useCallback((next: string) => {
    if (!onCaptionValueChange) {
      setUncontrolledCaptionValue(next);
    }
    onCaptionValueChange?.(next);
  }, [onCaptionValueChange]);

  const setLyricsValueWithCallback = React.useCallback((next: string) => {
    if (!onLyricsValueChange) {
      setUncontrolledLyricsValue(next);
    }
    onLyricsValueChange?.(next);
  }, [onLyricsValueChange]);

  const setLinkUrlValueWithCallback = React.useCallback((next: string) => {
    if (!onLinkUrlValueChange) {
      setUncontrolledLinkUrlValue(next);
    }
    onLinkUrlValueChange?.(next);
  }, [onLinkUrlValueChange]);

  const setLinkPreviewWithCallback = React.useCallback((next: LinkPreviewState | undefined) => {
    if (!onLinkPreviewChange) {
      setUncontrolledLinkPreview(next);
    }
    onLinkPreviewChange?.(next);
  }, [onLinkPreviewChange]);

  const updateDerivativeState = React.useCallback((updater: (current: DerivativeStepState | undefined) => DerivativeStepState | undefined) => {
    const next = updater(derivativeStateRef.current);
    setUncontrolledDerivativeState(next);
    onDerivativeStepChange?.(next);
  }, [onDerivativeStepChange]);

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
          searchError: undefined,
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

  const activeVideoSourceMode = activeTab === "video" && derivativeState?.visible
    && derivativeState.trigger === "uses_song"
    ? "uses_song" as const
    : "original" as const;
  const handleVideoSourceModeChange = React.useCallback((next: "original" | "uses_song") => {
    if (next === "uses_song") {
      updateDerivativeState((current) => ({
        visible: true,
        required: true,
        trigger: "uses_song",
        requirementLabel: current?.requirementLabel,
        searchResults: current?.searchResults ?? [],
        searchError: undefined,
        references: current?.references ?? [],
        licenseSummary: current?.licenseSummary,
        sourceTermsAccepted: current?.sourceTermsAccepted === true,
      }));
      return;
    }

    updateDerivativeState((current) => {
      if (current?.trigger === "uses_song") return undefined;
      return current?.visible ? undefined : current;
    });
  }, [updateDerivativeState]);

  const derivativeRequiresRefs = Boolean(
    derivativeState?.visible
    && (
      derivativeState.required
      || (activeTab === "video" && derivativeState.trigger === "uses_song")
    ),
  );
  const derivativeMissingRefs = Boolean(
    derivativeRequiresRefs && !(derivativeState?.references?.length),
  );
  const derivativeHasReferences = (derivativeState?.references?.length ?? 0) > 0;
  const derivativeMissingSourceTermsAcceptance = Boolean(
    derivativeState?.visible
    && (derivativeRequiresRefs || derivativeHasReferences)
    && derivativeHasReferences
    && derivativeState.sourceTermsAccepted !== true,
  );
  const contentBlocked = derivativeMissingRefs || derivativeMissingSourceTermsAcceptance;
  const continueDisabled = baseContinueDisabled || contentBlocked;
  const postDisabled = basePostDisabled || contentBlocked;

  const setComposerStepWithCallback = React.useCallback((next: ComposerStep) => {
    if (controlledComposerStep === undefined) {
      setUncontrolledComposerStep(next);
    }
    onComposerStepChange?.(next);
  }, [controlledComposerStep, onComposerStepChange]);

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

  const setAgeGatePolicyWithCallback = React.useCallback((next: AuthorAgeGatePolicy) => {
    if (ageGatePolicy === undefined) {
      setUncontrolledAgeGatePolicy(next);
    }
    onAgeGatePolicyChange?.(next);
  }, [ageGatePolicy, onAgeGatePolicyChange]);

  const setLiveStateWithCallback = React.useCallback((next: LiveComposerState) => {
    setLiveState(next);
    onLiveChange?.(next);
  }, [onLiveChange]);

  const setEventStateWithCallback = React.useCallback((next: ComposerEventState) => {
    setEventState(next);
    onEventChange?.(next);
  }, [onEventChange]);

  React.useEffect(() => {
    const nextLiveState = deriveLiveStateForRoomKindChange({
      current: liveState,
      previousRoomKind: prevRoomKind,
    });
    if (nextLiveState) {
      setLiveStateWithCallback(nextLiveState);
      setPrevRoomKind(liveState.roomKind);
    }
  }, [liveState, prevRoomKind, setLiveStateWithCallback]);

  React.useEffect(() => {
    if (visibleTabs.includes(mode)) {
      setActiveTab(mode);
      return;
    }

    setActiveTab(visibleTabs[0] ?? "text");
  }, [mode, visibleTabs]);

  React.useEffect(() => {
    if (!onTitleValueChange) setUncontrolledTitleValue(providedTitleValue);
  }, [onTitleValueChange, providedTitleValue]);

  React.useEffect(() => {
    if (!onTextBodyValueChange) setUncontrolledTextBodyValue(providedTextBodyValue);
  }, [onTextBodyValueChange, providedTextBodyValue]);

  React.useEffect(() => {
    if (!onCaptionValueChange) setUncontrolledCaptionValue(providedCaptionValue);
  }, [onCaptionValueChange, providedCaptionValue]);

  React.useEffect(() => {
    if (!onLyricsValueChange) setUncontrolledLyricsValue(providedLyricsValue);
  }, [onLyricsValueChange, providedLyricsValue]);

  React.useEffect(() => {
    if (!onLinkUrlValueChange) setUncontrolledLinkUrlValue(providedLinkUrlValue);
  }, [onLinkUrlValueChange, providedLinkUrlValue]);

  React.useEffect(() => {
    if (!onLinkPreviewChange) setUncontrolledLinkPreview(props.linkPreview);
  }, [onLinkPreviewChange, props.linkPreview]);

  React.useEffect(() => {
    setDerivativePickerKey(0);
  }, [derivativeStep]);

  React.useEffect(() => {
    setAuthorMode(identity?.authorMode ?? "human");
  }, [identity?.authorMode]);

  React.useEffect(() => {
    if (live) {
      setLiveState(live);
    }
  }, [live]);

  React.useEffect(() => {
    if (event) {
      setEventState(defaultEventState(event));
    }
  }, [event]);

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
    activeTab === "song"
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
      ageGatePolicy: ageGatePolicyState,
      setAgeGatePolicy: setAgeGatePolicyWithCallback,
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
      regionalPricingPreview,
      updateMonetizationState,
    },
    community: {
      avatarSrc: clubAvatarSrc,
      emptyLabel: communityPickerEmptyLabel ?? routesCopy.common.noRecentCommunities,
      items: communityPickerItems,
      name: clubName,
      onSelect: onSelectCommunity,
      pickerSearchPlaceholder: routesCopy.common.searchCommunities,
      pickerTitle: routesCopy.common.chooseCommunity,
    },
    copy,
    fields: {
      captionValue,
      linkPreview,
      linkUrlValue,
      lyricsValue,
      onCaptionValueChange: setCaptionValueWithCallback,
      onLinkPreviewChange: setLinkPreviewWithCallback,
      onLinkUrlValueChange: setLinkUrlValueWithCallback,
      onLyricsValueChange: setLyricsValueWithCallback,
      onTextBodyValueChange: setTextBodyValueWithCallback,
      onTitleValueChange: setTitleValueWithCallback,
      textBodyValue,
      titleValue,
    },
    identity: {
      authorMode,
      identity,
      identityMode,
      publicAvatarSrc: identity?.publicAvatarSrc,
      publicAvatarSeed: identity?.publicAvatarSeed,
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
    royaltySplit: {
      state: royaltySplitState,
      update: updateRoyaltySplitState,
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
      activeVideoSourceMode,
      derivativePickerKey,
      derivativeSearchResults,
      derivativeState,
      handleSongModeChange,
      handleVideoSourceModeChange,
      liveState,
      setLiveState: setLiveStateWithCallback,
      updateDerivativeState,
    },
    event: {
      searchPlaces: onSearchEventPlaces,
      state: eventState,
      update: setEventStateWithCallback,
    },
    song: {
      state: songState,
      update: updateSongState,
    },
    submit: {
      continueDisabled,
      disabled: composerStep !== "write"
        ? postDisabled
        : continueDisabled,
      error: composerStep !== "write" ? submitError : null,
      label: submitLabel ?? copy.actions.post,
      loading: submitLoading,
      mobileEnabled: Boolean(submit),
      onSubmit,
      postDisabled,
      progress: composerStep !== "write" ? submitProgress : null,
    },
    step: {
      current: composerStep,
      isPublishStep: composerStep === "publish",
      isSettingsStep: composerStep === "settings",
      isDetailsStep: composerStep === "details",
      isWriteStep: composerStep === "write",
      set: setComposerStepWithCallback,
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
