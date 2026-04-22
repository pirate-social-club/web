"use client";

import * as React from "react";

import { GlobalHandleField } from "@/components/compositions/edit-profile-form/edit-profile-form";
import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { RadioGroup, RadioGroupItem } from "@/components/primitives/radio-group";
import { Textarea } from "@/components/primitives/textarea";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";

import { SettingsRow, SettingsSection } from "./settings-page-panel-primitives";
import type { SettingsHandle, SettingsPageProps } from "../settings-page.types";

function useObjectUrl(file: File | null): string | null {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  return objectUrl;
}

function HiddenFileInput({
  accept,
  fileLabel,
  onSelect,
}: {
  accept: string;
  fileLabel: string;
  onSelect?: (file: File | null) => void;
}) {
  const inputId = React.useId();

  return (
    <>
      <input
        accept={accept}
        className="sr-only"
        id={inputId}
        onChange={(event) => {
          onSelect?.(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
        type="file"
      />
      <label className="cursor-pointer" htmlFor={inputId}>
        <span className="inline-flex h-10 items-center rounded-full bg-muted px-4 text-base font-semibold text-foreground">
          {fileLabel}
        </span>
      </label>
    </>
  );
}

function MediaControlCard({
  canRemove,
  preview,
  removeLabel,
  selectLabel,
  selectedLabel,
  shape,
  title,
  onRemove,
  onSelect,
}: {
  canRemove?: boolean;
  preview?: React.ReactNode;
  removeLabel: string;
  selectLabel: string;
  selectedLabel?: string;
  shape: "avatar" | "cover";
  title: string;
  onRemove?: () => void;
  onSelect?: (file: File | null) => void;
}) {
  return (
    <Card className="overflow-hidden border-border bg-card shadow-none">
      <div className="space-y-4 px-5 py-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {selectedLabel ? <div className="truncate text-base text-muted-foreground">{selectedLabel}</div> : null}
        </div>
        <div
          className={cn(
            "overflow-hidden border border-border-soft bg-muted/40",
            shape === "avatar" ? "size-28 rounded-full" : "h-36 rounded-[var(--radius-2xl)]",
          )}
        >
          {preview}
        </div>
        <div className="flex flex-wrap gap-3">
          <HiddenFileInput
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            fileLabel={selectLabel}
            onSelect={onSelect}
          />
          {onRemove && canRemove ? (
            <Button onClick={onRemove} type="button" variant="secondary">
              {removeLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function formatHandleNote(handle: SettingsHandle, copy: ReturnType<typeof getLocaleMessages<"routes">>["settings"]): string {
  if (handle.note) {
    return handle.note;
  }

  if (handle.kind === "pirate") {
    return copy.handleNotePirate;
  }

  if (handle.verificationState === "stale") {
    return copy.handleNoteEnsRefresh;
  }

  if (handle.verificationState === "unverified") {
    return copy.handleNoteEnsUnverified;
  }

  return copy.handleNoteEns;
}

function HandleSelector({
  handles,
  onValueChange,
  value,
}: {
  handles: SettingsHandle[];
  onValueChange?: (handleId: string | null) => void;
  value?: string | null;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").settings;
  const selectedValue = value ?? "pirate";

  return (
    <Card className="overflow-hidden border-border bg-card shadow-none">
      <RadioGroup
        className="gap-0 rounded-none bg-transparent p-0"
        onValueChange={(next) => onValueChange?.(next === "pirate" ? null : next)}
        value={selectedValue}
      >
        {handles.map((handle) => (
          <RadioGroupItem
            disabled={handle.verificationState !== "verified"}
            indicatorClassName={cn(
              "min-h-20 w-full justify-start rounded-none border-b border-border px-5 py-4 text-start last:border-b-0",
              "data-[state=checked]:bg-muted/40 data-[state=checked]:text-foreground",
            )}
            key={`${handle.kind}:${handle.handleId ?? "pirate"}`}
            labelClassName="w-full"
            value={handle.handleId ?? "pirate"}
          >
            <div className="flex w-full items-center justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="truncate text-base font-medium text-foreground">{handle.label}</div>
                <div className="truncate text-base text-muted-foreground">{formatHandleNote(handle, copy)}</div>
              </div>
              <div className="shrink-0 text-base text-muted-foreground">
                {selectedValue === (handle.handleId ?? "pirate") ? copy.primaryHandleLabel : ""}
              </div>
            </div>
          </RadioGroupItem>
        ))}
      </RadioGroup>
    </Card>
  );
}

export function ProfileTab({
  profile,
}: Pick<SettingsPageProps, "profile">) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").settings;
  const [pendingAvatarFile, setPendingAvatarFile] = React.useState<File | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    setPendingAvatarFile(null);
  }, [profile.avatarSrc]);

  React.useEffect(() => {
    setPendingCoverFile(null);
  }, [profile.coverSrc]);

  const avatarPreview = useObjectUrl(pendingAvatarFile);
  const coverPreview = useObjectUrl(pendingCoverFile);

  return (
    <div className="space-y-8">
      <SettingsSection title={copy.appearanceSection}>
        <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <MediaControlCard
            canRemove={Boolean(profile.avatarSrc || pendingAvatarFile)}
            onRemove={profile.onAvatarRemove}
            onSelect={(file) => {
              setPendingAvatarFile(file);
              profile.onAvatarSelect?.(file);
            }}
            preview={<Avatar className="size-full bg-card" fallback={profile.displayName} size="lg" src={avatarPreview ?? profile.avatarSrc} />}
            removeLabel={copy.removeAvatar}
            selectLabel={profile.avatarSrc || pendingAvatarFile ? copy.replaceAvatar : copy.uploadAvatar}
            selectedLabel={pendingAvatarFile?.name ?? profile.pendingAvatarLabel}
            shape="avatar"
            title={copy.avatarTitle}
          />

          <MediaControlCard
            canRemove={Boolean(profile.coverSrc || pendingCoverFile)}
            onRemove={profile.onCoverRemove}
            onSelect={(file) => {
              setPendingCoverFile(file);
              profile.onCoverSelect?.(file);
            }}
            preview={(
              <div
                className={cn(
                  "size-full bg-muted",
                  coverPreview || profile.coverSrc ? "bg-cover bg-center bg-no-repeat" : "",
                )}
                style={coverPreview || profile.coverSrc
                  ? { backgroundImage: `url(${coverPreview ?? profile.coverSrc})` }
                  : undefined}
              />
            )}
            removeLabel={copy.removeCover}
            selectLabel={profile.coverSrc || pendingCoverFile ? copy.replaceCover : copy.uploadCover}
            selectedLabel={pendingCoverFile?.name ?? profile.pendingCoverLabel}
            shape="cover"
            title={copy.coverTitle}
          />
        </div>
      </SettingsSection>

      <SettingsSection title={copy.profileSection}>
        <Card className="space-y-5 border-border bg-card px-5 py-5 shadow-none">
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground" htmlFor="settings-display-name">
              {copy.displayNameLabel}
            </label>
            <Input
              id="settings-display-name"
              maxLength={50}
              onChange={(event) => profile.onDisplayNameChange?.(event.target.value)}
              value={profile.displayName}
            />
            {profile.displayNameError ? <FormNote tone="destructive">{profile.displayNameError}</FormNote> : null}
          </div>
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground" htmlFor="settings-bio">
              {copy.bioLabel}
            </label>
            <Textarea
              id="settings-bio"
              onChange={(event) => profile.onBioChange?.(event.target.value)}
              rows={4}
              value={profile.bio}
            />
          </div>
          <SettingsRow
            label={copy.postsAndCommentsLabel}
            note={copy.postsAndCommentsNote}
            value={profile.postAuthorLabel}
          />
          <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
            {profile.submitState.kind === "error" ? (
              <div className="me-auto text-base text-destructive">{profile.submitState.message}</div>
            ) : null}
            <Button
              disabled={profile.saveDisabled}
              loading={profile.submitState.kind === "saving"}
              onClick={() => profile.onSave?.()}
              type="button"
            >
              {copy.saveProfile}
            </Button>
          </div>
        </Card>
      </SettingsSection>

      {profile.currentHandle ? (
        <SettingsSection title={copy.pirateHandleSection}>
          {profile.handleFlow ? (
            <GlobalHandleField
              currentHandle={profile.currentHandle}
              expandable
              handleFlow={profile.handleFlow}
            />
          ) : (
            <Card className="overflow-hidden border-border bg-card shadow-none">
              <SettingsRow
                label={copy.currentHandleLabel}
                value={profile.currentHandle}
              />
            </Card>
          )}
        </SettingsSection>
      ) : null}

      <SettingsSection title={copy.publicHandlesSection}>
        <HandleSelector
          handles={profile.linkedHandles}
          onValueChange={profile.onPrimaryHandleChange}
          value={profile.primaryHandleId}
        />
        <div className="flex items-center justify-end gap-3">
          {profile.publicHandlesSubmitState.kind === "error" ? (
            <div className="me-auto text-base text-destructive">{profile.publicHandlesSubmitState.message}</div>
          ) : null}
          <Button
            disabled={profile.publicHandlesSaveDisabled}
            loading={profile.publicHandlesSubmitState.kind === "saving"}
            onClick={() => profile.onPublicHandlesSave?.()}
            type="button"
          >
            {copy.savePublicHandles}
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
