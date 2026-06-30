import "@/test/setup-runtime";

import { afterEach, describe, expect, mock, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";

type PublishedHandler = (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => void;
type LeftHandler = (user: IAgoraRTCRemoteUser) => void;

type TestClient = IAgoraRTCClient & {
  handlers: {
    "user-left"?: LeftHandler;
    "user-published"?: PublishedHandler;
    "user-unpublished"?: PublishedHandler;
  };
  joined: Array<{ appId: string; channel: string; token: string; uid: number }>;
  published: unknown[][];
  leaveCalls: number;
  removeAllListenersCalls: number;
};

type TestTrack = {
  closeCalls: number;
  enabled: boolean[];
  playCalls: number;
  stopCalls: number;
  close: () => void;
  play: (target?: HTMLElement) => void;
  setEnabled: (enabled: boolean) => Promise<void>;
  stop: () => void;
};

let activeClient: TestClient;
let micTrack: TestTrack;
let camTrack: TestTrack;

function createTrack(label: string): TestTrack {
  return {
    closeCalls: 0,
    enabled: [],
    playCalls: 0,
    stopCalls: 0,
    close() {
      this.closeCalls += 1;
    },
    play(target?: HTMLElement) {
      this.playCalls += 1;
      if (target) {
        const marker = document.createElement("span");
        marker.dataset.bookingVideoTrack = label;
        target.append(marker);
      }
    },
    async setEnabled(enabled: boolean) {
      this.enabled.push(enabled);
    },
    stop() {
      this.stopCalls += 1;
    },
  };
}

mock.module("agora-rtc-sdk-ng", () => ({
  default: {
    createClient: () => activeClient,
    createMicrophoneAndCameraTracks: async () => [micTrack, camTrack],
  },
}));

const { BookingVideoStage } = await import("./booking-video-stage");

afterEach(() => {
  cleanup();
});

function createTestClient(): TestClient {
  const handlers: TestClient["handlers"] = {};
  return {
    handlers,
    joined: [],
    published: [],
    leaveCalls: 0,
    removeAllListenersCalls: 0,
    join: async (appId, channel, token, uid) => {
      handlers["user-published"] = handlers["user-published"];
      activeClient.joined.push({
        appId: String(appId),
        channel: String(channel),
        token: String(token),
        uid: Number(uid),
      });
      return uid;
    },
    leave: async () => {
      activeClient.leaveCalls += 1;
    },
    on: (event, handler) => {
      if (event === "user-published" || event === "user-unpublished" || event === "user-left") {
        handlers[event] = handler as never;
      }
      return activeClient;
    },
    publish: async (tracks) => {
      activeClient.published.push(Array.isArray(tracks) ? tracks : [tracks]);
    },
    removeAllListeners: () => {
      activeClient.removeAllListenersCalls += 1;
      return activeClient;
    },
    remoteUsers: [],
    renewToken: async () => undefined,
    setClientRole: async () => undefined,
    subscribe: async (user, mediaType) => {
      if (mediaType === "video") return user.videoTrack as never;
      if (mediaType === "audio") return user.audioTrack as never;
      return null as never;
    },
  } as TestClient;
}

function createRemoteUser(uid: number): IAgoraRTCRemoteUser & { audioPlayCalls: number } {
  const user = {
    audioPlayCalls: 0,
    audioTrack: {
      play: () => {
        user.audioPlayCalls += 1;
      },
    },
    hasAudio: true,
    hasVideo: true,
    uid,
    videoTrack: {
      play: (target: HTMLElement) => {
        const marker = document.createElement("span");
        marker.dataset.remoteBookingVideoUid = String(uid);
        target.append(marker);
      },
      stop: () => undefined,
    },
  };
  return user as unknown as IAgoraRTCRemoteUser & { audioPlayCalls: number };
}

describe("BookingVideoStage", () => {
  test("joins, publishes local tracks, subscribes to remote media, and cleans up", async () => {
    activeClient = createTestClient();
    micTrack = createTrack("mic");
    camTrack = createTrack("cam");
    const onLeave = mock(() => undefined);

    const view = render(
      <BookingVideoStage
        agora={{
          app_id: "agora_app",
          channel: "pirate-booking-bkg_test",
          token: "token",
          uid: 101,
        }}
        onLeave={onLeave}
      />,
    );

    await waitFor(() => {
      expect(activeClient.joined).toEqual([{
        appId: "agora_app",
        channel: "pirate-booking-bkg_test",
        token: "token",
        uid: 101,
      }]);
      expect(activeClient.published).toEqual([[micTrack, camTrack]]);
      expect(document.querySelector("[data-booking-video-track='cam']")).not.toBeNull();
    });

    const remote = createRemoteUser(202);
    await act(async () => {
      activeClient.handlers["user-published"]?.(remote, "video");
      activeClient.handlers["user-published"]?.(remote, "audio");
    });

    await waitFor(() => {
      expect(document.querySelector("[data-remote-booking-video-uid='202']")).not.toBeNull();
      expect(remote.audioPlayCalls).toBe(1);
    });

    fireEvent.click(view.getByText("Mute"));
    fireEvent.click(view.getByText("Camera off"));

    await waitFor(() => {
      expect(micTrack.enabled).toEqual([false]);
      expect(camTrack.enabled).toEqual([false]);
      expect(view.getByText("You · muted")).toBeTruthy();
    });

    fireEvent.click(view.getByText("Leave"));
    expect(onLeave).toHaveBeenCalledTimes(1);

    view.unmount();

    await waitFor(() => {
      expect(micTrack.closeCalls).toBe(1);
      expect(camTrack.closeCalls).toBe(1);
      expect(activeClient.removeAllListenersCalls).toBe(1);
      expect(activeClient.leaveCalls).toBe(1);
    });
  });
});
