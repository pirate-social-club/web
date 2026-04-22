"use client";

import * as React from "react";

import { FlatTabsList, FlatTabsTrigger } from "@/components/compositions/flat-tabs/flat-tabs";
import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/primitives/card";
import { FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Tabs } from "@/components/primitives/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";

import type {
  AuthorMode,
  CharityContributionState,
  CommunityCharityPartner,
  ComposerAudienceState,
  ComposerTab,
  DerivativeStepState,
  IdentityMode,
  LiveComposerState,
  LiveRoomKind,
  MonetizationState,
  PostComposerProps,
  SongComposerState,
} from "./post-composer.types";
import {
  tabMeta,
  defaultTabs,
  anonymousEligibleTabs,
  defaultAudienceState,
  defaultSongState,
  defaultMonetizationState,
  defaultCharityContributionState,
} from "./post-composer-config";
import {
  ShellPill,
  FieldLabel,
} from "./post-composer-fields";
import { PostComposerPrimaryArea } from "./post-composer-content";
import { IdentitySection, QualifierSection } from "./post-composer-identity-section";
import {
  PostComposerDerivativeSection,
  PostComposerAudienceSection,
  PostComposerSongAccessSection,
  PostComposerCharitySection,
  deriveDerivativeSearchResults,
} from "./post-composer-sections";

function deriveSelectedQualifierIds(
  identity: NonNullable<PostComposerProps["identity"]>,
): string[] {
  return identity.selectedQualifierIds ?? [];
}

