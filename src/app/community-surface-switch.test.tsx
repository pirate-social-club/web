import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  CommunitySurfaceSwitch,
  communitySurfaceHrefs,
  communitySurfaceLabel,
} from "./community-surface-switch";

describe("communitySurfaceLabel", () => {
  test("names the short-form video surface Reels", () => {
    expect(communitySurfaceLabel("videos")).toBe("Reels");
    expect(communitySurfaceLabel("threads")).toBe("Threads");
  });
});

describe("communitySurfaceHrefs", () => {
  test("builds explicit canonical community surface paths", () => {
    expect(communitySurfaceHrefs({
      communityId: "community-id",
      routeSlug: "community-slug",
    })).toEqual({
      threads: "/c/community-slug/threads",
      videos: "/c/community-slug/videos",
    });
  });

  test("crosses origins between sovereign surfaces", () => {
    expect(communitySurfaceHrefs({
      communityId: "community-id",
      importedRootHostname: "community-root",
    })).toEqual({
      threads: "https://app.community-root/",
      videos: "https://community-root/",
    });
  });

  test("renders sovereign Reels and Threads as cross-origin anchors", () => {
    const html = renderToStaticMarkup(
      <CommunitySurfaceSwitch
        active="videos"
        communityId="community-id"
        importedRootHostname="community-root"
      />,
    );

    expect(html).toContain('href="https://community-root/"');
    expect(html).toContain(">Reels</a>");
    expect(html).toContain('href="https://app.community-root/"');
    expect(html).toContain(">Threads</a>");
  });
});
