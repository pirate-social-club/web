"use client";

/**
 * Phase 5.3 — thin React wrapper around {@link createKaraokeScoringController}.
 * It supplies the real browser factories (the mic engine + worklet, the
 * network-wired session client) and the authenticated session-creation call,
 * then mirrors the controller's state into React via `subscribe`.
 *
 * The orchestration logic lives in the (framework-agnostic, unit-tested)
 * controller — this hook only owns React lifecycle: construct on enable, dispose
 * on unmount, and expose STABLE imperative `controls` the audio surface invokes
 * from its existing play/pause/seek/time/ended callbacks.
 */

import * as React from "react";
import type { ScorableKaraokeLine } from "@pirate/karaoke-runtime";

import type { KaraokeSessionCreateApiResponse } from "@/lib/api/client-api-types";

import { createBrowserMicCaptureDeps } from "../capture/karaoke-mic-capture-browser";
import { KaraokeMicCapture } from "../capture/karaoke-mic-capture";
import {
  createKaraokeScoringController,
  type KaraokeScoringController,
  type KaraokeScoringState,
} from "./karaoke-scoring-controller";

/**
 * Resolves the worklet module URL. Vite statically recognizes this exact
 * `new URL("<literal>", import.meta.url)` pattern and emits the worklet as a
 * separate module asset.
 *
 * It is computed lazily (only when the capture engine is created, in the
 * browser, behind a user gesture) rather than at module top-level: under rwsdk
 * this `"use client"` module is also imported into the SSR worker bundle, where
 * `import.meta.url` is empty — evaluating `new URL(..., "")` there throws
 * `TypeError: Invalid URL string` and crashes server rendering of any page whose
 * import graph reaches this module.
 */
function resolveWorkletModuleUrl(): URL {
  return new URL("../capture/karaoke-capture-processor.ts", import.meta.url);
}

/** The authenticated `POST .../karaoke/sessions` call (api.posts.createKaraokeSession). */
export type CreateKaraokeSessionApi = (
  communityId: string,
  postId: string,
  idempotencyKey: string,
  signal?: AbortSignal,
) => Promise<KaraokeSessionCreateApiResponse>;

export interface UseKaraokeScoringOptions {
  /** When false the hook stays inert (no controller, no mic). */
  enabled: boolean;
  communityId: string;
  postId: string;
  scorableLines: readonly ScorableKaraokeLine[];
  createKaraokeSession: CreateKaraokeSessionApi;
}

export interface KaraokeScoringControls {
  /** Begin a scoring session at the given song position (user gesture). */
  start: (songMs: number) => void;
  noteTime: (songMs: number) => void;
  notePlay: (songMs: number) => void;
  notePause: (songMs: number) => void;
  noteSeek: (songMs: number) => void;
  noteFinish: (songMs: number) => void;
  stop: () => void;
  abort: (code: string) => void;
}

export interface UseKaraokeScoringResult {
  enabled: boolean;
  state: KaraokeScoringState | null;
  controls: KaraokeScoringControls;
}

export function useKaraokeScoring(options: UseKaraokeScoringOptions): UseKaraokeScoringResult {
  const { communityId, createKaraokeSession, enabled, postId, scorableLines } = options;

  const controllerRef = React.useRef<KaraokeScoringController | null>(null);
  const [state, setState] = React.useState<KaraokeScoringState | null>(null);

  // Keep the latest non-stable inputs in refs so the controller (keyed by postId)
  // isn't torn down when the api client or memoized lines change identity.
  const createSessionRef = React.useRef(createKaraokeSession);
  const linesRef = React.useRef(scorableLines);
  createSessionRef.current = createKaraokeSession;
  linesRef.current = scorableLines;

  React.useEffect(() => {
    if (!enabled) {
      setState(null);
      return undefined;
    }

    const controller = createKaraokeScoringController({
      communityId,
      createCaptureEngine: ({ onChunk, onError }) =>
        new KaraokeMicCapture({
          deps: createBrowserMicCaptureDeps(resolveWorkletModuleUrl()),
          onChunk,
          onError,
        }),
      createKaraokeSession: ({ idempotencyKey, signal }) =>
        createSessionRef.current(communityId, postId, idempotencyKey, signal),
      postId,
      scorableLines: linesRef.current,
    });
    controllerRef.current = controller;
    setState(controller.getState());
    const unsubscribe = controller.subscribe(setState);

    return () => {
      unsubscribe();
      controller.dispose();
      controllerRef.current = null;
    };
  }, [communityId, enabled, postId]);

  // Stable controls that always delegate to the current controller.
  const controls = React.useMemo<KaraokeScoringControls>(() => ({
    abort: (code) => controllerRef.current?.abort(code),
    noteFinish: (songMs) => controllerRef.current?.noteFinish(songMs),
    notePause: (songMs) => controllerRef.current?.notePause(songMs),
    notePlay: (songMs) => controllerRef.current?.notePlay(songMs),
    noteSeek: (songMs) => controllerRef.current?.noteSeek(songMs),
    noteTime: (songMs) => controllerRef.current?.noteTime(songMs),
    start: (songMs) => { void controllerRef.current?.start(songMs); },
    stop: () => controllerRef.current?.stop(),
  }), []);

  return { controls, enabled, state };
}
