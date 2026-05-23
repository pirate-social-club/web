import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CommunityModerationQueuePage } from "./community-moderation-queue-page";

describe("CommunityModerationQueuePage", () => {
  test("renders user report reason and note for moderator review", () => {
    const markup = renderToStaticMarkup(
      <CommunityModerationQueuePage
        cases={[
          {
            caseId: "mca_child_safety",
            postId: "pst_child_safety",
            priority: "high",
            openedBy: "user_report",
            status: "open",
            createdAt: "2026-05-23T05:30:00.000Z",
            postPreview: {
              title: "Needs urgent moderator review",
              body: "A member reported this post.",
              authorLabel: "reported-user.pirate",
            },
            reportSummary: {
              reasonLabel: "Child safety concern",
              note: "Child safety concern: suspected grooming behavior",
              reportCount: 1,
            },
          },
        ]}
      />,
    );

    expect(markup).toContain("High priority");
    expect(markup).toContain("Reported by member");
    expect(markup).toContain("Reported: Child safety concern");
    expect(markup).toContain("Child safety concern: suspected grooming behavior");
  });

  test("renders automated child safety visual policy signals", () => {
    const markup = renderToStaticMarkup(
      <CommunityModerationQueuePage
        cases={[
          {
            caseId: "mca_automated_child_safety",
            postId: "pst_automated_child_safety",
            priority: "high",
            openedBy: "platform_analysis",
            status: "open",
            createdAt: "2026-05-23T05:30:00.000Z",
            postPreview: {
              title: "Image post held for review",
              body: "Automated moderation created this queue item.",
              authorLabel: "creator.pirate",
            },
            visualPolicySummary: {
              title: "Image check needs review",
              description: "Needs review because the image appears to include a possible minor with adult content.",
              reasons: ["Possible minor with adult content"],
              evidence: [
                { label: "Age", value: "possible minor" },
                { label: "Nudity", value: "adult content" },
              ],
            },
          },
        ]}
      />,
    );

    expect(markup).toContain("High priority");
    expect(markup).toContain("Flagged by Pirate");
    expect(markup).toContain("Flagged: Possible minor with adult content");
    expect(markup).toContain("Detected: possible minor, adult content");
  });
});
