"use client";

import * as React from "react";
import { ChatCircle, LinkSimple } from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";

import { CommunityModerationSaveFooter } from "@/components/compositions/community/moderation-shell/community-moderation-save-footer";
import { Button } from "@/components/primitives/button";
import { CopyField } from "@/components/primitives/copy-field";
import { FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Switch } from "@/components/primitives/switch";
import { Textarea } from "@/components/primitives/textarea";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import type {
  CommunityTelegramIntegrationPageProps,
  CommunityTelegramIntegrationSettings,
  TelegramBotAdminStatus,
  TelegramLinkedChatLinkMode,
  TelegramWelcomeIntroLocale,
} from "./community-telegram-integration.types";

const WELCOME_INTRO_MAX_CHARS = 280;
const WELCOME_INTRO_LOCALES: Array<{ code: TelegramWelcomeIntroLocale; label: string }> = [
  { code: "en", label: "English" },
  { code: "ka", label: "Georgian" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
];

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-4 border-t border-border-soft pt-6 md:pt-8">
      <Type as="h2" variant="h2">{title}</Type>
      {children}
    </section>
  );
}

function ToggleRow({
  checked,
  disabled = false,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className={cn(
      "flex min-h-14 items-center justify-between gap-4 rounded-md border border-border-soft bg-muted/20 px-4 py-3.5",
      disabled && "opacity-60",
    )}>
      <Type as="div" variant="body-strong">{label}</Type>
      <Switch
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 rounded-md border border-border-soft bg-muted/20 px-4 py-3.5">
      <Type as="div" variant="caption">{label}</Type>
      <Type as="div" variant="body-strong">{value}</Type>
    </div>
  );
}

