"use client";

import * as React from "react";

import { CommunityModerationSaveFooter } from "@/components/compositions/community/moderation-shell/community-moderation-save-footer";
import { Button } from "@/components/primitives/button";
import { Checkbox } from "@/components/primitives/checkbox";
import { FieldRow, ProviderKeyStatusLine } from "@/components/compositions/community/provider-keys/provider-key-field";
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
  AssistantContextMode,
  AssistantVoiceMode,
  CommunityAssistantPolicyPageProps,
  CommunityAssistantPolicySettings,
} from "./community-assistant-policy.types";

const AVATAR_INPUT_ID = "community-assistant-avatar-upload";

type Option<T extends string> = {
  label: string;
  value: T;
};

type AssistantModelOption = CommunityAssistantPolicySettings["availableModels"][number];

const contextModeOptions: Array<Option<AssistantContextMode>> = [
  { label: "Live SQL", value: "live_sql" },
  { label: "Summary cache", value: "summary_cache" },
  { label: "Hybrid vector", value: "hybrid_vector" },
];

const voiceModeOptions: Array<Option<AssistantVoiceMode>> = [
  { label: "Off", value: "off" },
  { label: "Transcription only", value: "transcription_only" },
  { label: "Voice replies", value: "voice_replies" },
  { label: "Text + voice replies", value: "text_and_voice_replies" },
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

function selectedModelLabel(model: AssistantModelOption | undefined, selectedModelId: string): string {
  return model?.label ?? selectedModelId;
}

function modelSearchText(model: AssistantModelOption): string {
  return [
    model.label,
    model.id,
  ].join(" ").toLowerCase();
}

function getModelOptions(settings: CommunityAssistantPolicySettings): AssistantModelOption[] {
  const byId = new Map(settings.availableModels.map((model) => [model.id, model]));
  if (settings.selectedModelId && !byId.has(settings.selectedModelId)) {
    byId.set(settings.selectedModelId, {
      id: settings.selectedModelId,
      label: settings.selectedModelId,
      description: "Selected model is not in the latest OpenRouter response.",
    });
  }
  return [...byId.values()];
}

function ModelSearchInput({
  connected,
  onModelChange,
  settings,
}: {
  connected: boolean;
  onModelChange: (modelId: string) => void;
  settings: CommunityAssistantPolicySettings;
}) {
  const options = React.useMemo(() => getModelOptions(settings), [settings]);
  const selectedModel = options.find((model) => model.id === settings.selectedModelId);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(() => selectedModelLabel(selectedModel, settings.selectedModelId));
  const listId = React.useId();

  React.useEffect(() => {
    if (!open) {
      setQuery(selectedModelLabel(selectedModel, settings.selectedModelId));
    }
  }, [open, selectedModel, settings.selectedModelId]);

  const filteredModels = React.useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const matches = trimmed
      ? options.filter((model) => modelSearchText(model).includes(trimmed))
      : options;
    return matches.slice(0, 50);
  }, [options, query]);

  return (
    <div className="relative">
      <Input
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-label="OpenRouter model"
        autoComplete="off"
        className="h-11 rounded-md"
        disabled={!connected}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search OpenRouter models"
        role="combobox"
        value={query}
      />
      {open && connected ? (
        <div
          className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg"
          id={listId}
          role="listbox"
        >
          {filteredModels.length === 0 ? (
            <div className="px-3 py-3 text-base leading-6 text-muted-foreground">
              No OpenRouter models found.
            </div>
          ) : filteredModels.map((model) => {
            const selected = model.id === settings.selectedModelId;
            return (
              <button
                aria-selected={selected}
                className={cn(
                  "flex h-10 w-full min-w-0 items-center rounded-md px-3 text-start hover:bg-muted",
                  selected && "bg-muted",
                )}
                key={model.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onModelChange(model.id);
                  setQuery(model.label);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span className="min-w-0 truncate font-medium">{model.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ModelBillingSection({
  onModelChange,
  settings,
}: {
  onModelChange: (modelId: string) => void;
  settings: CommunityAssistantPolicySettings;
}) {
  const keyStatus = settings.openRouterKeyStatus;
  const connected = keyStatus.kind === "connected";

  return (
    <Section
      className="border-t border-border-soft pt-6 md:pt-8"
      subtitle="This community pays OpenRouter directly with its own key."
      title="Model and billing"
    >
      <div className="border-y border-border-soft">
        <FieldRow description="Assistant model responses use the community OpenRouter integration." label="OpenRouter key">
          <ProviderKeyStatusLine keyStatus={keyStatus} manageHref="../integrations" />
        </FieldRow>
        <FieldRow description="Search the live OpenRouter model list for this community's key." label="Model">
          <ModelSearchInput connected={connected} onModelChange={onModelChange} settings={settings} />
          {!connected ? (
            <p className="mt-2 text-base leading-6 text-muted-foreground">
              Connect OpenRouter in Integrations to choose a model.
            </p>
          ) : null}
        </FieldRow>
      </div>
    </Section>
  );
}

function NumberRow({
  description,
  label,
  max,
  min = 0,
  onChange,
  suffix,
  value,
}: {
  description?: string;
  label: string;
  max?: number;
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
          max={max}
          min={min}
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (!raw) {
              onChange(null);
              return;
            }
            const parsed = Number(raw);
            const withinMax = max == null || parsed <= max;
            onChange(Number.isInteger(parsed) && parsed >= min && withinMax ? parsed : value);
          }}
          step={1}
          type="number"
          value={value ?? ""}
        />
        {suffix ? <span className="text-base text-muted-foreground">{suffix}</span> : null}
      </div>
    </FieldRow>
  );
}

function VoiceSection({
  onChange,
  settings,
}: {
  onChange: (partial: Partial<CommunityAssistantPolicySettings>) => void;
  settings: CommunityAssistantPolicySettings;
}) {
  const voiceEnabled = settings.voiceMode !== "off";
  const voiceRepliesEnabled = settings.voiceMode === "voice_replies"
    || settings.voiceMode === "text_and_voice_replies";
  const elevenLabsConnected = settings.elevenLabsKeyStatus.kind === "connected";
  const scribeModel = settings.sttProvider === "elevenlabs"
    && settings.sttModel.trim()
    && settings.sttModel !== "voxtral-mini-latest"
    && settings.sttModel !== "whisper-1"
    ? settings.sttModel.trim()
    : "scribe_v2";

  function updateVoiceMode(voiceMode: AssistantVoiceMode) {
    onChange({
      voiceMode,
      sttProvider: voiceMode === "off" ? settings.sttProvider : "elevenlabs",
      sttModel: voiceMode === "off" ? settings.sttModel : scribeModel,
      ttsProvider: voiceMode === "voice_replies" || voiceMode === "text_and_voice_replies"
        ? "elevenlabs"
        : settings.ttsProvider,
    });
  }

  return (
    <Section
      className="border-t border-border-soft pt-6 md:pt-8"
      subtitle="Voice input uses ElevenLabs Scribe. Voice replies use the configured ElevenLabs voice."
      title="Voice"
    >
      <div className="border-y border-border-soft">
        <FieldRow description="Assistant voice uses the community ElevenLabs integration." label="ElevenLabs key">
          <ProviderKeyStatusLine keyStatus={settings.elevenLabsKeyStatus} manageHref="../integrations" />
        </FieldRow>
        <SelectRow
          description={elevenLabsConnected
            ? "Transcription only accepts spoken input and replies with text. Voice replies can speak assistant responses where supported."
            : "Connect ElevenLabs in Integrations before enabling transcription or voice replies."}
          label="Voice mode"
          onValueChange={updateVoiceMode}
          options={voiceModeOptions}
          value={settings.voiceMode}
        />
        {voiceEnabled ? (
          <>
            <FieldRow description="Speech-to-text provider used for web mic input and Telegram voice notes." label="STT provider">
              <Input className="h-11 rounded-md" disabled value="ElevenLabs Scribe" />
            </FieldRow>
            <FieldRow description="ElevenLabs Scribe model. Use scribe_v2 unless testing a newer model." label="STT model">
              <Input
                className="h-11 rounded-md font-mono"
                onChange={(event) => onChange({ sttModel: event.target.value, sttProvider: "elevenlabs" })}
                value={settings.sttModel}
              />
            </FieldRow>
          </>
        ) : null}
        {voiceRepliesEnabled ? (
          <>
            <FieldRow description="Text-to-speech provider used for assistant voice playback and Telegram voice replies." label="TTS provider">
              <Input className="h-11 rounded-md" disabled value="ElevenLabs" />
            </FieldRow>
            <FieldRow description="The ElevenLabs voice ID for spoken assistant replies." label="TTS voice">
              <Input
                className="h-11 rounded-md font-mono"
                onChange={(event) => onChange({ ttsProvider: "elevenlabs", ttsVoice: event.target.value })}
                placeholder="ElevenLabs voice ID"
                value={settings.ttsVoice}
              />
            </FieldRow>
          </>
        ) : null}
      </div>
    </Section>
  );
}

function TelegramSection({
  onChange,
  settings,
}: {
  onChange: (partial: Partial<CommunityAssistantPolicySettings>) => void;
  settings: CommunityAssistantPolicySettings;
}) {
  return (
    <Section
      className="border-t border-border-soft pt-6 md:pt-8"
      subtitle="Controls what this community's bot does in private Telegram chats."
      title="Telegram"
    >
      <div className="border-y border-border-soft">
        <ToggleRow
          checked={settings.telegramPrivateAssistantEnabled}
          description="Let learners ask about the line they are studying, in a private chat with the bot. Answers use the exercise and the learner's latest attempt."
          label="Answer study questions"
          onCheckedChange={(telegramPrivateAssistantEnabled) => onChange({ telegramPrivateAssistantEnabled })}
        />
        <ToggleRow
          checked={settings.telegramPreviewEnabled}
          description="Let unlinked or non-member Telegram users ask limited preview questions before joining."
          label="Preview before join"
          onCheckedChange={(telegramPreviewEnabled) => onChange({ telegramPreviewEnabled })}
        />
        <NumberRow
          description="Per Telegram user, per community. Set to 0 to disable preview answers."
          label="Preview daily cap"
          max={50}
          min={0}
          onChange={(telegramPreviewDailyCap) => onChange({
            telegramPreviewDailyCap: telegramPreviewDailyCap ?? settings.telegramPreviewDailyCap,
          })}
          suffix="messages"
          value={settings.telegramPreviewDailyCap}
        />
      </div>
    </Section>
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

let nextStarterPromptId = 0;

function createStarterPromptId() {
  nextStarterPromptId += 1;
  return `starter-prompt-${nextStarterPromptId}`;
}

export function CommunityAssistantPolicyPage({
  className,
  onAvatarFileSelect,
  onSave,
  onSettingsChange,
  saveDisabled = false,
  settings,
  submitState,
}: CommunityAssistantPolicyPageProps) {
  const [starterPromptIds, setStarterPromptIds] = React.useState(
    () => settings.starterPrompts.map(() => createStarterPromptId()),
  );

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
    setStarterPromptIds((current) => current.filter((_, itemIndex) => itemIndex !== index));
    update({
      starterPrompts: settings.starterPrompts.filter((_, itemIndex) => itemIndex !== index),
    });
  }

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
        onModelChange={(selectedModelId) => update({ selectedModelId })}
        settings={settings}
      />

      <VoiceSection
        onChange={update}
        settings={settings}
      />

      <TelegramSection
        onChange={update}
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
                onClick={() => {
                  setStarterPromptIds((current) => [...current, createStarterPromptId()]);
                  update({ starterPrompts: [...settings.starterPrompts, ""] });
                }}
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
                  key={starterPromptIds[index]}
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
            max={50}
            min={1}
            onChange={(maxContextThreads) => update({ maxContextThreads: maxContextThreads ?? settings.maxContextThreads })}
            value={settings.maxContextThreads}
          />
          <NumberRow
            label="Lookback window"
            max={365}
            min={1}
            onChange={(maxLookbackDays) => update({ maxLookbackDays })}
            suffix="days"
            value={settings.maxLookbackDays}
          />
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-6 md:pt-8" title="Limits">
        <div className="border-y border-border-soft">
          <NumberRow
            label="Per-user daily cap"
            max={10000}
            min={1}
            onChange={(perUserDailyMessageCap) => update({ perUserDailyMessageCap })}
            suffix="messages"
            value={settings.perUserDailyMessageCap}
          />
          <NumberRow
            label="Retention"
            max={3650}
            min={1}
            onChange={(retentionDays) => update({ retentionDays: retentionDays ?? settings.retentionDays })}
            suffix="days"
            value={settings.retentionDays}
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
