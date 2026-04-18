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
import { Scrubber } from "@/components/primitives/scrubber";
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
  licenseOptions,
  fallbackSourceOptions,
  allowsCommercialUse,
  formatLicenseLabel,
  defaultSongState,
  defaultMonetizationState,
  resolveDonationPartnerName,
} from "./post-composer-config";
import {
  ShellPill,
  FieldLabel,
  UploadField,
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
import { LiveTabContent, SummaryRow } from "./post-composer-live-tab";
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
  lyricsValue = "",
  onLyricsValueChange,
  linkUrlValue = "",
  linkPreview,
  songMode = "original",
  song,
  onSongChange,
  onSongModeChange,
  onModeChange,
  derivativeStep,
  onDerivativeStepChange,
  monetization,
  onMonetizationChange,
  identity,
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
  const [activeSongMode, setActiveSongMode] = React.useState(songMode);
  const [songState, setSongState] = React.useState<SongComposerState>(defaultSongState(song));
  const [identityMode, setIdentityMode] = React.useState<IdentityMode>(
    identity?.identityMode ?? "public",
  );
  const [selectedQualifierIds, setSelectedQualifierIds] = React.useState<string[]>(
    identity ? deriveSelectedQualifierIds(identity) : [],
  );
  const [monetizationState, setMonetizationState] = React.useState<MonetizationState>(
    defaultMonetizationState(monetization),
  );
  const [derivativeState, setDerivativeState] = React.useState<DerivativeStepState | undefined>(
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

  const updateSongState = React.useCallback((updater: (current: SongComposerState) => SongComposerState) => {
    setSongState((current) => {
      const next = updater(current);
      onSongChange?.(next);
      return next;
    });
  }, [onSongChange]);

  const updateDerivativeState = React.useCallback((updater: (current: DerivativeStepState | undefined) => DerivativeStepState | undefined) => {
    setDerivativeState((current) => {
      const next = updater(current);
      onDerivativeStepChange?.(next);
      return next;
    });
  }, [onDerivativeStepChange]);

  const updateMonetizationState = React.useCallback((updater: (current: MonetizationState) => MonetizationState) => {
    setMonetizationState((current) => {
      const next = updater(current);
      onMonetizationChange?.(next);
      return next;
    });
  }, [onMonetizationChange]);

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
    setActiveSongMode(songMode);
  }, [songMode]);

  React.useEffect(() => {
    onModeChange?.(activeTab);
  }, [activeTab, onModeChange]);

  React.useEffect(() => {
    setSongState(defaultSongState(song));
  }, [song]);

  React.useEffect(() => {
    setMonetizationState(defaultMonetizationState(monetization));
  }, [monetization]);

  React.useEffect(() => {
    onMonetizationChange?.(monetizationState);
  }, [monetizationState, onMonetizationChange]);

  React.useEffect(() => {
    setDerivativeState(derivativeStep);
    setDerivativePickerKey(0);
  }, [derivativeStep]);

  React.useEffect(() => {
    if (derivativeState?.required && activeSongMode !== "remix") {
      setActiveSongMode("remix");
      onSongModeChange?.("remix");
    }
  }, [activeSongMode, derivativeState?.required, onSongModeChange]);

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
      setIdentityMode("public");
    }
  }, [activeTab, identityMode]);

  React.useEffect(() => {
    if (identityMode === "anonymous" && identity?.allowQualifiersOnAnonymousPosts === false) {
      setSelectedQualifierIds([]);
    }
  }, [identity?.allowQualifiersOnAnonymousPosts, identityMode]);

  React.useEffect(() => {
    if (identityMode !== "anonymous" && selectedQualifierIds.length > 0) {
      setSelectedQualifierIds([]);
    }
  }, [identityMode, selectedQualifierIds]);

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
  const donationPartnerName = resolveDonationPartnerName(monetizationState);
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
                defaultValue={linkUrlValue}
                placeholder="https://"
              />
            </div>
            <LabeledTextarea
              className="min-h-28"
              defaultValue={captionValue}
              label="Commentary"
              placeholder="Add commentary"
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
                    setActiveSongMode(value);
                    onSongModeChange?.(value);
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
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ComposerTab)}>
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
              onIdentityModeChange={setIdentityMode}
            />
          ) : null}

          {shouldShowQualifiers ? (
            <QualifierSection
              identity={identity!}
              onSelectedQualifierIdsChange={setSelectedQualifierIds}
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

          {monetizationState.visible ? (
            <section className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
              {activeTab === "song" ? (
                <div className="space-y-3">
                  <FormSectionHeading
                    description="Pick the Story Protocol license path for this release before you set pricing."
                    title="License"
                  />
                  <div className="grid gap-3">
                    {licenseOptions.map((option) => (
                      <OptionCard
                        key={option.value}
                        description={option.description}
                        onClick={() =>
                          setMonetizationState((current) => ({
                            ...current,
                            license: option.value,
                          }))
                        }
                        selected={monetizationState.license === option.value}
                        title={option.label}
                      />
                    ))}
                  </div>

                  {allowsCommercialUse(monetizationState.license) ? (
                    <div className="rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <FormSectionHeading
                          description="Derivative commercial revenue owed back to this track."
                          title="Revenue share"
                        />
                        <span className="text-lg font-semibold text-foreground">
                          {monetizationState.revenueSharePct ?? 0}%
                        </span>
                      </div>
                      <div className="mt-4">
                        <Scrubber
                          showThumb
                          onChange={(value) =>
                            setMonetizationState((current) => ({
                              ...current,
                              revenueSharePct: value,
                            }))
                          }
                          value={monetizationState.revenueSharePct ?? 0}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-3">
                <FormSectionHeading
                  description="Configure the paid listing surface."
                  title="Sales"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Unlock price (USD)" />
                    <Input
                      className="h-12"
                      inputMode="decimal"
                      onChange={(event) =>
                        setMonetizationState((current) => ({
                          ...current,
                          priceUsd: event.target.value,
                        }))
                      }
                      placeholder="1.00"
                      value={monetizationState.priceUsd ?? ""}
                    />
                  </div>

                  <div className="rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={monetizationState.openEdition}
                        className="mt-0.5"
                        id="open-edition"
                        onCheckedChange={(next) =>
                          setMonetizationState((current) => ({
                            ...current,
                            openEdition: next === true,
                          }))
                        }
                      />
                      <div className="space-y-1">
                        <Label htmlFor="open-edition">Open edition</Label>
                        <FormNote>Leave supply uncapped for this release.</FormNote>
                      </div>
                    </div>
                    {!monetizationState.openEdition ? (
                      <div className="mt-3">
                        <FieldLabel label="Max supply" />
                        <Input
                          className="h-12"
                          inputMode="numeric"
                          onChange={(event) =>
                            setMonetizationState((current) => ({
                              ...current,
                              maxSupply: event.target.value,
                            }))
                          }
                          placeholder="250"
                          value={monetizationState.maxSupply ?? ""}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {monetizationState.donationAvailable ? (
                <div className="space-y-3">
                  <FormSectionHeading
                    description="Donation remains creator-side and only applies when this listing is paid."
                    title="Donation"
                  />

                  <div className="rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
                    <div className="flex items-center justify-between gap-4 border-b border-border-soft pb-4">
                      <FieldLabel label="Community partner" />
                      <span className="text-base font-medium text-foreground">{donationPartnerName}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={monetizationState.donationOptIn}
                        className="mt-4"
                        id="donation-opt-in"
                        onCheckedChange={(next) =>
                          setMonetizationState((current) => ({
                            ...current,
                            donationOptIn: next === true,
                          }))
                        }
                      />
                      <div className="space-y-1 pt-3">
                        <Label htmlFor="donation-opt-in">
                          Donate part of your proceeds to {donationPartnerName}
                        </Label>
                      </div>
                    </div>

                    {monetizationState.donationOptIn ? (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <FieldLabel label="Donation share" />
                          <span className="text-lg font-semibold text-foreground">
                            {monetizationState.donationSharePct ?? 0}%
                          </span>
                        </div>
                        <Scrubber
                          max={50}
                          onChange={(value) =>
                            setMonetizationState((current) => ({
                              ...current,
                              donationSharePct: value,
                            }))
                          }
                          showThumb
                          value={Math.min(50, Math.max(1, monetizationState.donationSharePct ?? 10))}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {activeTab === "song" ? (
                <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
                  <FormSectionHeading
                    description="Review the release configuration before posting."
                    title="Review"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <SummaryRow label="Title" value={titleValue || "Untitled"} />
                    <SummaryRow label="Genre" value={songState.genre ?? "Unconfigured"} />
                    <SummaryRow
                      label="Languages"
                      value={
                        songState.secondaryLanguage
                          ? `${songState.primaryLanguage ?? "English"} + ${songState.secondaryLanguage}`
                          : (songState.primaryLanguage ?? "English")
                      }
                    />
                    <SummaryRow
                      label="License"
                      value={formatLicenseLabel(monetizationState.license)}
                    />
                    {allowsCommercialUse(monetizationState.license) ? (
                      <SummaryRow
                        label="Revenue share"
                        value={`${monetizationState.revenueSharePct ?? 0}%`}
                      />
                    ) : null}
                    <SummaryRow
                      label="Donation"
                      value={
                        monetizationState.donationOptIn
                          ? `${monetizationState.donationSharePct ?? 0}% to ${donationPartnerName}`
                          : "Off"
                      }
                    />
                    <SummaryRow
                      label="Price"
                      value={
                        monetizationState.priceUsd ? `$${monetizationState.priceUsd}` : "Unconfigured"
                      }
                    />
                    <SummaryRow
                      label="Supply"
                      value={
                        monetizationState.openEdition
                          ? "Open edition"
                          : `${monetizationState.maxSupply || "Unconfigured"} copies`
                      }
                    />
                  </div>

                  <div className="flex items-start gap-3 border-t border-border-soft pt-4">
                    <Checkbox
                      checked={monetizationState.rightsAttested}
                      className="mt-0.5"
                      id="rights-attested"
                      onCheckedChange={(next) =>
                        setMonetizationState((current) => ({
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
