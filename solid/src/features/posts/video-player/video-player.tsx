import type { JSX } from "@solidjs/web";
import { Show, createEffect, createSignal } from "solid-js";

import { Button, IconPause, IconPlay, Spinner, Type, cn } from "../../../design-system";
import { getVideoPlayerState } from "./video-player-model";

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  aspectRatio?: number;
  playsinline?: boolean;
  loop?: boolean;
  currentTime?: number;
  autoPlay?: boolean;
  class?: string;
  onEnded?: () => void;
}

/** Small native player boundary for deterministic Storybook and SSR-safe markup. */
export function VideoPlayer(props: VideoPlayerProps) {
  const state = () => getVideoPlayerState(props);
  const style = () => props.aspectRatio ? { "aspect-ratio": String(props.aspectRatio) } : undefined;
  let videoRef: HTMLVideoElement | undefined;
  const [isPlaying, setIsPlaying] = createSignal(props.autoPlay === true);
  const [isLoaded, setIsLoaded] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false, { ownedWrite: true });
  const [error, setError] = createSignal<string | null>(null, { ownedWrite: true });
  const [progress, setProgress] = createSignal(state().startAtSeconds, { ownedWrite: true });
  const setInitialTime: JSX.EventHandler<HTMLVideoElement, Event> = (event) => {
    const startAt = state().startAtSeconds;
    if (startAt > 0) event.currentTarget.currentTime = startAt;
    setIsLoaded(true);
    setIsLoading(false);
  };
  const togglePlay = () => {
    const video = videoRef;
    if (!video || !state().canPlay) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => setError("Playback could not be started."));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };
  const seek = (event: InputEvent & { currentTarget: HTMLInputElement }) => {
    const next = Number(event.currentTarget.value);
    if (videoRef && Number.isFinite(next)) videoRef.currentTime = next;
    setProgress(next);
  };

  createEffect(
    () => props.src,
    (src) => {
      if (!videoRef || !src.trim()) return;
      setIsLoading(true);
      setError(null);
      videoRef.load();
    },
  );

  return (
    <div
      class={cn("group relative w-full overflow-hidden rounded-[var(--radius-lg)] bg-black", !props.aspectRatio && "aspect-video", props.class)}
      data-video-player-state={error() ? "error" : isLoading() ? "loading" : state().canPlay ? "ready" : "unavailable"}
      onClick={(event) => {
        if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement) return;
        togglePlay();
      }}
      style={style()}
    >
      <Show when={props.poster}>
        {(poster) => <img alt="" class="absolute inset-0 h-full w-full object-cover" src={poster()} />}
      </Show>
      <video
        aria-label={props.title ?? "Video"}
        autoplay={props.autoPlay}
        loop={state().looping}
        muted
        onError={() => { setError("Video could not be loaded."); setIsLoading(false); setIsPlaying(false); }}
        onEnded={() => { setIsPlaying(false); props.onEnded?.(); }}
        onLoadedMetadata={setInitialTime}
        onPlaying={() => { setIsPlaying(true); setIsLoading(false); }}
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
        playsinline={props.playsinline ?? true}
        poster={props.poster}
        preload="metadata"
        ref={(element) => { videoRef = element; }}
        src={props.src}
        class="absolute inset-0 h-full w-full object-contain"
      />
      <Show when={state().canPlay && !error()}>
        <Button
          aria-label={isPlaying() ? "Pause video" : "Play video"}
          class="absolute inset-0 z-10 flex size-full items-center justify-center rounded-none bg-transparent hover:bg-black/15"
          onClick={(event) => { event.stopPropagation(); togglePlay(); }}
          type="button"
          variant="ghost"
        >
          <span class="flex size-16 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Show when={isPlaying()} fallback={<IconPlay class="size-8" />}><IconPause class="size-8" /></Show>
          </span>
        </Button>
        <div class="absolute inset-x-3 bottom-3 z-20 flex items-center gap-2">
          <Button aria-label={isPlaying() ? "Pause video" : "Play video"} class="shrink-0" onClick={(event) => { event.stopPropagation(); togglePlay(); }} size="sm" type="button" variant="secondary">
            <Show when={isPlaying()} fallback={<IconPlay class="size-4" />}><IconPause class="size-4" /></Show>
          </Button>
          <input aria-label="Video progress" class="min-w-0 flex-1 accent-primary" max={videoRef?.duration || 100} min="0" onInput={seek} step="0.1" type="range" value={progress()} />
        </div>
      </Show>
      <Show when={isLoading() && !error()}><div class="pointer-events-none absolute inset-0 z-30 grid place-items-center"><Spinner decorative label="Loading video" size="lg" /></div></Show>
      <Show when={error()}>
        {(message) => <div class="absolute inset-0 z-30 grid place-items-center bg-black/80 p-4 text-center"><Type class="text-white" variant="body">{message()}</Type></div>}
      </Show>
      <Show when={!state().canPlay}>
        <div class="absolute inset-0 z-20 grid place-items-center"><Type class="text-white" variant="body">No playable video source.</Type></div>
      </Show>
    </div>
  );
}
