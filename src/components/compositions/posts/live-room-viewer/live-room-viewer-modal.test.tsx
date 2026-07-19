import "@/test/setup-runtime";

import { afterEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { IAgoraRTCClient, IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";

import type { ApiLiveRoomViewerAttachResponse } from "@/lib/api/client-api-types";

type PublishedHandler = (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => void;
type UnpublishedHandler = (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => void;
type LeftHandler = (user: IAgoraRTCRemoteUser) => void;

type TestClient = IAgoraRTCClient & {
  handlers: {
    "user-left"?: LeftHandler;
    "user-published"?: PublishedHandler;
    "user-unpublished"?: UnpublishedHandler;
  };
  joinedChannels: string[];
};

let activeClient: TestClient;

mock.module("agora-rtc-sdk-ng", () => ({
  default: {
    createClient: () => activeClient,
  },
}));

const { LiveRoomViewerSurface } = await import("./live-room-viewer-modal");

afterEach(() => {
  cleanup();
});

function createAttachResponse(): ApiLiveRoomViewerAttachResponse {
  return {
    access: {
      access_mode: "free",
      allowed: true,
      decision_reason: "allowed",
      guest_invite_status: null,
      listing: null,
      purchase_entitlement: null,
      visibility: "public",
    },
    agora: {
      app_id: "agora_app",
      channel: "pirate-live-lr_duet",
      configured: true,
      token: "token",
      token_expires_at: 1779050000,
      uid: 100,
    },
    room: {
      access_mode: "free",
      anchor_post: "pst_duet",
      broadcast_ref: "cmt_test:lr_duet",
      canceled_at: null,
      community: "cmt_test",
      cover_ref: null,
      created: 1779041451,
      description: null,
      ended_at: null,
      event_start_at: null,
      guest_user: "usr_guest",
      host_user: "usr_host",
      id: "lr_duet",
      live_started_at: 1779047801,
      object: "live_room",
      performer_allocations: [],
      replay_status: "none",
      room_kind: "duet",
      setlist: {
        id: "lrs_test",
        items: [],
        object: "live_room_setlist",
        status: "ready",
      },
      status: "live",
      title: "Duet",
      visibility: "public",
    },
    runtime: {
      room_runtime_id: "cmt_test:lr_duet",
      seat: "viewer",
      status: "attached",
    },
  };
}

function createTestClient(): TestClient {
  const handlers: TestClient["handlers"] = {};
  const joinedChannels: string[] = [];
  return {
    handlers,
    joinedChannels,
    join: async (_appId, channel) => {
      joinedChannels.push(channel);
      return 100;
    },
    leave: async () => undefined,
    on: (event, handler) => {
      if (event === "user-published" || event === "user-unpublished" || event === "user-left") {
        handlers[event] = handler as never;
      }
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

function createRemoteUser(uid: number): IAgoraRTCRemoteUser {
  return {
    audioTrack: {
      play: () => undefined,
    },
    hasAudio: true,
    hasVideo: true,
    uid,
    videoTrack: {
      play: (target: HTMLElement) => {
        const marker = document.createElement("span");
        marker.dataset.videoUid = String(uid);
        target.append(marker);
      },
    },
  } as unknown as IAgoraRTCRemoteUser;
}

describe("LiveRoomViewerSurface", () => {
  test("renders one video tile per remote producer", async () => {
    activeClient = createTestClient();
    render(
      <LiveRoomViewerSurface
        attachResponse={createAttachResponse()}
        open
        showDetails={false}
        title="Duet"
      />,
    );

    await waitFor(() => expect(activeClient.joinedChannels).toEqual(["pirate-live-lr_duet"]));

    const host = createRemoteUser(201);
    const guest = createRemoteUser(202);

    await act(async () => {
      activeClient.handlers["user-published"]?.(host, "video");
      activeClient.handlers["user-published"]?.(guest, "video");
    });

    await waitFor(() => {
      expect(document.querySelectorAll("[data-live-room-video-tile]").length).toBe(2);
      expect(document.querySelector("[data-video-uid='201']")).not.toBeNull();
      expect(document.querySelector("[data-video-uid='202']")).not.toBeNull();
    });

    await act(async () => {
      activeClient.handlers["user-unpublished"]?.(host, "video");
    });

    await waitFor(() => {
      expect(document.querySelectorAll("[data-live-room-video-tile]").length).toBe(1);
      expect(document.querySelector("[data-video-uid='201']")).toBeNull();
      expect(document.querySelector("[data-video-uid='202']")).not.toBeNull();
    });
  });
});
