"use client";

import * as React from "react";

import { GlobalHandleField } from "@/components/compositions/edit-profile-form/edit-profile-form";
import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { CopyField } from "@/components/primitives/copy-field";
import { FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { RadioGroup, RadioGroupItem } from "@/components/primitives/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";

import type {
  SettingsConnectedWallet,
  SettingsHandle,
  SettingsPageProps,
  SettingsTab,
} from "./settings-page.types";

const TAB_LABELS: Record<SettingsTab, string> = {
  profile: "Profile",
  wallet: "Wallet",
  preferences: "Preferences",
};

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

function SettingsSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function SettingsRow({
  label,
  note,
  trailing,
  value,
}: {
  label: string;
  note?: string;
  trailing?: React.ReactNode;
  value?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-20 items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-base font-medium text-foreground">{label}</div>
        {note ? <div className="text-base text-muted-foreground">{note}</div> : null}
      </div>
      {value ? (
        <div className="min-w-0 flex-1 text-right text-base text-muted-foreground">
          {value}
        </div>
      ) : null}
      {trailing ? <div className="shrink-0 text-muted-foreground">{trailing}</div> : null}
    </div>
  );
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

function formatHandleNote(handle: SettingsHandle): string {
  if (handle.note) {
    return handle.note;
  }

  if (handle.kind === "pirate") {
    return "Pirate handle";
  }

  if (handle.verificationState === "stale") {
    return "ENS needs refresh";
  }

  if (handle.verificationState === "unverified") {
    return "ENS not verified";
  }

  return "ENS";
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
              "min-h-20 w-full justify-start rounded-none border-b border-border px-5 py-4 text-left last:border-b-0",
              "data-[state=checked]:bg-muted/40 data-[state=checked]:text-foreground",
            )}
            key={`${handle.kind}:${handle.handleId ?? "pirate"}`}
            labelClassName="w-full"
            value={handle.handleId ?? "pirate"}
          >
            <div className="flex w-full items-center justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="truncate text-base font-medium text-foreground">{handle.label}</div>
                <div className="truncate text-base text-muted-foreground">{formatHandleNote(handle)}</div>
              </div>
              <div className="shrink-0 text-base text-muted-foreground">
                {selectedValue === (handle.handleId ?? "pirate") ? "Primary" : ""}
              </div>
            </div>
          </RadioGroupItem>
        ))}
      </RadioGroup>
    </Card>
  );
}

