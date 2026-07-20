import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "bun:test";

import { installDomGlobals } from "@/test/setup-dom";
import { useLocalAudioPreview } from "./post-composer-publish-settings";

installDomGlobals();

const NativeAudio = globalThis.Audio;

class MetadataAudio extends EventTarget {
  currentTime = 0;
  duration = Number.NaN;
  ended = false;
  paused = true;
  preload = "";
  readyState = 0;
  src = "";
  loadCalls = 0;

  load() {
    this.loadCalls += 1;
  }

  pause() {
    this.paused = true;
  }

  async play() {
    this.paused = false;
  }

  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }
}

afterEach(() => {
  globalThis.Audio = NativeAudio;
});

describe("useLocalAudioPreview", () => {
  it("loads selected audio metadata before playback", () => {
    const audio = new MetadataAudio();
    globalThis.Audio = class {
      constructor() {
        return audio;
      }
    } as unknown as typeof Audio;

    const { result } = renderHook(() => useLocalAudioPreview("blob:selected-song"));

    expect(audio.src).toBe("blob:selected-song");
    expect(audio.preload).toBe("metadata");
    expect(audio.loadCalls).toBe(1);

    act(() => {
      audio.duration = 93.456;
      audio.dispatchEvent(new Event("loadedmetadata"));
    });

    expect(result.current.durationMs).toBe(93_456);
    expect(result.current.state).toBe("idle");
  });
});
