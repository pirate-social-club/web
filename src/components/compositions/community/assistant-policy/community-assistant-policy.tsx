"use client";

import * as React from "react";

import { CommunityModerationSaveFooter } from "@/components/compositions/community/moderation-shell/community-moderation-save-footer";
import { Button } from "@/components/primitives/button";
import { Checkbox } from "@/components/primitives/checkbox";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
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
  AssistantActionMode,
  AssistantContextMode,
  AssistantRetentionMode,
  AssistantSttProvider,
  AssistantVoiceMode,
  CommunityAssistantPolicyPageProps,
  CommunityAssistantPolicySettings,
} from "./community-assistant-policy.types";

const AVATAR_INPUT_ID = "community-assistant-avatar-upload";

type Option<T extends string> = {
  label: string;
  value: T;
};

const contextModeOptions: Array<Option<AssistantContextMode>> = [
  { label: "Live SQL", value: "live_sql" },
  { label: "Summary cache", value: "summary_cache" },
  { label: "Hybrid vector", value: "hybrid_vector" },
];

const actionModeOptions: Array<Option<AssistantActionMode>> = [
  { label: "Answer only", value: "answer_only" },
  { label: "Draft only", value: "draft_only" },
  { label: "Confirmed writes", value: "confirmed_writes" },
];

const retentionModeOptions: Array<Option<AssistantRetentionMode>> = [
  { label: "Per-user private", value: "per_user_private" },
  { label: "Visible to mods", value: "community_visible_to_mods" },
  { label: "Ephemeral", value: "ephemeral" },
];

const voiceModeOptions: Array<Option<AssistantVoiceMode>> = [
  { label: "Off", value: "off" },
  { label: "Transcription only", value: "transcription_only" },
  { label: "Voice replies", value: "voice_replies" },
];

const sttProviderOptions: Array<Option<AssistantSttProvider>> = [
  { label: "Mistral", value: "mistral" },
  { label: "OpenAI", value: "openai" },
  { label: "None", value: "none" },
];

const sourceRows: Array<{
  key: keyof CommunityAssistantPolicySettings["contextSources"];
  label: string;
  locked?: boolean;
}> = [
  { key: "communityProfile", label: "Community profile", locked: true },
  { key: "rules", label: "Rules", locked: true },
  { key: "referenceLinks", label: "Reference links" },
  { key: "recentThreads", label: "Recent threads" },
  { key: "threadBodies", label: "Thread bodies" },
  { key: "topComments", label: "Top comments" },
  { key: "membershipState", label: "Viewer membership state" },
  { key: "moderationQueue", label: "Moderator-only queue context" },
  { key: "pinnedKnowledge", label: "Pinned knowledge" },
];

function Section({
  children,
  className,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <Type as="h2" variant="h2">{title}</Type>
        {subtitle ? <p className="max-w-3xl text-base leading-6 text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function FieldRow({
  children,
  description,
  label,
}: {
  children: React.ReactNode;
  description?: string;
  label: string;
}) {
  return (
    <div className="grid gap-3 border-b border-border-soft py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] md:items-center">
      <div className="space-y-1">
        <div className="text-base font-medium leading-6">{label}</div>
        {description ? <p className="text-base leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ToggleRow({
  checked,
  description,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description?: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <FieldRow description={description} label={label}>
      <div className="flex justify-end">
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
      </div>
    </FieldRow>
  );
}

function SelectRow<T extends string>({
  ariaLabel,
  description,
  label,
  onValueChange,
  options,
  value,
}: {
  ariaLabel?: string;
  description?: string;
  label: string;
  onValueChange: (value: T) => void;
  options: Array<Option<T>>;
  value: T;
}) {
  return (
    <FieldRow description={description} label={label}>
      <Select onValueChange={(next) => onValueChange(next as T)} value={value}>
        <SelectTrigger aria-label={ariaLabel ?? label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldRow>
  );
}

function ModelBillingSection({
  onKeyRevoke,
  onKeySave,
  onModelChange,
  settings,
}: {
  onKeyRevoke: () => void;
  onKeySave: (apiKey: string) => void;
  onModelChange: (modelId: string) => void;
  settings: CommunityAssistantPolicySettings;
}) {
  const [apiKeyDraft, setApiKeyDraft] = React.useState("");
  const keyStatus = settings.openRouterKeyStatus;
  const connected = keyStatus.kind === "connected";
  const invalid = keyStatus.kind === "invalid";
  const canSaveKey = apiKeyDraft.trim().length > 0;

  return (
    <Section
      className="border-t border-border-soft pt-6 md:pt-8"
      subtitle="This community pays OpenRouter directly with its own key."
      title="Model and billing"
    >
      <div className="border-y border-border-soft">
        <FieldRow
          description={invalid ? keyStatus.message : "Paste this community's OpenRouter API key. Pirate stores it encrypted and never shows it again."}
          label="OpenRouter key"
        >
          <div className="space-y-2">
            {connected || invalid ? (
              <div className={cn(
                "text-base leading-6",
                connected ? "text-foreground" : "text-destructive",
              )}>
                {connected ? `Current key: sk-or-...${keyStatus.last4}` : `Invalid key: sk-or-...${keyStatus.last4}`}
              </div>
            ) : null}
            <Input
              autoComplete="off"
              className="h-11 rounded-md font-mono text-base"
              onChange={(event) => setApiKeyDraft(event.target.value)}
              placeholder={connected || invalid ? "Paste a new key to rotate" : "sk-or-..."}
              type="password"
              value={apiKeyDraft}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!canSaveKey}
                onClick={() => {
                  onKeySave(apiKeyDraft);
                  setApiKeyDraft("");
                }}
                size="sm"
                variant="outline"
              >
                {connected || invalid ? "Save new key" : "Save key"}
              </Button>
              {connected || invalid ? (
                <Button onClick={onKeyRevoke} size="sm" variant="ghost">
                  Revoke
                </Button>
              ) : null}
            </div>
          </div>
        </FieldRow>
        <FieldRow description="Loaded from OpenRouter and filtered by Pirate policy." label="Model">
          <Select
            disabled={!connected}
            onValueChange={onModelChange}
            value={settings.selectedModelId}
          >
            <SelectTrigger aria-label="OpenRouter model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {settings.availableModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!connected ? (
            <p className="mt-2 text-base leading-6 text-muted-foreground">Save an OpenRouter key to choose a model.</p>
          ) : null}
        </FieldRow>
      </div>
    </Section>
  );
}

