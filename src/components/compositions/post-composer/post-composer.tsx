"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/primitives/card";
import { FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { cn } from "@/lib/utils";

import type {
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
  defaultSongState,
  defaultMonetizationState,
} from "./post-composer-config";
import {
  ShellPill,
  FieldLabel,
} from "./post-composer-fields";
import { PostComposerPrimaryArea } from "./post-composer-content";
import {
  PostComposerDerivativeSection,
  PostComposerIdentitySections,
  PostComposerSongAccessSection,
  deriveDerivativeSearchResults,
} from "./post-composer-sections";

function deriveSelectedQualifierIds(
  identity: NonNullable<PostComposerProps["identity"]>,
): string[] {
  return identity.selectedQualifierIds ?? [];
}

export function PostComposer({
  clubName,
  clubAvatarSrc,
  communityPickerItems,
  communityPickerEmptyLabel,
  onSelectCommunity,
  mode,
  availableTabs = defaultTabs,
  canCreateSongPost = false,
  titleValue = "",
  titleCountLabel = "0/300",
  onTitleValueChange,
  textBodyValue = "",
  onTextBodyValueChange,
  captionValue = "",
  onCaptionValueChange,
  lyricsValue = "",
  onLyricsValueChange,
  linkUrlValue = "",
  onLinkUrlValueChange,
  linkPreview,
  songMode,
  song,
  onSongChange,
  onSongModeChange,
  onModeChange,
  derivativeStep,
  onDerivativeStepChange,
  monetization,
  onMonetizationChange,
  identity,
  onIdentityModeChange,
  onSelectedQualifierIdsChange,
  live,
  onSubmit,
  submitDisabled = false,
  submitError = null,
  submitLabel = "Post",
  submitLoading = false,
}: PostComposerProps) {
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
  const [identityMode, setIdentityMode] = React.useState<IdentityMode>(
    identity?.identityMode ?? "public",
  );
  const [selectedQualifierIds, setSelectedQualifierIds] = React.useState<string[]>(
    identity ? deriveSelectedQualifierIds(identity) : [],
  );
  const [uncontrolledMonetizationState, setUncontrolledMonetizationState] = React.useState<MonetizationState>(
    () => defaultMonetizationState(monetization),
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
  const songState = song ?? uncontrolledSongState;
  const monetizationState = monetization ?? uncontrolledMonetizationState;
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
    setUncontrolledMonetizationState(defaultMonetizationState(monetization));
  }, [monetization]);

  React.useEffect(() => {
    setUncontrolledDerivativeState(derivativeStep);
    setDerivativePickerKey(0);
  }, [derivativeStep]);

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
    if (identityMode === "anonymous" && identity?.allowQualifiersOnAnonymousPosts === false) {
      setSelectedQualifierIdsWithCallback([]);
    }
  }, [identity?.allowQualifiersOnAnonymousPosts, identityMode, setSelectedQualifierIdsWithCallback]);

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

  return (
    <div className="w-full space-y-4">
      <CardTitle className="text-3xl">Create post</CardTitle>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ShellPill
          avatarSrc={clubAvatarSrc}
          communities={communityPickerItems}
          emptyLabel={communityPickerEmptyLabel}
          onSelectCommunity={onSelectCommunity}
        >
          {clubName}
        </ShellPill>
      </div>

      <Card className="overflow-hidden bg-background shadow-none">
        <CardHeader className="border-b border-border-soft px-0 pb-0 pt-0">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              const nextTab = value as ComposerTab;
              setActiveTab(nextTab);
              onModeChange?.(nextTab);
            }}
          >
            <TabsList className="h-auto w-full justify-start rounded-none border-b border-border-soft bg-transparent p-0">
              {visibleTabs.map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className={cn(
                    "rounded-none border-b-2 border-transparent px-5 py-4 text-base font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    {tabMeta[tab].icon}
                    {tabMeta[tab].label}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="space-y-5 p-5">
          <>
          <div>
            <FieldLabel counter={titleCountLabel} label="Title" />
            <Input
              className="h-14"
              onChange={(event) => onTitleValueChange?.(event.target.value)}
              placeholder="Title"
              value={titleValue}
            />
          </div>

          <PostComposerIdentitySections
            activeTab={activeTab}
            anonymousEligibleTabs={anonymousEligibleTabs}
            identity={identity}
            identityMode={identityMode}
            onIdentityModeChange={setIdentityModeWithCallback}
            onSelectedQualifierIdsChange={setSelectedQualifierIdsWithCallback}
            selectedQualifierIds={selectedQualifierIds}
          />

          <PostComposerPrimaryArea
            activeSongMode={activeSongMode}
            activeTab={activeTab}
            captionValue={captionValue}
            derivativeState={derivativeState}
            linkPreview={linkPreview}
            linkUrlValue={linkUrlValue}
            liveState={liveState}
            lyricsValue={lyricsValue}
            onCaptionValueChange={onCaptionValueChange}
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
              derivativePickerKey={derivativePickerKey}
              derivativeSearchResults={derivativeSearchResults}
              derivativeState={derivativeState}
              onAdvancePicker={() => setDerivativePickerKey((current) => current + 1)}
              updateDerivativeState={updateDerivativeState}
            />
          ) : null}

          {activeTab === "song" ? (
            <PostComposerSongAccessSection
              monetizationState={monetizationState}
              updateMonetizationState={updateMonetizationState}
            />
          ) : null}
          </>
        </CardContent>

        <CardFooter className="justify-end gap-3 border-t border-border-soft p-5">
          {submitError ? <FormNote tone="warning">{submitError}</FormNote> : null}
          <Button
            disabled={submitDisabled}
            loading={submitLoading}
            onClick={onSubmit}
          >
            {submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
