import { describe, expect, test } from "bun:test";

import {
  buildStoryRegistrationCreationWarning,
  formatStoryRegistrationError,
} from "./story-registration-warning";

describe("story registration creation warning", () => {
  test("warns when Story registration is still pending", () => {
    const warning = buildStoryRegistrationCreationWarning({
      story_royalty_registration_status: "pending",
      story_error: null,
    }, "song");

    expect(warning?.title).toContain("Song published");
    expect(warning?.description).toContain("remix source");
  });

  test("warns with config-missing context when registration failed", () => {
    const warning = buildStoryRegistrationCreationWarning({
      story_royalty_registration_status: "failed",
      story_error: "royalty_registration_failed:story_royalty_config_missing",
    }, "song");

    expect(warning?.title).toBe("Song published, but Story IP registration failed.");
    expect(warning?.description).toContain("configuration is missing");
    expect(warning?.description).toContain("retried successfully");
  });

  test("does not warn for registered or ineligible assets", () => {
    expect(buildStoryRegistrationCreationWarning({
      story_royalty_registration_status: "registered",
      story_error: null,
    }, "song")).toBeNull();
    expect(buildStoryRegistrationCreationWarning({
      story_royalty_registration_status: "none",
      story_error: null,
    }, "video")).toBeNull();
  });

  test("normalizes unknown Story registration errors", () => {
    expect(formatStoryRegistrationError("royalty_registration_failed:story_rpc_timeout")).toBe("story rpc timeout");
  });
});