function NumberRow({
  description,
  label,
  min = 0,
  onChange,
  suffix,
  value,
}: {
  description?: string;
  label: string;
  min?: number;
  onChange: (value: number | null) => void;
  suffix?: string;
  value: number | null;
}) {
  return (
    <FieldRow description={description} label={label}>
      <div className="flex items-center gap-2">
        <Input
          className="h-11 max-w-32 rounded-md text-center"
          min={min}
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (!raw) {
              onChange(null);
              return;
            }
            const parsed = Number(raw);
            onChange(Number.isFinite(parsed) && parsed >= min ? parsed : value);
          }}
          type="number"
          value={value ?? ""}
        />
        {suffix ? <span className="text-base text-muted-foreground">{suffix}</span> : null}
      </div>
    </FieldRow>
  );
}

function PromptField({
  description,
  label,
  onChange,
  rows = 5,
  value,
}: {
  description?: string;
  label: string;
  onChange: (value: string) => void;
  rows?: number;
  value: string;
}) {
  return (
    <div className="space-y-2 border-b border-border-soft py-4 last:border-b-0">
      <div className="space-y-1">
        <Label className="text-base font-medium leading-6">{label}</Label>
        {description ? <p className="text-base leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      <Textarea
        className="min-h-0 rounded-md font-mono text-base leading-6"
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
    </div>
  );
}

function ContextSourceRow({
  checked,
  disabled,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 border-b border-border-soft py-3 last:border-b-0">
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
      <span className="text-base leading-6">{label}</span>
    </label>
  );
}

function StarterPromptRow({
  index,
  onChange,
  onRemove,
  value,
}: {
  index: number;
  onChange: (value: string) => void;
  onRemove: () => void;
  value: string;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <Input
        aria-label={`Suggested question ${index + 1}`}
        className="h-11 rounded-md"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      <Button aria-label={`Remove suggested question ${index + 1}`} onClick={onRemove} size="sm" variant="outline">
        Remove
      </Button>
    </div>
  );
}

export function CommunityAssistantPolicyPage({
  className,
  onAvatarFileSelect,
  onOpenRouterKeyRevoke,
  onOpenRouterKeySave,
  onSave,
  onSettingsChange,
  saveDisabled = false,
  settings,
  submitState,
}: CommunityAssistantPolicyPageProps) {
  function update(partial: Partial<CommunityAssistantPolicySettings>) {
    onSettingsChange?.({ ...settings, ...partial });
  }

  function updateContextSource(
    source: keyof CommunityAssistantPolicySettings["contextSources"],
    checked: boolean,
  ) {
    update({
      contextSources: {
        ...settings.contextSources,
        [source]: checked,
        communityProfile: true,
        rules: true,
      },
    });
  }

  function updateStarterPrompt(index: number, value: string) {
    update({
      starterPrompts: settings.starterPrompts.map((item, itemIndex) => itemIndex === index ? value : item),
    });
  }

  function removeStarterPrompt(index: number) {
    update({
      starterPrompts: settings.starterPrompts.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function saveOpenRouterKey(apiKey: string) {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    update({
      openRouterKeyStatus: {
        kind: "connected",
        connectedAt: new Date().toISOString(),
        last4: trimmed.slice(-4),
      },
    });
  }

  function revokeKey() {
    update({ openRouterKeyStatus: { kind: "missing" } });
  }

  const handleOpenRouterKeySave = onOpenRouterKeySave ?? saveOpenRouterKey;
  const handleOpenRouterKeyRevoke = onOpenRouterKeyRevoke ?? revokeKey;

  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 space-y-2">
          <Type as="h1" variant="h1" className="md:text-4xl">Community assistant</Type>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">
            Configure the assistant users can open from this community.
          </p>
        </div>
        <Button
          className="community-moderation-inline-save-action w-full sm:w-auto"
          disabled={saveDisabled}
          loading={submitState.kind === "saving"}
          onClick={onSave}
        >
          Save
        </Button>
      </div>

      <Section title="Identity">
        <div className="border-y border-border-soft">
          <ToggleRow
            checked={settings.enabled}
            label="Enable assistant"
            onCheckedChange={(enabled) => update({ enabled })}
          />
          <FieldRow label="Name">
            <Input
              className="h-11 rounded-md"
              onChange={(event) => update({ displayName: event.target.value })}
              value={settings.displayName}
            />
          </FieldRow>
          <FieldRow label="Short bio">
            <Input
              className="h-11 rounded-md"
              onChange={(event) => update({ shortBio: event.target.value })}
              value={settings.shortBio}
            />
          </FieldRow>
          <FieldRow label="Avatar">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {settings.avatarPreviewUrl ? (
                <img
                  alt=""
                  className="size-14 shrink-0 rounded-full border border-border-soft object-cover"
                  src={settings.avatarPreviewUrl}
                />
              ) : (
                <div className="grid size-14 shrink-0 place-items-center rounded-full border border-border-soft bg-muted text-lg font-semibold text-muted-foreground">
                  {settings.displayName.trim().slice(0, 1).toUpperCase() || "A"}
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                <input
                  accept="image/*"
                  className="sr-only"
                  id={AVATAR_INPUT_ID}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (!file) return;
                    onAvatarFileSelect?.(file);
                    update({
                      avatarPreviewUrl: URL.createObjectURL(file),
                    });
                  }}
                  type="file"
                />
                <Button asChild size="sm" variant="outline">
                  <label className="cursor-pointer" htmlFor={AVATAR_INPUT_ID}>
                    Upload image
                  </label>
                </Button>
                {settings.avatarPreviewUrl ? (
                  <Button
                    onClick={() => {
                      onAvatarFileSelect?.(null);
                      update({ avatarPreviewUrl: null, avatarRef: null });
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </FieldRow>
        </div>
      </Section>

      <ModelBillingSection
        onKeyRevoke={() => {
          void handleOpenRouterKeyRevoke();
        }}
        onKeySave={(apiKey) => {
          void handleOpenRouterKeySave(apiKey);
        }}
        onModelChange={(selectedModelId) => update({ selectedModelId })}
        settings={settings}
      />

      <Section
        className="border-t border-border-soft pt-6 md:pt-8"
        subtitle="Moderator instructions sit below the platform safety prompt and above retrieved board context."
        title="Prompts"
      >
        <div className="border-y border-border-soft">
          <PromptField
            description="Community-specific behavior, tone, boundaries, and escalation rules."
            label="System prompt"
            onChange={(systemPrompt) => update({ systemPrompt })}
            rows={7}
            value={settings.systemPrompt}
          />
          <PromptField
            description="The message shown before a user starts a new assistant chat."
            label="Default prompt"
            onChange={(defaultPrompt) => update({ defaultPrompt })}
            rows={3}
            value={settings.defaultPrompt}
          />
          <div className="space-y-3 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="text-base font-medium leading-6">Suggested questions</div>
                <p className="text-base leading-6 text-muted-foreground">
                  Example questions users can tap before they type their first message.
                </p>
              </div>
              <Button
                disabled={settings.starterPrompts.length >= 5}
                onClick={() => update({ starterPrompts: [...settings.starterPrompts, ""] })}
                size="sm"
                variant="outline"
              >
                Add question
              </Button>
            </div>
            <div className="space-y-2">
              {settings.starterPrompts.map((prompt, index) => (
                <StarterPromptRow
                  index={index}
                  key={index}
                  onChange={(value) => updateStarterPrompt(index, value)}
                  onRemove={() => removeStarterPrompt(index)}
                  value={prompt}
                />
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        className="border-t border-border-soft pt-6 md:pt-8"
        subtitle="Start with direct SQL and summaries. Add vector retrieval when boards become too large for cheap, predictable context windows."
        title="Context"
      >
        <div className="border-y border-border-soft">
          <SelectRow
            label="Retrieval mode"
            onValueChange={(contextMode) => update({ contextMode })}
            options={contextModeOptions}
            value={settings.contextMode}
          />
          <div className="grid md:grid-cols-2 md:gap-x-8">
            {sourceRows.map((row) => (
              <ContextSourceRow
                checked={settings.contextSources[row.key]}
                disabled={row.locked}
                key={row.key}
                label={row.label}
                onCheckedChange={(checked) => updateContextSource(row.key, checked)}
              />
            ))}
          </div>
          <NumberRow
            label="Thread limit"
            min={1}
            onChange={(maxContextThreads) => update({ maxContextThreads: maxContextThreads ?? settings.maxContextThreads })}
            value={settings.maxContextThreads}
          />
          <NumberRow
            label="Lookback window"
            min={1}
            onChange={(maxLookbackDays) => update({ maxLookbackDays })}
            suffix="days"
            value={settings.maxLookbackDays}
          />
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title="Memory">
        <div className="border-y border-border-soft">
          <ToggleRow
            checked={settings.memoryEnabled}
            label="Use chat memory"
            onCheckedChange={(memoryEnabled) => update({ memoryEnabled })}
          />
          <ToggleRow
            checked={settings.saveChatsToCommunityDb}
            description="Persist each user's community-assistant thread in the community Turso database."
            label="Save chats in community DB"
            onCheckedChange={(saveChatsToCommunityDb) => update({ saveChatsToCommunityDb })}
          />
          <SelectRow
            label="Retention scope"
            onValueChange={(retentionMode) => update({ retentionMode })}
            options={retentionModeOptions}
            value={settings.retentionMode}
          />
          <NumberRow
            label="Retention"
            min={1}
            onChange={(retentionDays) => update({ retentionDays: retentionDays ?? settings.retentionDays })}
            suffix="days"
            value={settings.retentionDays}
          />
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title="Actions">
        <div className="border-y border-border-soft">
          <SelectRow
            label="Allowed actions"
            onValueChange={(actionMode) => update({ actionMode })}
            options={actionModeOptions}
            value={settings.actionMode}
          />
          <ToggleRow
            checked={settings.requireModeratorApprovalForWrites}
            label="Require approval for writes"
            onCheckedChange={(requireModeratorApprovalForWrites) => update({ requireModeratorApprovalForWrites })}
          />
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title="Voice">
        <div className="border-y border-border-soft">
          <SelectRow
            ariaLabel="Voice mode"
            label="Voice mode"
            onValueChange={(voiceMode) => update({ voiceMode })}
            options={voiceModeOptions}
            value={settings.voiceMode}
          />
          <SelectRow
            label="STT provider"
            onValueChange={(sttProvider) => update({ sttProvider })}
            options={sttProviderOptions}
            value={settings.sttProvider}
          />
          <FieldRow label="STT model">
            <Input
              className="h-11 rounded-md font-mono text-base"
              onChange={(event) => update({ sttModel: event.target.value })}
              value={settings.sttModel}
            />
          </FieldRow>
          <FieldRow description="Disabled until TTS ships." label="TTS voice">
            <Input
              className="h-11 rounded-md"
              disabled={settings.voiceMode !== "voice_replies"}
              onChange={(event) => update({ ttsVoice: event.target.value })}
              placeholder="voice id"
              value={settings.ttsVoice}
            />
          </FieldRow>
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title="Limits">
        <div className="border-y border-border-soft">
          <NumberRow
            label="Per-user daily cap"
            min={1}
            onChange={(perUserDailyMessageCap) => update({ perUserDailyMessageCap })}
            suffix="messages"
            value={settings.perUserDailyMessageCap}
          />
          <ToggleRow
            checked={settings.includeInSovereignExport}
            description="Include assistant settings, prompt revisions, and context index metadata in community exports."
            label="Sovereign export"
            onCheckedChange={(includeInSovereignExport) => update({ includeInSovereignExport })}
          />
        </div>
      </Section>

      {submitState.kind === "error" ? (
        <p className="text-base text-destructive">{submitState.message}</p>
      ) : null}

      <CommunityModerationSaveFooter
        disabled={saveDisabled}
        loading={submitState.kind === "saving"}
        onSave={onSave}
      />
    </section>
  );
}
