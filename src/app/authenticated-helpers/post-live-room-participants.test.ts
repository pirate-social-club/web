import { describe, expect, test } from "bun:test";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { buildLiveRoomParticipants } from "./post-live-room-participants";

function profile(label: string, avatarRef?: string): ApiProfile {
  return {
    avatar_ref: avatarRef ?? null,
    display_name: label,
    global_handle: { label },
    primary_public_handle: { label },
  } as ApiProfile;
}

describe("buildLiveRoomParticipants", () => {
  test("returns undefined for solo rooms", () => {
    expect(buildLiveRoomParticipants({
      liveRoom: {
        host_user: "usr_host",
        guest_user: null,
      },
      profilesByUserId: {
        usr_host: profile("host.pirate"),
      },
    })).toBeUndefined();
  });

  test("builds host and guest participants from resolved profiles", () => {
    expect(buildLiveRoomParticipants({
      liveRoom: {
        host_user: "usr_host",
        guest_user: "usr_guest",
      },
      profilesByUserId: {
        usr_host: profile("host.pirate", "host.jpg"),
        usr_guest: profile("guest.pirate", "guest.jpg"),
      },
    })).toEqual([
      {
        role: "host",
        label: "host.pirate",
        href: "/u/host.pirate",
        avatarSrc: "host.jpg",
      },
      {
        role: "guest",
        label: "guest.pirate",
        href: "/u/guest.pirate",
        avatarSrc: "guest.jpg",
      },
    ]);
  });

  test("falls back to user id when guest profile is missing", () => {
    expect(buildLiveRoomParticipants({
      liveRoom: {
        host_user: "usr_host",
        guest_user: "usr_guest_missing",
      },
      profilesByUserId: {
        usr_host: profile("host.pirate"),
      },
    })).toEqual([
      {
        role: "host",
        label: "host.pirate",
        href: "/u/host.pirate",
        avatarSrc: undefined,
      },
      {
        role: "guest",
        label: "usr_gues",
        href: undefined,
        avatarSrc: undefined,
      },
    ]);
  });

  test("uses the post author profile for the host", () => {
    expect(buildLiveRoomParticipants({
      authorProfile: profile("author-host.pirate"),
      liveRoom: {
        host_user: "usr_host",
        guest_user: "usr_guest",
      },
      postAuthorUserId: "usr_host",
      profilesByUserId: {
        usr_guest: profile("guest.pirate"),
      },
    })?.[0]).toMatchObject({
      role: "host",
      label: "author-host.pirate",
    });
  });

  test("uses the anchor post pseudonym for an anonymous host", () => {
    expect(buildLiveRoomParticipants({
      authorProfile: profile("public-host.pirate", "host.jpg"),
      liveRoom: {
        host_user: "usr_host",
        guest_user: "usr_guest",
      },
      postAnonymousLabel: "anon_clear-river-12",
      postAuthorUserId: "usr_host",
      postIdentityMode: "anonymous",
      profilesByUserId: {
        usr_guest: profile("guest.pirate", "guest.jpg"),
      },
    })).toEqual([
      {
        role: "host",
        label: "anon_clear-river-12",
      },
      {
        role: "guest",
        label: "guest.pirate",
        href: "/u/guest.pirate",
        avatarSrc: "guest.jpg",
      },
    ]);
  });

  test("appends additional allocated performers without duplicating host or guest", () => {
    expect(buildLiveRoomParticipants({
      liveRoom: {
        host_user: "usr_host",
        guest_user: "usr_guest",
        performer_allocations: [
          { user: "usr_host", role: "host" },
          { user: "usr_guest", role: "guest" },
          { user: "usr_guest_two", role: "guest" },
        ],
      },
      profilesByUserId: {
        usr_host: profile("host.pirate"),
        usr_guest: profile("guest.pirate"),
        usr_guest_two: profile("guest-two.pirate"),
      },
    })?.map((participant) => participant.label)).toEqual([
      "host.pirate",
      "guest.pirate",
      "guest-two.pirate",
    ]);
  });
});
