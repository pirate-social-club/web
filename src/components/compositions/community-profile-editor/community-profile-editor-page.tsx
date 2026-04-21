"use client";

import * as React from "react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";

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
            accept="image/png,image/jpeg,image/webp,image/gif"
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

export interface CommunityProfileEditorPageProps {
  avatarSrc?: string;
  bannerSrc?: string;
  description: string;
  displayName: string;
  displayNameError?: string;
  onAvatarRemove?: () => void;
  onAvatarSelect?: (file: File | null) => void;
  onBackClick?: () => void;
  onBannerRemove?: () => void;
  onBannerSelect?: (file: File | null) => void;
  onDescriptionChange?: (value: string) => void;
  onDisplayNameChange?: (value: string) => void;
  onSave?: () => void;
  pendingAvatarLabel?: string;
  pendingBannerLabel?: string;
  saveDisabled?: boolean;
  saveLoading?: boolean;
}

export function CommunityProfileEditorPage({
  avatarSrc,
  bannerSrc,
  description,
  displayName,
  displayNameError,
  onAvatarRemove,
  onAvatarSelect,
  onBackClick,
  onBannerRemove,
  onBannerSelect,
  onDescriptionChange,
  onDisplayNameChange,
  onSave,
  pendingAvatarLabel,
  pendingBannerLabel,
  saveDisabled,
  saveLoading,
}: CommunityProfileEditorPageProps) {
  const { copy } = useRouteMessages();
  const mc = copy.moderation.profile;
  const [pendingAvatarFile, setPendingAvatarFile] = React.useState<File | null>(null);
  const [pendingBannerFile, setPendingBannerFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    setPendingAvatarFile(null);
  }, [avatarSrc]);

  React.useEffect(() => {
    setPendingBannerFile(null);
  }, [bannerSrc]);

  const avatarPreview = useObjectUrl(pendingAvatarFile);
  const bannerPreview = useObjectUrl(pendingBannerFile);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">{mc.appearanceTitle}</h2>
        <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <MediaControlCard
            canRemove={Boolean(avatarSrc || pendingAvatarFile)}
            onRemove={onAvatarRemove}
            onSelect={(file) => {
              setPendingAvatarFile(file);
              onAvatarSelect?.(file);
            }}
            preview={<Avatar className="size-full bg-card" fallback={displayName} size="lg" src={avatarPreview ?? avatarSrc} />}
            removeLabel={mc.removeAvatar}
            selectLabel={avatarSrc || pendingAvatarFile ? mc.replaceAvatar : mc.uploadAvatar}
            selectedLabel={pendingAvatarFile?.name ?? pendingAvatarLabel}
            shape="avatar"
            title={mc.avatarTitle}
          />

          <MediaControlCard
            canRemove={Boolean(bannerSrc || pendingBannerFile)}
            onRemove={onBannerRemove}
            onSelect={(file) => {
              setPendingBannerFile(file);
              onBannerSelect?.(file);
            }}
            preview={(
              <div
                className={cn(
                  "size-full bg-muted",
                  bannerPreview || bannerSrc ? "bg-cover bg-center bg-no-repeat" : "",
                )}
                style={bannerPreview || bannerSrc
                  ? { backgroundImage: `url(${bannerPreview ?? bannerSrc})` }
                  : undefined}
              />
            )}
            removeLabel={mc.removeCover}
            selectLabel={bannerSrc || pendingBannerFile ? mc.replaceCover : mc.uploadCover}
            selectedLabel={pendingBannerFile?.name ?? pendingBannerLabel}
            shape="cover"
            title={mc.coverTitle}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">{mc.profileTitle}</h2>
        <Card className="space-y-5 border-border bg-card px-5 py-5 shadow-none">
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground" htmlFor="community-profile-display-name">
              Name
            </label>
            <Input
              id="community-profile-display-name"
              maxLength={50}
              onChange={(event) => onDisplayNameChange?.(event.target.value)}
              value={displayName}
            />
            {displayNameError ? <FormNote tone="destructive">{displayNameError}</FormNote> : null}
          </div>
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground" htmlFor="community-profile-description">
              Description
            </label>
            <Textarea
              id="community-profile-description"
              onChange={(event) => onDescriptionChange?.(event.target.value)}
              rows={5}
              value={description}
            />
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
            {onBackClick ? (
              <Button onClick={onBackClick} type="button" variant="ghost">
                Back
              </Button>
            ) : null}
            <Button
              disabled={saveDisabled}
              loading={saveLoading}
              onClick={onSave}
              type="button"
            >
              Save profile
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
