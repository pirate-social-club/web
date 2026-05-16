import { describe, expect, test } from "bun:test";

import {
  communityHandleClaimDismissalKey,
  communityHandleFromRouteLabel,
} from "./community-handle-claim-dismissal";

describe("community handle claim dismissal helpers", () => {
  test("builds stable dismissal storage keys", () => {
    expect(communityHandleClaimDismissalKey("com_123")).toBe(
      "pirate:handle-claim-dismissed:com_123",
    );
  });

  test("derives display handles from route labels", () => {
    expect(communityHandleFromRouteLabel("c/pirates")).toBe("pirates");
    expect(communityHandleFromRouteLabel("@crew")).toBe("crew");
    expect(communityHandleFromRouteLabel("community")).toBe("community");
    expect(communityHandleFromRouteLabel("")).toBe("community");
  });
});
