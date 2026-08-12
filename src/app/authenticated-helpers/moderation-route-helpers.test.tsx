import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, test } from "bun:test";

import { CommunityModerationGuard } from "@/app/authenticated-helpers/moderation-route-helpers";
import { ApiError } from "@/lib/api/client";
import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();
afterEach(cleanup);

describe("CommunityModerationGuard", () => {
  test("accepts equivalent single- and double-prefixed owner IDs", () => {
    const view = render(CommunityModerationGuard({
      community: {
        created_by_user: "usr_workspace_owner",
      } as Parameters<typeof CommunityModerationGuard>[0]["community"],
      error: null,
      loading: false,
      session: {
        user: { id: "usr_usr_workspace_owner" },
      } as Parameters<typeof CommunityModerationGuard>[0]["session"],
      title: "Namespace",
      authDescription: "Sign in.",
      failureDescription: "Could not load moderation.",
      incompleteDescription: "Community data is incomplete.",
      accessRequiredDescription: "Owner access required.",
      accessRequiredTitle: "Access required",
    }));

    expect(view.container.textContent).toBe("");
  });

  test("explains that a masked not-found response may be an account mismatch", () => {
    const view = render(CommunityModerationGuard({
      community: null,
      error: new ApiError("not_found", "Community not found", 404),
      loading: false,
      session: null,
      title: "Namespace",
      authDescription: "Sign in.",
      failureDescription: "Could not load moderation.",
      incompleteDescription: "Community data is incomplete.",
      accessRequiredDescription: "Owner access required.",
      accessRequiredTitle: "Access required",
    }));

    expect(view.getByText("Community unavailable")).toBeTruthy();
    expect(view.getByText(/current account can't manage it/u)).toBeTruthy();
    expect(view.getByText(/switch accounts/u)).toBeTruthy();
  });
});
