"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/primitives/card";
import { Checkbox } from "@/components/primitives/checkbox";
import { FormNote, FormSectionHeading } from "@/components/primitives/form-layout";
import { OptionCard } from "@/components/primitives/option-card";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
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
  noneLanguageValue,
  songGenreOptions,
  songLanguageOptions,
  fallbackSourceOptions,
  defaultSongState,
  defaultMonetizationState,
} from "./post-composer-config";
import {
  ShellPill,
  FieldLabel,
  UploadField,
  LabeledFormattedTextarea,
  LabeledTextarea,
  EditorChrome,
  LinkPreviewCard,
} from "./post-composer-fields";
import {
  References,
  dedupeReferences,
  SearchReferencePicker,
  SelectedReferenceCard,
} from "./post-composer-references";
import { LiveTabContent } from "./post-composer-live-tab";
import { IdentitySection, QualifierSection } from "./post-composer-identity-section";

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
    () =>
      dedupeReferences([
        ...(derivativeState?.searchResults ?? []),
        ...(derivativeState?.references ?? []),
        ...fallbackSourceOptions,
      ]),
    [derivativeState?.references, derivativeState?.searchResults],
  );
  const liveAllocationsValid =
    liveState.performerAllocations.reduce((sum, allocation) => sum + allocation.sharePct, 0) ===
    100;
  const postDisabled =
    (activeTab === "song" &&
      monetizationState.visible &&
      !Boolean(monetizationState.rightsAttested)) ||
    (activeTab === "live" && !liveAllocationsValid);
  const shouldShowIdentity =
    Boolean(identity?.allowAnonymousIdentity) && anonymousEligibleTabs.includes(activeTab);
  const shouldShowQualifiers =
    Boolean(identity) &&
    Boolean(identity?.availableQualifiers?.some((qualifier) => !qualifier.suppressedByClubGate)) &&
    identityMode === "anonymous" &&
    identity?.allowQualifiersOnAnonymousPosts !== false;

  const renderPrimaryArea = () => {
    switch (activeTab) {
      case "text":
        return (
          <div>
            <FieldLabel label="Body" />
            <EditorChrome onChange={onTextBodyValueChange} value={textBodyValue} />
          </div>
        );
      case "image":
        return (
          <div className="space-y-3">
            <UploadField accept="image/*" label="Image" />
            <LabeledTextarea
              className="min-h-28"
              defaultValue={captionValue}
              label="Caption"
              placeholder="Add a caption"
            />
          </div>
        );
      case "video":
        return (
          <div className="space-y-3">
            <UploadField accept="video/*" label="Video" />
            <LabeledTextarea
              className="min-h-28"
              defaultValue={captionValue}
              label="Caption"
              placeholder="Add a caption"
            />
          </div>
        );
      case "link":
        return (
          <div className="space-y-3">
            <div>
              <FieldLabel label="URL" />
              <Input
                className="h-14"
                onChange={(event) => onLinkUrlValueChange?.(event.target.value)}
                placeholder="https://"
                value={linkUrlValue}
              />
            </div>
            <LabeledFormattedTextarea
              className="min-h-28"
              label="Commentary"
              onChange={onCaptionValueChange}
              placeholder="Add commentary"
              value={captionValue}
            />
            {linkPreview ? <LinkPreviewCard {...linkPreview} /> : null}
          </div>
        );
      case "song":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-full bg-muted p-1">
              {(["original", "remix"] as const).map((value) => (
                <button
                  key={value}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-base font-medium capitalize transition-colors",
                    activeSongMode === value
                      ? "bg-card text-foreground shadow-sm"
                      : derivativeState?.required && value === "original"
                        ? "cursor-not-allowed text-muted-foreground/50"
                        : "text-muted-foreground",
                  )}
                  onClick={() => {
                    if (derivativeState?.required && value === "original") {
                      return;
                    }
                    setSongModeWithCallback(value);
                  }}
                  disabled={Boolean(derivativeState?.required && value === "original")}
                  type="button"
                >
                  {value}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <UploadField
                accept="audio/*"
                label="Audio"
                onChange={(files) =>
                  updateSongState((current) => ({
                    ...current,
                    primaryAudioUpload: files?.[0] ?? null,
                    primaryAudioLabel: files?.[0]?.name ?? current.primaryAudioLabel,
                  }))
                }
                selectedLabel={songState.primaryAudioUpload?.name ?? songState.primaryAudioLabel}
              />
              <UploadField
                accept="image/*"
                label="Cover art"
                onChange={(files) =>
                  updateSongState((current) => ({
                    ...current,
                    coverUpload: files?.[0] ?? null,
                    coverLabel: files?.[0]?.name ?? current.coverLabel,
                  }))
                }
                selectedLabel={songState.coverUpload?.name ?? songState.coverLabel}
                variant="artwork"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <UploadField
                  accept="audio/*"
                  label="Instrumental stem"
                  onChange={(files) =>
                    updateSongState((current) => ({
                      ...current,
                      instrumentalAudioUpload: files?.[0] ?? null,
                      instrumentalAudioLabel: files?.[0]?.name ?? current.instrumentalAudioLabel,
                    }))
                  }
                  selectedLabel={songState.instrumentalAudioUpload?.name ?? songState.instrumentalAudioLabel}
                />
                <UploadField
                  accept="audio/*"
                  label="Vocal stem"
                  onChange={(files) =>
                    updateSongState((current) => ({
                      ...current,
                      vocalAudioUpload: files?.[0] ?? null,
                      vocalAudioLabel: files?.[0]?.name ?? current.vocalAudioLabel,
                    }))
                  }
                  selectedLabel={songState.vocalAudioUpload?.name ?? songState.vocalAudioLabel}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <UploadField
                  accept="audio/*"
                  label="Preview clip"
                  onChange={(files) =>
                    updateSongState((current) => ({
                      ...current,
                      previewAudioUpload: files?.[0] ?? null,
                      previewAudioLabel: files?.[0]?.name ?? current.previewAudioLabel,
                    }))
                  }
                  selectedLabel={songState.previewAudioUpload?.name ?? songState.previewAudioLabel}
                />
                <UploadField
                  accept="video/*"
                  label="Canvas video"
                  onChange={(files) =>
                    updateSongState((current) => ({
                      ...current,
                      canvasVideoUpload: files?.[0] ?? null,
                      canvasVideoLabel: files?.[0]?.name ?? current.canvasVideoLabel,
                    }))
                  }
                  selectedLabel={songState.canvasVideoUpload?.name ?? songState.canvasVideoLabel}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <FieldLabel label="Genre" />
                <Select
                  onValueChange={(value) =>
                    updateSongState((current) => ({ ...current, genre: value }))
                  }
                  value={songState.genre}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {songGenreOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <FieldLabel label="Primary language" />
                <Select
                  onValueChange={(value) =>
                    updateSongState((current) => ({ ...current, primaryLanguage: value }))
                  }
                  value={songState.primaryLanguage}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {songLanguageOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <FieldLabel label="Secondary language" />
                <Select
                  onValueChange={(value) =>
                    updateSongState((current) => ({
                      ...current,
                      secondaryLanguage: value === noneLanguageValue ? "" : value,
                    }))
                  }
                  value={songState.secondaryLanguage || noneLanguageValue}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={noneLanguageValue}>None</SelectItem>
                    {songLanguageOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <LabeledTextarea
              className="min-h-36"
              label="Lyrics"
              onChange={onLyricsValueChange}
              placeholder="Paste lyrics"
              value={lyricsValue}
            />

          </div>
        );
      case "live":
        return <LiveTabContent live={liveState} onLiveChange={setLiveState} />;
      default:
        return null;
    }
  };

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

          {shouldShowIdentity ? (
            <IdentitySection
              identity={identity!}
              identityMode={identityMode}
              onIdentityModeChange={setIdentityModeWithCallback}
            />
          ) : null}

          {shouldShowQualifiers ? (
            <QualifierSection
              identity={identity!}
              onSelectedQualifierIdsChange={setSelectedQualifierIdsWithCallback}
              selectedQualifierIds={selectedQualifierIds}
            />
          ) : null}

          {renderPrimaryArea()}

          {shouldShowDerivativeStep ? (
            <section className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
              <FormSectionHeading title="Source track" />
              <SearchReferencePicker
                ariaLabel="Search source tracks"
                emptyLabel="No source tracks found."
                items={derivativeSearchResults}
                onSelect={(reference) => {
                  updateDerivativeState((current) => ({
                    visible: true,
                    trigger: current?.trigger ?? "remix",
                    requirementLabel: current?.requirementLabel,
                    required: current?.required,
                    searchResults: current?.searchResults,
                    references: dedupeReferences([...(current?.references ?? []), reference]),
                  }));
                  setDerivativePickerKey((current) => current + 1);
                }}
                placeholder="Search Pirate / Story assets"
                resetKey={derivativePickerKey}
              />
              {derivativeState?.requirementLabel ? (
                <div className="rounded-[var(--radius-lg)] bg-muted px-4 py-3 text-base text-foreground">
                  {derivativeState.requirementLabel}
                </div>
              ) : null}
              {derivativeState?.references?.length ? (
                <div className="space-y-2">
                  {derivativeState.references.map((reference) => (
                    <SelectedReferenceCard
                      key={reference.id}
                      item={reference}
                      onClear={() => {
                        updateDerivativeState((current) => {
                          if (!current) {
                            return current;
                          }
                          return {
                            ...current,
                            references: (current.references ?? []).filter((item) => item.id !== reference.id),
                          };
                        });
                      }}
                    />
                  ))}
                </div>
              ) : (
                <References items={derivativeState?.references} />
              )}
            </section>
          ) : null}

          {activeTab === "song" ? (
            <section className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
              <FormSectionHeading title="Access" />
              <div className="grid gap-3 md:grid-cols-2">
                <OptionCard
                  description="Anyone can play the full track."
                  onClick={() =>
                    updateMonetizationState((current) => ({
                      ...current,
                      visible: false,
                      regionalPricingEnabled: false,
                    }))
                  }
                  selected={!monetizationState.visible}
                  title="Public"
                />
                <OptionCard
                  description="Preview in feed. Full track unlocks after purchase."
                  onClick={() =>
                    updateMonetizationState((current) => ({
                      ...current,
                      visible: true,
                    }))
                  }
                  selected={monetizationState.visible}
                  title="Paid unlock"
                />
              </div>

              {monetizationState.visible ? (
                <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel label="Unlock price (USD)" />
                      <Input
                        className="h-12"
                        inputMode="decimal"
                        onChange={(event) =>
                          updateMonetizationState((current) => ({
                            ...current,
                            priceUsd: event.target.value,
                          }))
                        }
                        placeholder="1.00"
                        value={monetizationState.priceUsd ?? ""}
                      />
                    </div>

                    {monetizationState.regionalPricingAvailable ? (
                      <div className="rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={monetizationState.regionalPricingEnabled}
                            className="mt-0.5"
                            id="regional-pricing"
                            onCheckedChange={(next) =>
                              updateMonetizationState((current) => ({
                                ...current,
                                regionalPricingEnabled: next === true,
                              }))
                            }
                          />
                          <div className="space-y-1">
                            <Label htmlFor="regional-pricing">Use community regional pricing</Label>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-start gap-3 border-t border-border-soft pt-4">
                    <Checkbox
                      checked={monetizationState.rightsAttested}
                      className="mt-0.5"
                      id="rights-attested"
                      onCheckedChange={(next) =>
                        updateMonetizationState((current) => ({
                          ...current,
                          rightsAttested: next === true,
                        }))
                      }
                    />
                    <div className="space-y-1">
                      <Label htmlFor="rights-attested">
                        I have the rights to publish and monetize this track.
                      </Label>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
          </>
        </CardContent>

        <CardFooter className="justify-end gap-3 border-t border-border-soft p-5">
          {submitError ? <FormNote tone="warning">{submitError}</FormNote> : null}
          <Button
            disabled={postDisabled || submitDisabled}
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
