import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { CommunityRightsReviewQueuePage, type RightsReviewQueueItem } from "./community-rights-review-queue-page";

installDomGlobals();
afterEach(cleanup);

function rightsCase(overrides: Partial<RightsReviewQueueItem> = {}): RightsReviewQueueItem {
  return {
    caseId: "rrc_test",
    createdAt: "2026-07-06T12:00:00.000Z",
    matches: [],
    policyReason: "Catalog song matched without a declared source",
    policyReasonCode: "undeclared_catalog_match",
    postPreview: {
      body: "A video using a matched soundtrack.",
      title: "Soundtrack clip",
    },
    status: "open",
    triggerSource: "acrcloud_match",
    ...overrides,
  };
}

describe("CommunityRightsReviewQueuePage", () => {
  test("passes matched source evidence refs when clearing a rights case", () => {
    const clearCalls: Array<{ caseId: string; evidenceRefs?: string[] }> = [];
    const view = render(
      <CommunityRightsReviewQueuePage
        cases={[rightsCase({
          matches: [
            { title: "Catalog Song", sourceEvidenceRef: "song-bundle:cmt_source:sab_song" },
            { title: "Duplicate Catalog Song", sourceEvidenceRef: "song-bundle:cmt_source:sab_song" },
            { title: "Commercial Match" },
          ],
        })]}
        onClear={(caseId, evidenceRefs) => clearCalls.push({ caseId, evidenceRefs })}
      />,
    );

    fireEvent.click(view.getByText("Clear"));

    expect(clearCalls).toEqual([{
      caseId: "rrc_test",
      evidenceRefs: ["song-bundle:cmt_source:sab_song"],
    }]);
  });
});