export function PostComposer(props: PostComposerProps) {
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
  const submitDisabled = submit?.disabled ?? props.submitDisabled ?? false;
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
  const [liveState, setLiveState] = React.useState<LiveComposerState>(
    live ?? {
      roomKind: "solo",
      accessMode: "free",
      visibility: "public",
      setlistItems: [],
      setlistStatus: "draft",
      performerAllocations: [{ userId: "", role: "host", sharePct: 100 }],
    },
  );
  const [prevRoomKind, setPrevRoomKind] = React.useState<LiveRoomKind>(liveState.roomKind);
  const activeSongMode = songMode ?? uncontrolledSongMode;
  const activeImageUpload = imageUpload === undefined ? uncontrolledImageUpload : imageUpload;
  const songState = song ?? uncontrolledSongState;
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
    if (liveState.roomKind !== prevRoomKind) {
      const hostAlloc = liveState.performerAllocations.find((a) => a.role === "host");
      if (liveState.roomKind === "solo") {
        setLiveState({
          ...liveState,
          performerAllocations: [{ ...hostAlloc!, sharePct: 100 }],
          guestUserId: undefined,
        });
      } else if (liveState.roomKind === "duet") {
        setLiveState({
          ...liveState,
          performerAllocations: [
            { ...hostAlloc!, sharePct: 50 },
            { userId: "", role: "guest", sharePct: 50 },
          ],
        });
      }
      setPrevRoomKind(liveState.roomKind);
    }
  }, [liveState.roomKind]);

  React.useEffect(() => {
    if (visibleTabs.includes(mode)) {
      setActiveTab(mode);
      return;
    }

    setActiveTab(visibleTabs[0] ?? "text");
  }, [mode, visibleTabs]);

  React.useEffect(() => {
    setUncontrolledSongMode(songMode ?? "original");
  }, [songMode]);

  React.useEffect(() => {
    setUncontrolledSongState(defaultSongState(song));
  }, [song]);

  React.useEffect(() => {
    setUncontrolledImageUpload(imageUpload ?? null);
  }, [imageUpload]);

  React.useEffect(() => {
    setUncontrolledMonetizationState(defaultMonetizationState(monetization));
  }, [monetization]);

  React.useEffect(() => {
    setUncontrolledCharityContribution(defaultCharityContributionState(charityContribution));
  }, [charityContribution]);

  React.useEffect(() => {
    setUncontrolledAudienceState(defaultAudienceState(audience));
  }, [audience]);

  React.useEffect(() => {
    setUncontrolledDerivativeState(derivativeStep);
    setDerivativePickerKey(0);
  }, [derivativeStep]);

  React.useEffect(() => {
    setAuthorMode(identity?.authorMode ?? "human");
  }, [identity?.authorMode]);

  React.useEffect(() => {
    if (derivativeState?.required && activeSongMode !== "remix") {
      setSongModeWithCallback("remix");
    }
  }, [activeSongMode, derivativeState?.required, setSongModeWithCallback]);

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
    if (!anonymousEligibleTabs.includes(activeTab) && identityMode === "anonymous") {
      setIdentityModeWithCallback("public");
    }
  }, [activeTab, identityMode, setIdentityModeWithCallback]);

  React.useEffect(() => {
    if (authorMode === "agent" && identityMode !== "public") {
      setIdentityModeWithCallback("public");
    }
  }, [authorMode, identityMode, setIdentityModeWithCallback]);

  React.useEffect(() => {
    if (authorMode === "agent" && selectedQualifierIds.length > 0) {
      setSelectedQualifierIdsWithCallback([]);
      return;
    }
    if (identityMode === "anonymous" && identity?.allowQualifiersOnAnonymousPosts === false) {
      setSelectedQualifierIdsWithCallback([]);
    }
  }, [authorMode, identity?.allowQualifiersOnAnonymousPosts, identityMode, selectedQualifierIds.length, setSelectedQualifierIdsWithCallback]);

  React.useEffect(() => {
    if (identityMode !== "anonymous" && selectedQualifierIds.length > 0) {
      setSelectedQualifierIdsWithCallback([]);
    }
  }, [identityMode, selectedQualifierIds, setSelectedQualifierIdsWithCallback]);

  const shouldShowDerivativeStep = Boolean(
    (derivativeState?.visible || (activeTab === "song" && activeSongMode === "remix")),
  );
  const derivativeSearchResults = React.useMemo(
    () => deriveDerivativeSearchResults(derivativeState),
    [derivativeState],
  );
  const orderedVisibleTabs = React.useMemo(
    () => (isRtl ? [...visibleTabs].reverse() : visibleTabs),
    [isRtl, visibleTabs],
  );
  const useEqualWidthMobileTabs = isMobile && orderedVisibleTabs.length <= 4;
  const tabLabels: Record<ComposerTab, string> = {
    text: copy.tabs.text,
    image: copy.tabs.image,
    video: copy.tabs.video,
    link: copy.tabs.link,
    song: copy.tabs.song,
    live: copy.tabs.live,
  };

  return (
    <div className={cn("w-full space-y-4", isMobile && "space-y-5")}>
      {!isMobile ? <CardTitle className="text-3xl">{copy.title}</CardTitle> : null}

      <div className={cn("flex flex-wrap items-center justify-between gap-3", isMobile && "w-full")}>
        <ShellPill
          avatarSrc={clubAvatarSrc}
          className={cn(isMobile && "h-14 w-full justify-between rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3")}
          communities={communityPickerItems}
          emptyLabel={communityPickerEmptyLabel ?? routesCopy.common.noRecentCommunities}
          onSelectCommunity={onSelectCommunity}
        >
          {clubName}
        </ShellPill>
      </div>

      <Card className={cn("overflow-hidden bg-background shadow-none", isMobile && "border-0 bg-transparent")}>
        <CardHeader className={cn("border-b border-border-soft px-0 pb-0 pt-0", isMobile && "border-b-0")}>
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              const nextTab = value as ComposerTab;
              setActiveTab(nextTab);
              onModeChange?.(nextTab);
            }}
          >
            <FlatTabsList
              className={cn(isMobile && "border-b-0")}
              columns={useEqualWidthMobileTabs ? orderedVisibleTabs.length : undefined}
              isRtl={isRtl}
            >
              {orderedVisibleTabs.map((tab) => (
                <FlatTabsTrigger
                  key={tab}
                  value={tab}
                  className={cn(
                    "px-5",
                    isMobile && "px-4 py-3 whitespace-nowrap",
                    useEqualWidthMobileTabs && "min-w-0 px-1",
                  )}
                >
                  <span className={cn("inline-flex items-center gap-2", useEqualWidthMobileTabs && "min-w-0")}>
                    {tabMeta[tab].icon}
                    <span className={cn(useEqualWidthMobileTabs && "truncate")}>{tabLabels[tab]}</span>
                  </span>
                </FlatTabsTrigger>
              ))}
            </FlatTabsList>
          </Tabs>
        </CardHeader>

        <CardContent className={cn("space-y-5 p-5", isMobile && "space-y-5 px-0 pb-0 pt-3")}>
          <>
          {activeTab !== "link" ? (
            <div>
              <FieldLabel label={copy.fields.title} />
              <Input
                className="h-14"
                maxLength={300}
                onChange={(event) => onTitleValueChange?.(event.target.value)}
                placeholder={copy.placeholders.title}
                value={titleValue}
              />
            </div>
          ) : null}

          <PostComposerPrimaryArea
            activeSongMode={activeSongMode}
            activeTab={activeTab}
            captionValue={captionValue}
            copy={copy}
            derivativeState={derivativeState}
            imageUploadLabel={activeImageUpload?.name ?? imageUploadLabel}
            linkUrlValue={linkUrlValue}
            liveState={liveState}
            lyricsValue={lyricsValue}
            onCaptionValueChange={onCaptionValueChange}
            onImageUploadChange={setImageUploadWithCallback}
            onLinkUrlValueChange={onLinkUrlValueChange}
            onLyricsValueChange={onLyricsValueChange}
            onTextBodyValueChange={onTextBodyValueChange}
            setLiveState={setLiveState}
            setSongModeWithCallback={setSongModeWithCallback}
            songState={songState}
            textBodyValue={textBodyValue}
            updateSongState={updateSongState}
          />

          {shouldShowDerivativeStep ? (
            <PostComposerDerivativeSection
              copy={copy}
              derivativePickerKey={derivativePickerKey}
              derivativeSearchResults={derivativeSearchResults}
              derivativeState={derivativeState}
              onAdvancePicker={() => setDerivativePickerKey((current) => current + 1)}
              updateDerivativeState={updateDerivativeState}
            />
          ) : null}

          {activeTab === "song" ? (
            <PostComposerSongAccessSection
              copy={copy}
              monetizationState={monetizationState}
              songState={songState}
              updateMonetizationState={updateMonetizationState}
              updateSongState={updateSongState}
            />
          ) : null}

          {activeTab === "song" && monetizationState.visible && charityPartner ? (
            <PostComposerCharitySection
              charityContribution={charityContributionState}
              charityPartner={charityPartner}
              copy={copy}
              updateCharityContribution={updateCharityContributionState}
            />
          ) : null}

          {Boolean(identity?.availableQualifiers?.some((q) => !q.suppressedByClubGate)) &&
            authorMode !== "agent" &&
            identityMode === "anonymous" &&
            identity?.allowQualifiersOnAnonymousPosts !== false &&
            identity ? (
            <QualifierSection
              identity={identity}
              onSelectedQualifierIdsChange={setSelectedQualifierIdsWithCallback}
              selectedQualifierIds={selectedQualifierIds}
            />
          ) : null}
          </>
        </CardContent>

        <CardFooter className={cn("flex-wrap justify-between gap-3 border-t border-border-soft p-5", isMobile && "border-t-0 px-0 pb-0 pt-1")}>
          <div className="flex flex-wrap items-center gap-3">
            {(Boolean(identity?.agentLabel) || (Boolean(identity?.allowAnonymousIdentity) && anonymousEligibleTabs.includes(activeTab))) && identity ? (
              <IdentitySection
                authorMode={authorMode}
                identity={identity}
                identityMode={identityMode}
                onAuthorModeChange={setAuthorModeWithCallback}
                onIdentityModeChange={setIdentityModeWithCallback}
              />
            ) : null}
            {activeTab !== "live" ? (
              <PostComposerAudienceSection
                audience={audienceState}
                copy={copy}
                updateAudience={updateAudienceState}
              />
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {submitError ? <FormNote tone="warning">{submitError}</FormNote> : null}
            <Button
              disabled={submitDisabled}
              loading={submitLoading}
              onClick={onSubmit}
            >
              {submitLabel ?? copy.actions.post}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