function WalletList({ connectedWallets }: { connectedWallets: SettingsConnectedWallet[] }) {
  if (connectedWallets.length === 0) {
    return (
      <Card className="border-border bg-card px-5 py-5 shadow-none">
        <div className="text-base text-muted-foreground">No connected wallets yet.</div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border bg-card shadow-none">
      <div className="flex flex-col">
        {connectedWallets.map((wallet) => (
          <SettingsRow
            key={`${wallet.chainLabel}:${wallet.address}`}
            label={wallet.chainLabel}
            note={wallet.isPrimary ? "Primary wallet" : undefined}
            value={wallet.address}
          />
        ))}
      </div>
    </Card>
  );
}

export function SettingsTabNav({
  activeTab,
  onTabChange,
}: {
  activeTab: SettingsTab;
  onTabChange?: (tab: SettingsTab) => void;
}) {
  return (
    <nav aria-label="Settings sections" className="overflow-x-auto border-b border-border">
      <div className="flex min-w-max gap-8">
        {(Object.keys(TAB_LABELS) as SettingsTab[]).map((tab) => (
          <button
            aria-current={tab === activeTab ? "page" : undefined}
            className={cn(
              "border-b-2 border-transparent px-0 py-4 text-base font-medium text-muted-foreground transition-colors",
              tab === activeTab && "border-foreground text-foreground",
            )}
            key={tab}
            onClick={() => onTabChange?.(tab)}
            type="button"
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function ProfileTab({
  profile,
}: Pick<SettingsPageProps, "profile">) {
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
      <SettingsSection title="Appearance">
        <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <MediaControlCard
            canRemove={Boolean(profile.avatarSrc || pendingAvatarFile)}
            onRemove={profile.onAvatarRemove}
            onSelect={(file) => {
              setPendingAvatarFile(file);
              profile.onAvatarSelect?.(file);
            }}
            preview={<Avatar className="size-full bg-card" fallback={profile.displayName} size="lg" src={avatarPreview ?? profile.avatarSrc} />}
            removeLabel="Remove avatar"
            selectLabel={profile.avatarSrc || pendingAvatarFile ? "Replace avatar" : "Upload avatar"}
            selectedLabel={pendingAvatarFile?.name ?? profile.pendingAvatarLabel}
            shape="avatar"
            title="Avatar"
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
            removeLabel="Remove cover"
            selectLabel={profile.coverSrc || pendingCoverFile ? "Replace cover" : "Upload cover"}
            selectedLabel={pendingCoverFile?.name ?? profile.pendingCoverLabel}
            shape="cover"
            title="Cover"
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Profile">
        <Card className="space-y-5 border-border bg-card px-5 py-5 shadow-none">
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground" htmlFor="settings-display-name">
              Display name
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
              Bio
            </label>
            <Textarea
              id="settings-bio"
              onChange={(event) => profile.onBioChange?.(event.target.value)}
              rows={4}
              value={profile.bio}
            />
          </div>
          <SettingsRow
            label="Posts and comments"
            note="Primary public byline"
            value={profile.postAuthorLabel}
          />
          {profile.handleFlow && profile.currentHandle ? (
            <div className="border-t border-border pt-5">
              <GlobalHandleField currentHandle={profile.currentHandle} handleFlow={profile.handleFlow} />
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
            {profile.submitState.kind === "error" ? (
              <div className="mr-auto text-base text-destructive">{profile.submitState.message}</div>
            ) : null}
            <Button
              disabled={profile.saveDisabled}
              loading={profile.submitState.kind === "saving"}
              onClick={() => profile.onSave?.()}
              type="button"
            >
              Save profile
            </Button>
          </div>
        </Card>
      </SettingsSection>

      <SettingsSection title="Linked handles">
        <HandleSelector
          handles={profile.linkedHandles}
          onValueChange={profile.onPrimaryHandleChange}
          value={profile.primaryHandleId}
        />
      </SettingsSection>
    </div>
  );
}

export function WalletTab({
  wallet,
}: Pick<SettingsPageProps, "wallet">) {
  return (
    <div className="space-y-8">
      <Card className="space-y-5 border-border bg-card px-5 py-5 shadow-none">
        <div className="space-y-1">
          <div className="text-base text-muted-foreground">Primary wallet</div>
          <div className="text-lg font-semibold text-foreground">
            {wallet.primaryAddress ?? "No wallet connected"}
          </div>
        </div>
        {wallet.primaryAddress ? <CopyField value={wallet.primaryAddress} /> : null}
      </Card>

      <SettingsSection title="Connected wallets">
        <WalletList connectedWallets={wallet.connectedWallets} />
      </SettingsSection>
    </div>
  );
}

export function PreferencesTab({
  preferences,
}: Pick<SettingsPageProps, "preferences">) {
  return (
    <div className="space-y-8">
      <SettingsSection title="Language">
        <Card className="space-y-5 border-border bg-card px-5 py-5 shadow-none">
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground" htmlFor="settings-language">
              App language
            </label>
            <Select onValueChange={preferences.onLocaleChange} value={preferences.locale}>
              <SelectTrigger className="rounded-[var(--radius-lg)]" id="settings-language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {preferences.localeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
            {preferences.submitState.kind === "error" ? (
              <div className="mr-auto text-base text-destructive">{preferences.submitState.message}</div>
            ) : null}
            <Button
              disabled={preferences.saveDisabled}
              loading={preferences.submitState.kind === "saving"}
              onClick={() => preferences.onSave?.()}
              type="button"
            >
              Save preferences
            </Button>
          </div>
        </Card>
      </SettingsSection>

      {preferences.ageStatusLabel ? (
        <SettingsSection title="Identity">
          <Card className="overflow-hidden border-border bg-card shadow-none">
            <SettingsRow label="Age status" value={preferences.ageStatusLabel} />
          </Card>
        </SettingsSection>
      ) : null}
    </div>
  );
}
