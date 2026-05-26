"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChatCircleText,
  Check,
  Microphone,
  PaperPlaneRight,
  Plus,
  Signature,
  SpeakerHigh,
  Stop,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { IconButton } from "@/components/primitives/icon-button";
import { StandardModalIconBadge } from "@/components/compositions/system/modal/standard-modal-layout";
import { Input } from "@/components/primitives/input";
import { AutoResizeTextarea } from "@/components/primitives/auto-resize-textarea";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import { isChatTarget } from "@/lib/chat/chat-addressing";
import type { ChatConversation, ChatMessageRecord } from "@/lib/chat/chat-types";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import {
  ChatMessageContent,
  formatListTime,
  formatThreadTimeDivider,
  formatUnreadCount,
  normalizeUnreadCount,
  shouldShowThreadTimeDivider,
} from "./chat-route-formatting";

export function ChatSetupState({
  busy = false,
  compact = false,
  description,
  error,
  onRetry,
  presentation = "default",
  retryLabel = "Retry",
  title,
}: {
  busy?: boolean;
  compact?: boolean;
  description: string;
  error?: string | null;
  onRetry: () => void;
  presentation?: "default" | "signature";
  retryLabel?: string;
  title: string;
}) {
  if (presentation !== "signature") {
    return (
      <section className="grid h-full min-h-0 w-full flex-1 place-items-center bg-background px-4 py-6">
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex flex-col gap-8 px-5 pb-5 pt-5 text-start sm:rounded-lg sm:border sm:border-border sm:bg-card sm:px-8 sm:pb-8 sm:pt-8">
            <div className="space-y-5 pe-10 text-start">
              <div className="flex items-center gap-4">
                <StandardModalIconBadge>
                  <ChatCircleText className="size-8" weight="duotone" />
                </StandardModalIconBadge>
                <Type
                  as="h2"
                  className="min-w-0 text-2xl leading-8 sm:text-3xl sm:leading-tight"
                  variant="h1"
                >
                  {title}
                </Type>
              </div>
              <Type
                as="p"
                className="w-full leading-7 text-foreground sm:leading-8"
                variant="body"
              >
                {description}
              </Type>
            </div>

            <div className="flex flex-col gap-5">
              {error ? (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                  <WarningCircle
                    className="mt-0.5 size-5 shrink-0 text-destructive"
                    weight="fill"
                  />
                  <Type as="p" className="text-foreground" variant="body">
                    {error}
                  </Type>
                </div>
              ) : null}
              <Button className="h-14 w-full" loading={busy} onClick={onRetry}>
                {retryLabel}
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 w-full flex-1 flex-col bg-background sm:grid sm:place-items-center sm:px-4 sm:py-6">
      <div className={cn("mx-auto flex min-h-0 w-full flex-1 flex-col sm:block sm:min-h-0 sm:flex-none", compact ? "max-w-md" : "max-w-2xl")}>
        <div className={cn(
          "flex min-h-0 flex-1 flex-col px-8 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-8 text-center sm:min-h-0 sm:flex-none sm:rounded-lg sm:border sm:border-border sm:bg-card sm:text-start",
          compact ? "sm:gap-6 sm:px-6 sm:pb-6 sm:pt-6" : "sm:gap-8 sm:px-8 sm:pb-8 sm:pt-8",
        )}>
          <div className={cn(
            "flex min-h-0 flex-1 flex-col items-center justify-center gap-6 pb-8 sm:min-h-0 sm:flex-none sm:items-start sm:justify-start sm:gap-5 sm:pb-0 sm:pe-10 sm:text-start",
            compact && "sm:pe-0",
          )}>
            <div className="flex flex-col items-center gap-7 sm:flex-row sm:gap-4">
              <div className="relative grid size-32 place-items-center rounded-full border border-foreground/10 bg-card/70 text-primary shadow-[inset_0_1px_24px_rgb(255_255_255_/_0.04)] sm:hidden">
                <Signature className="size-16" weight="duotone" />
                <span className="absolute -bottom-1 -right-1 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Check aria-hidden className="size-7" weight="bold" />
                </span>
              </div>
              <StandardModalIconBadge className={cn("hidden sm:inline-grid", compact && "sm:size-12")}>
                <Signature className="size-8" weight="duotone" />
              </StandardModalIconBadge>
              <Type
                as="h2"
                className={cn(
                  "min-w-0 text-5xl font-bold leading-tight tracking-normal sm:leading-tight",
                  compact ? "sm:text-2xl" : "sm:text-3xl",
                )}
                variant="h1"
              >
                {title}
              </Type>
            </div>
            <Type
              as="p"
              className="mx-auto max-w-72 whitespace-pre-line text-xl leading-9 text-muted-foreground sm:mx-0 sm:max-w-none sm:text-base sm:leading-8 sm:text-foreground"
              variant="body"
            >
              {description}
            </Type>
          </div>

          <div className={cn("flex shrink-0 flex-col gap-5 border-t border-border-soft/60 pt-5 sm:border-t-0 sm:pt-0", compact && "sm:gap-4")}>
            {error ? (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-start">
                <WarningCircle
                  className="mt-0.5 size-5 shrink-0 text-destructive"
                  weight="fill"
                />
                <Type as="p" className="text-foreground" variant="body">
                  {error}
                </Type>
              </div>
            ) : null}
            <Button className={cn("h-16 w-full text-xl sm:text-base", compact ? "sm:h-12" : "sm:h-14")} loading={busy} onClick={onRetry}>
              {retryLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ConversationList({
  activeConversationId,
  className,
  conversations,
  hideHeader,
  loading,
  refreshing = false,
  onNew,
  onSelect,
}: {
  activeConversationId?: string | null;
  className?: string;
  conversations: ChatConversation[];
  hideHeader?: boolean;
  loading: boolean;
  refreshing?: boolean;
  onNew: () => void;
  onSelect: (conversationId: string) => void;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");
  const chat = copy.chat;
  return (
    <aside className={cn("flex h-full min-h-0 flex-col border-e border-border-soft bg-background md:bg-card", className)}>
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-3 border-b border-border-soft bg-background p-4 md:bg-card">
          <Type as="h1" variant="h3">{chat.messagesHeading}</Type>
          <IconButton aria-label={chat.newConversationAriaLabel} onClick={onNew} variant="ghost">
            <Plus aria-hidden className="size-6" weight="bold" />
          </IconButton>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="grid h-full place-items-center">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="grid gap-3 px-4 py-8 text-center">
            <ChatCircleText aria-hidden className="mx-auto size-9 text-muted-foreground" />
            <Type as="p" variant="body" className="text-muted-foreground">{chat.noMessagesYet}</Type>
          </div>
        ) : (
          <div className="flex flex-col">
            {conversations.map((conversation) => {
              const timestampLabel = formatListTime(conversation.updatedAt, chat.now);
              const unreadCount = normalizeUnreadCount(conversation.unreadCount);
              const hasUnread = unreadCount > 0;
              const unreadLabel = unreadCount === 1
                ? chat.unreadMessageCountOne.replace("{count}", String(unreadCount))
                : chat.unreadMessageCount.replace("{count}", String(unreadCount));
              return (
                <button
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted active:bg-muted",
                    activeConversationId === conversation.id && "bg-muted",
                  )}
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                  type="button"
                >
                  <Avatar fallback={conversation.title} fallbackSeed={conversation.avatarSeed ?? conversation.peerAddress} size="lg" src={conversation.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Type as="span" variant="body-strong" className={cn("truncate", hasUnread && "font-bold")}>
                        {conversation.title}
                      </Type>
                      {timestampLabel ? (
                        <Type as="span" variant="caption" className="shrink-0 whitespace-nowrap">
                          {timestampLabel}
                        </Type>
                      ) : null}
                    </div>
                    <div className="flex min-w-0 items-center gap-3">
                      <Type as="span" variant="caption" className={cn("block min-w-0 flex-1 truncate", hasUnread && "font-medium text-foreground/90")}>
                        {conversation.preview}
                      </Type>
                      {hasUnread ? (
                        <>
                          <span className="sr-only">{unreadLabel}</span>
                          <span
                            aria-hidden="true"
                            className="notification-count-badge h-5 min-w-5 shrink-0 px-1.5 tabular-nums"
                          >
                            {formatUnreadCount(unreadCount)}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
            {refreshing ? (
              <div className="grid place-items-center px-4 py-6">
                <Spinner className="size-5 text-muted-foreground" />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}

export function NewConversationView({
  busy,
  error,
  hideHeader,
  onBack,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  error?: string | null;
  hideHeader?: boolean;
  onBack: () => void;
  onClose?: () => void;
  onSubmit: (target: string) => void;
}) {
  const [target, setTarget] = React.useState("");
  const { isRtl, locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");
  const chat = copy.chat;

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      {!hideHeader ? (
        <div className="flex items-center gap-3 border-b border-border-soft bg-background p-4 md:bg-card">
          {onClose ? (
            <Button aria-label={copy.common.close} onClick={onClose} size="icon" variant="ghost">
              <X aria-hidden className="size-5" />
            </Button>
          ) : (
            <Button aria-label={copy.common.backHome} onClick={onBack} size="icon" variant="ghost">
              {isRtl ? <ArrowRight aria-hidden className="size-5" /> : <ArrowLeft aria-hidden className="size-5" />}
            </Button>
          )}
          <Type as="h1" variant="h3">{chat.newMessageTitle}</Type>
        </div>
      ) : null}
      <form
        className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(target);
        }}
      >
        <label className="grid gap-2">
          <Type as="span" variant="label">{chat.toLabel}</Type>
          <Input
            autoCapitalize="none"
            autoComplete="off"
            onChange={(event) => setTarget(event.target.value)}
            placeholder={chat.recipientPlaceholder}
            value={target}
          />
        </label>
        {error ? (
          <Type as="p" variant="body" className="text-destructive">{error}</Type>
        ) : null}
        <Button disabled={!isChatTarget(target)} loading={busy} type="submit">
          {chat.openChatAction}
        </Button>
      </form>
    </section>
  );
}

export function ThreadView({
  conversation,
  error,
  hideHeader,
  initialDraft,
  items,
  loading,
  onBack,
  onClose,
  onOpenProfile,
  onSend,
  onSynthesizeSpeech,
  onSendAudio,
  sending,
}: {
  conversation: ChatConversation | null;
  error?: string | null;
  hideHeader?: boolean;
  initialDraft?: string;
  items: ChatMessageRecord[];
  loading?: boolean;
  onBack: () => void;
  onClose?: () => void;
  onOpenProfile?: (href: string) => void;
  onSend: (message: string) => void;
  onSynthesizeSpeech?: (text: string) => Promise<Blob>;
  onSendAudio?: (file: File) => Promise<void>;
  sending: boolean;
}) {
  const [draft, setDraft] = React.useState("");
  const [playingMessageId, setPlayingMessageId] = React.useState<string | null>(null);
  const [voiceState, setVoiceState] = React.useState<"idle" | "requesting" | "recording" | "sending" | "error">("idle");
  const [voiceError, setVoiceError] = React.useState<string | null>(null);
  const { isRtl, locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");
  const chat = copy.chat;
  const seededInitialDraftRef = React.useRef<string | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const recordingChunksRef = React.useRef<BlobPart[]>([]);
  const recordingStreamRef = React.useRef<MediaStream | null>(null);
  const suppressNextVoiceClickRef = React.useRef(false);
  const speechAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const speechUrlRef = React.useRef<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [renderedAt] = React.useState(() => Date.now());
  const profileHref = conversation?.profileHref;
  const voiceInputAvailable = Boolean(conversation?.voiceTranscriptionEnabled && onSendAudio);
  const voiceRepliesAvailable = Boolean(conversation?.voiceRepliesEnabled && onSynthesizeSpeech);
  const voiceBusy = voiceState === "requesting" || voiceState === "sending";
  const recording = voiceState === "recording";
  const draftHasText = Boolean(draft.trim());
  const showComposerVoiceAction = voiceInputAvailable && !draftHasText;
  const submitDraft = React.useCallback(() => {
    const next = draft.trim();
    if (!next || !conversation || sending) return;
    setDraft("");
    onSend(next);
  }, [conversation, draft, onSend, sending]);

  const stopRecordingStream = React.useCallback(() => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  }, []);

  const stopSpeechPlayback = React.useCallback(() => {
    speechAudioRef.current?.pause();
    speechAudioRef.current = null;
    if (speechUrlRef.current) {
      URL.revokeObjectURL(speechUrlRef.current);
      speechUrlRef.current = null;
    }
    setPlayingMessageId(null);
  }, []);

  React.useEffect(() => {
    const nextDraft = initialDraft?.trim();
    if (!nextDraft || draft.trim() || seededInitialDraftRef.current === nextDraft) return;
    seededInitialDraftRef.current = nextDraft;
    setDraft(nextDraft);
  }, [draft, initialDraft]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, [items.length, conversation?.id]);

  React.useEffect(() => () => {
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    stopRecordingStream();
    stopSpeechPlayback();
  }, [stopRecordingStream, stopSpeechPlayback]);

  const handleFormSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitDraft();
    },
    [submitDraft],
  );

  const handleTextareaKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
        return;
      }
      event.preventDefault();
      submitDraft();
    },
    [submitDraft],
  );

  const stopVoiceRecording = React.useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const startVoiceRecording = React.useCallback(async () => {
    if (!voiceInputAvailable || sending) {
      return;
    }
    if (recorderRef.current?.state === "recording" || voiceState === "requesting" || voiceState === "sending") {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined" || !onSendAudio) {
      setVoiceState("error");
      setVoiceError("Voice recording is not available in this browser.");
      return;
    }

    setVoiceState("requesting");
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordingStreamRef.current = stream;
      recorderRef.current = recorder;
      recordingChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        stopRecordingStream();
        setVoiceState("error");
        setVoiceError("Could not record audio.");
      };
      recorder.onstop = () => {
        const chunks = recordingChunksRef.current;
        const type = recorder.mimeType || mimeType || "audio/webm";
        stopRecordingStream();
        recorderRef.current = null;
        if (chunks.length === 0) {
          setVoiceState("error");
          setVoiceError("No audio was recorded.");
          return;
        }
        const blob = new Blob(chunks, { type });
        if (blob.size <= 0) {
          setVoiceState("error");
          setVoiceError("No audio was recorded.");
          return;
        }
        setVoiceState("sending");
        void onSendAudio(new File([blob], "assistant-voice.webm", { type }))
          .then(() => {
            setVoiceState("idle");
          })
          .catch((nextError) => {
            setVoiceState("error");
            setVoiceError(nextError instanceof Error ? nextError.message : "Could not send voice message.");
          });
      };
      recorder.start();
      setVoiceState("recording");
    } catch (nextError) {
      stopRecordingStream();
      setVoiceState("error");
      setVoiceError(nextError instanceof Error && nextError.name === "NotAllowedError"
        ? "Microphone permission was denied."
        : "Could not start voice recording.");
    }
  }, [onSendAudio, sending, stopRecordingStream, voiceInputAvailable, voiceState]);

  const handleVoiceButtonClick = React.useCallback(() => {
    if (suppressNextVoiceClickRef.current) {
      suppressNextVoiceClickRef.current = false;
      return;
    }
    if (recording) {
      stopVoiceRecording();
      return;
    }
    void startVoiceRecording();
  }, [recording, startVoiceRecording, stopVoiceRecording]);

  const handleVoicePointerDown = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") {
      return;
    }
    event.preventDefault();
    suppressNextVoiceClickRef.current = true;
    void startVoiceRecording();
  }, [startVoiceRecording]);

  const handleVoicePointerEnd = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") {
      return;
    }
    event.preventDefault();
    suppressNextVoiceClickRef.current = true;
    stopVoiceRecording();
  }, [stopVoiceRecording]);

  const handlePlaySpeech = React.useCallback(async (message: ChatMessageRecord) => {
    if (!voiceRepliesAvailable || !onSynthesizeSpeech) {
      return;
    }
    if (playingMessageId === message.id) {
      stopSpeechPlayback();
      return;
    }
    stopSpeechPlayback();
    setVoiceError(null);
    setPlayingMessageId(message.id);
    try {
      const audioBlob = await onSynthesizeSpeech(message.content);
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      speechUrlRef.current = url;
      speechAudioRef.current = audio;
      audio.onended = stopSpeechPlayback;
      audio.onerror = () => {
        setVoiceError("Could not play voice reply.");
        stopSpeechPlayback();
      };
      await audio.play();
    } catch (nextError) {
      setVoiceError(nextError instanceof Error ? nextError.message : "Could not play voice reply.");
      stopSpeechPlayback();
    }
  }, [onSynthesizeSpeech, playingMessageId, stopSpeechPlayback, voiceRepliesAvailable]);

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      {!hideHeader ? (
        <div className="flex items-center gap-3 border-b border-border-soft bg-background px-4 py-3 md:bg-card">
          {onClose ? (
            <Button aria-label={copy.common.close} className="md:hidden" onClick={onClose} size="icon" variant="ghost">
              <X aria-hidden className="size-5" />
            </Button>
          ) : (
            <Button aria-label={copy.common.backHome} className="md:hidden" onClick={onBack} size="icon" variant="ghost">
              {isRtl ? <ArrowRight aria-hidden className="size-5" /> : <ArrowLeft aria-hidden className="size-5" />}
            </Button>
          )}
          {profileHref && onOpenProfile ? (
            <button
              className="flex min-w-0 flex-1 items-center gap-3 text-start"
              onClick={() => onOpenProfile(profileHref)}
              type="button"
            >
              {conversation ? <Avatar fallback={conversation.title} fallbackSeed={conversation.avatarSeed ?? conversation.peerAddress} size="sm" src={conversation.avatarUrl} /> : null}
              <div className="min-w-0 flex-1">
                <Type as="h1" variant="h4" className="truncate">
                  {conversation?.title ?? chat.conversationFallbackTitle}
                </Type>
                {conversation?.targetLabel ? (
                  <Type as="p" variant="caption" className="truncate">{conversation.targetLabel}</Type>
                ) : null}
              </div>
            </button>
          ) : (
            <>
              {conversation ? <Avatar fallback={conversation.title} fallbackSeed={conversation.avatarSeed ?? conversation.peerAddress} size="sm" src={conversation.avatarUrl} /> : null}
              <div className="min-w-0 flex-1">
                <Type as="h1" variant="h4" className="truncate">
                  {conversation?.title ?? chat.conversationFallbackTitle}
                </Type>
                {conversation?.targetLabel ? (
                  <Type as="p" variant="caption" className="truncate">{conversation.targetLabel}</Type>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
      {error && items.length > 0 ? (
        <div className="flex items-center gap-2 border-b border-border-soft bg-background px-4 py-3 text-destructive md:bg-card">
          <WarningCircle aria-hidden className="size-5 shrink-0" />
          <Type as="p" variant="body" className="text-destructive">{error}</Type>
        </div>
      ) : null}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {loading ? (
          <div className="grid h-full place-items-center">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : error && items.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div className="grid max-w-sm gap-3">
              <WarningCircle aria-hidden className="mx-auto size-8 text-destructive" />
              <Type as="p" variant="body" className="text-foreground">{error}</Type>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <Type as="p" variant="body" className="text-muted-foreground">{chat.startConversation}</Type>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {items.map((message, index) => {
              const timestampLabel = formatThreadTimeDivider(message.createdAt, renderedAt, undefined, chat.yesterday);
              const showTimeDivider = shouldShowThreadTimeDivider(message, items[index - 1]);
              const sentTimeLabel = timestampLabel ? `Sent ${timestampLabel}.` : "";
              const voiceSource = message.source?.kind === "voice" ? message.source : null;
              return (
                <React.Fragment key={message.id}>
                  {showTimeDivider && timestampLabel ? (
                    <Type as="div" variant="caption" className="py-1 text-center text-muted-foreground">
                      {timestampLabel}
                    </Type>
                  ) : null}
                  <div
                    className={cn("flex", message.sender === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "relative min-w-0 max-w-[78%] rounded-[var(--radius-lg)] px-4 py-3",
                        message.sender === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-card-foreground",
                      )}
                      title={timestampLabel}
                    >
                      {sentTimeLabel ? <span className="sr-only">{sentTimeLabel}</span> : null}
                      {voiceSource ? (
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              aria-hidden
                              className={cn(
                                "grid size-8 shrink-0 place-items-center rounded-full",
                                message.sender === "user" ? "bg-primary-foreground/15" : "bg-muted",
                              )}
                            >
                              <Microphone className="size-4" weight="fill" />
                            </span>
                            <Type
                              as="div"
                              variant="body"
                              className={cn("font-medium", message.sender === "user" ? "text-primary-foreground" : undefined)}
                            >
                              Voice message
                            </Type>
                          </div>
                          <Type
                            as="div"
                            variant="body"
                            className={cn(
                              "leading-relaxed",
                              message.sender === "user" ? "text-primary-foreground/85" : "text-muted-foreground",
                            )}
                          >
                            <span className="sr-only">Transcript: </span>
                            <ChatMessageContent content={voiceSource.transcript} />
                          </Type>
                        </div>
                      ) : (
                        <Type
                          as="div"
                          variant="body"
                          className={cn(
                            message.sender === "user" ? "text-primary-foreground" : undefined,
                          )}
                        >
                          <ChatMessageContent content={message.content} />
                        </Type>
                      )}
                      {voiceRepliesAvailable && message.sender === "peer" ? (
                        <div className="mt-2 flex justify-end">
                          <Button
                            aria-label={playingMessageId === message.id ? "Stop voice reply" : "Play voice reply"}
                            className="size-8"
                            onClick={() => {
                              void handlePlaySpeech(message);
                            }}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            {playingMessageId === message.id
                              ? <Stop aria-hidden className="size-4" weight="fill" />
                              : <SpeakerHigh aria-hidden className="size-4" weight="fill" />}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
      <form
        className="flex items-end gap-3 border-t border-border-soft bg-background p-4 md:bg-card"
        onSubmit={handleFormSubmit}
      >
        <AutoResizeTextarea
          aria-label={chat.messageLabel}
          className="min-h-11 rounded-[var(--radius-2_5xl)] py-2.5 leading-5"
          disabled={!conversation || sending || voiceState === "sending"}
          maxRows={5}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder={chat.messagePlaceholder}
          rows={1}
          value={draft}
        />
        {showComposerVoiceAction ? (
          <Button
            aria-label={recording ? "Stop voice recording" : "Record voice message"}
            active={recording}
            className="shrink-0 touch-none select-none"
            disabled={!conversation || sending || voiceBusy}
            loading={voiceBusy}
            onClick={handleVoiceButtonClick}
            onPointerCancel={handleVoicePointerEnd}
            onPointerDown={handleVoicePointerDown}
            onPointerLeave={recording ? handleVoicePointerEnd : undefined}
            onPointerUp={handleVoicePointerEnd}
            size="icon"
            type="button"
            variant={recording ? "destructive" : "default"}
          >
            {recording ? <Stop aria-hidden className="size-5" weight="fill" /> : <Microphone aria-hidden className="size-5" weight="fill" />}
          </Button>
        ) : (
          <Button aria-label={chat.sendMessageAriaLabel} className="shrink-0" disabled={!draftHasText || !conversation || voiceState === "sending"} loading={sending} size="icon" type="submit">
            <PaperPlaneRight aria-hidden className="size-5" weight="fill" />
          </Button>
        )}
      </form>
      {voiceError ? (
        <div className="border-t border-border-soft bg-background px-4 pb-3 text-base text-destructive md:bg-card">
          {voiceError}
        </div>
      ) : null}
    </section>
  );
}

export function EmptyThread({ onNew }: { onNew: () => void }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");
  const chat = copy.chat;
  return (
    <section className="hidden h-full min-h-0 place-items-center bg-background px-4 text-center md:grid">
      <div className="grid max-w-md gap-4">
        <ChatCircleText aria-hidden className="mx-auto size-12 text-muted-foreground" />
        <Type as="h1" variant="h2">{chat.selectConversationTitle}</Type>
        <Button onClick={onNew} variant="secondary">{chat.newConversationAction}</Button>
      </div>
    </section>
  );
}
