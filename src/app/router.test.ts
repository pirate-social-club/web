import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { matchRoute } from "./router";

describe("matchRoute", () => {
  test("matches namespace community aliases", () => {
    assert.deepEqual(matchRoute("/c/%40pirate"), {
      kind: "community",
      path: "/c/%40pirate",
      communityId: "@pirate",
    });
  });

  test("matches create-post route", () => {
    assert.deepEqual(matchRoute("/submit"), {
      kind: "create-post",
      path: "/submit",
    });
  });

  test("matches namespace community settings aliases", () => {
    assert.deepEqual(matchRoute("/c/%40pirate/settings"), {
      kind: "community-settings",
      path: "/c/%40pirate/settings",
      communityId: "@pirate",
    });
  });

  test("matches namespace moderation queue aliases", () => {
    assert.deepEqual(matchRoute("/c/%40pirate/moderation"), {
      kind: "community-moderation",
      path: "/c/%40pirate/moderation",
      communityId: "@pirate",
    });
  });

  test("matches namespace moderation case aliases", () => {
    assert.deepEqual(matchRoute("/c/%40pirate/moderation/case_01"), {
      kind: "community-moderation-case",
      path: "/c/%40pirate/moderation/case_01",
      communityId: "@pirate",
      moderationCaseId: "case_01",
    });
  });
});
