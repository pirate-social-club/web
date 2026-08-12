import { describe, expect, test } from "bun:test";
import type { HomeFeedItem, Profile } from "@pirate/api-contracts";

import type { ApiLiveRoomAccessResponse } from "@/lib/api/client-api-types";
import { selectRelevantHomeFeedProfiles } from "./home-feed-profile-selection";

describe("selectRelevantHomeFeedProfiles", () => {
  test("excludes unrelated profile updates from a post projection", () => {
    const entry = {
      post: { post: { author_user: "usr_usr_author" } },
    } as unknown as HomeFeedItem;
    const liveRoomAccess = {
      room: {
        host_user: "usr_host",
        guest_user: "usr_usr_guest",
        performer_allocations: [{ role: "guest", user: "usr_performer" }],
      },
    } as unknown as ApiLiveRoomAccessResponse;
    const profiles = {
      usr_author: { user: "usr_author" } as Profile,
      usr_host: { user: "usr_host" } as Profile,
      usr_guest: null,
      usr_performer: { user: "usr_performer" } as Profile,
      usr_unrelated: { user: "usr_unrelated" } as Profile,
    };

    expect(selectRelevantHomeFeedProfiles(entry, liveRoomAccess, profiles)).toEqual([
      ["usr_author", profiles.usr_author],
      ["usr_host", profiles.usr_host],
      ["usr_guest", null],
      ["usr_performer", profiles.usr_performer],
    ]);
  });
});
