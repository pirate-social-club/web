/**
 * Phase 5.2 — production browser dependency factory for {@link KaraokeMicCapture}.
 *
 * Browser-only: references `navigator`, `AudioContext`, and `AudioWorkletNode`,
 * which do not exist under bun, so this file is NOT unit-tested. It is the real
 * implementation of the injected `deps` the engine consumes. Native-16k-first:
 * the context is requested at 16 kHz; the engine still reads the ACTUAL
 * `context.sampleRate` and the DSP resamples when the hint isn't honored.
 *
 * NOTE (audit F6): this still needs a real-browser smoke test + the Vite worklet
 * build wiring verified — neither can run in this (headless/bun) environment.
 */

import type { KaraokeMicCaptureDeps, MicAudioContext } from "./karaoke-mic-capture";

const WORKLET_PROCESSOR_NAME = "karaoke-capture-processor";

/**
 * @param workletModuleUrl built URL of `karaoke-capture-processor.ts`, e.g.
 *   `new URL("./karaoke-capture-processor.ts", import.meta.url)` (Vite bundles it).
 */
export function createBrowserMicCaptureDeps(workletModuleUrl: URL | string): KaraokeMicCaptureDeps {
  return {
    addWorkletModule: (context) =>
      (context as unknown as AudioContext).audioWorklet.addModule(
        typeof workletModuleUrl === "string" ? workletModuleUrl : workletModuleUrl.href,
      ),
    createContext: () =>
      // 16 kHz hint avoids resampling when honored; the engine reads the real rate.
      new AudioContext({ sampleRate: 16_000 }) as unknown as MicAudioContext,
    createWorkletNode: (context) =>
      new AudioWorkletNode(context as unknown as BaseAudioContext, WORKLET_PROCESSOR_NAME) as unknown as ReturnType<
        KaraokeMicCaptureDeps["createWorkletNode"]
      >,
    getUserMedia: (constraints) =>
      navigator.mediaDevices.getUserMedia(constraints as MediaStreamConstraints) as unknown as ReturnType<
        KaraokeMicCaptureDeps["getUserMedia"]
      >,
  };
}
