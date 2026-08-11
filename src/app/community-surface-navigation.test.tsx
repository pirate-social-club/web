import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { UiLocaleProvider } from "@/lib/ui-locale";

import {
  CommunitySurfaceNavigation,
  communitySurfaceHrefs,
} from "./community-surface-navigation";

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

  test("renders canonical Watch and Threads tabs", () => {
    const html = renderToStaticMarkup(
      <CommunitySurfaceNavigation
        active="videos"
        communityId="community-id"
        routeSlug="community-slug"
      />,
    );

    expect(html).toContain('data-surface-navigation="canonical"');
    expect(html).toContain('href="/c/community-slug/videos"');
    expect(html).toContain(">Watch</span></a>");
    expect(html).toContain('href="/c/community-slug/threads"');
    expect(html).toContain(">Threads</span></a>");
  });

  test("renders one cross-origin destination on sovereign surfaces", () => {
    const videoHtml = renderToStaticMarkup(
      <CommunitySurfaceNavigation
        active="videos"
        communityId="community-id"
        importedRootHostname="community-root"
      />,
    );
    const threadHtml = renderToStaticMarkup(
      <CommunitySurfaceNavigation
        active="threads"
        communityId="community-id"
        importedRootHostname="community-root"
      />,
    );

    expect(videoHtml).toContain('data-surface-navigation="sovereign"');
    expect(videoHtml).toContain('href="https://app.community-root/"');
    expect(videoHtml).toContain(">Threads</span></a>");
    expect(videoHtml).not.toContain('href="https://community-root/"');
    expect(threadHtml).toContain('href="https://community-root/"');
    expect(threadHtml).toContain(">Watch</span></a>");
    expect(threadHtml).not.toContain('href="https://app.community-root/"');
  });

  test("localizes canonical navigation for RTL locales", () => {
    const html = renderToStaticMarkup(
      <UiLocaleProvider dir="rtl" locale="ar">
        <CommunitySurfaceNavigation
          active="videos"
          communityId="community-id"
          routeSlug="community-slug"
        />
      </UiLocaleProvider>,
    );

    expect(html).toContain('aria-label="واجهات المجتمع"');
    expect(html).toContain(">المشاهدة</span></a>");
    expect(html).toContain(">النقاشات</span></a>");
  });
});
