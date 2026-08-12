import { describe, expect, test } from "bun:test";
import type { HomeFeedItem, Profile } from "@pirate/api-contracts";

import type { ApiLiveRoomAccessResponse } from "@/lib/api/client-api-types";
import { selectRelevantHomeFeedProfiles } from "./home-feed-profile-selection";

describe("selectRelevantHomeFeedProfiles", () => {
  test("excludes unrelated profile updates from a post projection", () => {
    const entry = {
      post: { post: { author_user: "author" } },
    } as unknown as HomeFeedItem;
    const liveRoomAccess = {
      room: {
        host_user: "host",
        guest_user: "guest",
        performer_allocations: [{ role: "guest", user: "performer" }],
      },
    } as unknown as ApiLiveRoomAccessResponse;
    const profiles = {
      author: { user: "author" } as Profile,
      host: { user: "host" } as Profile,
      guest: null,
      performer: { user: "performer" } as Profile,
      unrelated: { user: "unrelated" } as Profile,
    };

    expect(selectRelevantHomeFeedProfiles(entry, liveRoomAccess, profiles)).toEqual([
      ["author", profiles.author],
      ["host", profiles.host],
      ["guest", null],
      ["performer", profiles.performer],
    ]);
  });
});