function SelectRow({
  label,
  onValueChange,
  value,
}: {
  label: string;
  onValueChange: (value: TelegramLinkedChatLinkMode) => void;
  value: TelegramLinkedChatLinkMode;
}) {
  return (
    <div className="flex min-h-14 flex-col gap-3 rounded-md border border-border-soft bg-muted/20 px-4 py-3.5 md:flex-row md:items-center md:justify-between">
      <Type as="div" variant="body-strong">{label}</Type>
      <Select onValueChange={(next) => onValueChange(next as TelegramLinkedChatLinkMode)} value={value}>
        <SelectTrigger className="w-full md:w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="join_request">Join request</SelectItem>
          <SelectItem value="invite_link">Invite link</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function botStatusLabel(status: TelegramBotAdminStatus): string {
  switch (status) {
    case "ready":
      return "Bot ready";
    case "missing":
      return "Bot not in chat";
    case "insufficient_permissions":
      return "Missing permissions";
    case "left_chat":
      return "Bot removed";
    case "unknown":
      return "Status unknown";
  }
}

function botStatusRemediation(status: TelegramBotAdminStatus): string | null {
  if (status === "missing" || status === "insufficient_permissions") {
    return "Reconnect the chat and grant the bot permission to create invite links or approve join requests.";
  }
  if (status === "left_chat") {
    return "The bot was removed from this group. Reconnect the chat before new Telegram joins can be issued.";
  }
  return null;
}

function TelegramJoinLinkPanel({ joinUrl }: { joinUrl: string }) {
  return (
    <div className="grid gap-4 rounded-md border border-border-soft bg-card p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0 space-y-2">
        <Type as="div" variant="caption">Join link</Type>
        <CopyField value={joinUrl} />
      </div>
      <div className="grid size-44 place-items-center justify-self-start rounded-md border border-border-soft bg-white p-3 md:justify-self-end">
        <QRCodeSVG
          aria-label="Telegram join QR code"
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
          role="img"
          size={144}
          value={joinUrl}
        />
      </div>
    </div>
  );
}

function updateWelcomeIntro(
  settings: CommunityTelegramIntegrationSettings,
  locale: TelegramWelcomeIntroLocale,
  value: string,
): CommunityTelegramIntegrationSettings {
  const nextIntro = { ...settings.telegramWelcomeIntro };
  if (value.trim()) {
    nextIntro[locale] = value;
  } else {
    delete nextIntro[locale];
  }
  return {
    ...settings,
    telegramWelcomeIntro: nextIntro,
  };
}

function updateSettings(
  settings: CommunityTelegramIntegrationSettings,
  patch: Partial<CommunityTelegramIntegrationSettings>,
): CommunityTelegramIntegrationSettings {
  return { ...settings, ...patch };
}

export function CommunityTelegramIntegrationPage({
  className,
  joinUrl,
  onConnectChat,
  onRevokeBot,
  onSave,
  onSaveBotToken,
  onSettingsChange,
  saveDisabled = false,
  settings,
  submitState,
}: CommunityTelegramIntegrationPageProps) {
  const [botToken, setBotToken] = React.useState("");
  const connected = settings.linkedChat.status === "connected";
  const botConnected = settings.bot.status === "connected";
  const botRemediation = connected ? botStatusRemediation(settings.linkedChat.botAdminStatus) : null;

  function updateLinkMode(linkMode: TelegramLinkedChatLinkMode) {
    onSettingsChange?.({
      ...settings,
      linkedChat: {
        ...settings.linkedChat,
        linkMode,
      },
    });
  }

  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <Type as="h1" variant="h1">Telegram</Type>
        <Button
          disabled={!botConnected}
          leadingIcon={<ChatCircle className="size-5" weight="bold" />}
          onClick={onConnectChat}
          variant={connected ? "secondary" : "default"}
        >
          {connected ? "Reconnect chat" : "Connect chat"}
        </Button>
      </div>

      <Section title="Bot">
        <div className="grid gap-3 rounded-md border border-border-soft bg-card p-5">
          <Type as="p" variant="body">
            Create a Telegram bot with BotFather, then save its token here. This community will use that bot for setup, join approvals, and assistant replies.
          </Type>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              autoComplete="off"
              onChange={(event) => setBotToken(event.currentTarget.value)}
              placeholder="123456789:AA..."
              type="password"
              value={botToken}
            />
            <Button
              disabled={!botToken.trim()}
              onClick={() => {
                onSaveBotToken?.(botToken);
                setBotToken("");
              }}
              type="button"
            >
              Save bot
            </Button>
          </div>
          {botConnected ? (
            <div className="flex flex-col gap-2 rounded-md border border-border-soft bg-muted/20 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <Type as="div" variant="body-strong">
                @{settings.bot.username}
                {settings.bot.tokenLast4 ? ` · token ends ${settings.bot.tokenLast4}` : ""}
              </Type>
              <div className="flex items-center gap-3">
                <Type as="div" variant="caption">Webhook: {settings.bot.webhookStatus ?? "unknown"}</Type>
                <Button onClick={onRevokeBot} size="sm" type="button" variant="secondary">Revoke</Button>
              </div>
            </div>
          ) : (
            <FormNote>Save this community's bot token before connecting a Telegram group.</FormNote>
          )}
        </div>
      </Section>

      <Section title="Welcome">
        <div className="grid gap-4 rounded-md border border-border-soft bg-card p-5">
          <div className="space-y-1">
            <Type as="div" variant="body-strong">First message intro</Type>
            <Type as="p" variant="caption">
              This text appears above Pirate's status and action copy when someone starts the bot.
            </Type>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {WELCOME_INTRO_LOCALES.map((locale) => {
              const value = settings.telegramWelcomeIntro[locale.code] ?? "";
              return (
                <label className="grid gap-2" key={locale.code}>
                  <span className="flex items-center justify-between gap-3">
                    <Type as="span" variant="caption">{locale.label}</Type>
                    <Type as="span" variant="caption">
                      {Array.from(value).length}/{WELCOME_INTRO_MAX_CHARS}
                    </Type>
                  </span>
                  <Textarea
                    aria-label={`${locale.label} welcome intro`}
                    maxLength={WELCOME_INTRO_MAX_CHARS}
                    onChange={(event) => {
                      onSettingsChange?.(updateWelcomeIntro(settings, locale.code, event.currentTarget.value));
                    }}
                    rows={3}
                    value={value}
                  />
                </label>
              );
            })}
          </div>
          <FormNote>Plain text only. Links, HTML, and Markdown are rejected when saved.</FormNote>
        </div>
      </Section>

      <FormNote>Preview answer behavior is configured in Assistant &gt; Telegram.</FormNote>

      {!connected ? null : (
        <>
          <section className="space-y-4">
            <div className="flex min-h-28 flex-col justify-between gap-4 rounded-md border border-border-soft bg-card p-5 md:flex-row md:items-center">
              <div className="flex min-w-0 items-start gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-md border border-border-soft bg-muted text-muted-foreground">
                  <LinkSimple className="size-6" weight="bold" />
                </div>
                <div className="min-w-0 space-y-1">
                  <Type as="h2" variant="h2">{settings.linkedChat.chatTitle ?? "Telegram chat"}</Type>
                  <Type as="div" variant="caption">{botStatusLabel(settings.linkedChat.botAdminStatus)}</Type>
                </div>
              </div>
            </div>

            {botRemediation ? <FormNote tone="warning">{botRemediation}</FormNote> : null}

            <div className="grid gap-3 md:grid-cols-2">
              <SelectRow
                label="Link mode"
                onValueChange={updateLinkMode}
                value={settings.linkedChat.linkMode}
              />
              <StatusRow label="Username" value={settings.linkedChat.chatUsername ?? "Private"} />
            </div>
          </section>

          <Section title="Discovery">
            {joinUrl ? <TelegramJoinLinkPanel joinUrl={joinUrl} /> : null}
            <ToggleRow
              checked={settings.directoryVisible}
              label="Show in Telegram directory"
              onCheckedChange={(directoryVisible) => onSettingsChange?.(updateSettings(settings, { directoryVisible }))}
            />
          </Section>
        </>
      )}

      {submitState.kind === "error" ? (
        <FormNote tone="destructive">{submitState.message}</FormNote>
      ) : null}

      <CommunityModerationSaveFooter
        disabled={saveDisabled}
        loading={submitState.kind === "saving"}
        onSave={onSave}
      />
    </section>
  );
}
