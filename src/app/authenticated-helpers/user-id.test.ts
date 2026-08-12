import { describe, expect, test } from "bun:test";

import { normalizeUserId, sameUserId } from "@/app/authenticated-helpers/user-id";

describe("normalizeUserId", () => {
  test("emits one public prefix for raw and repeatedly prefixed IDs", () => {
    expect(normalizeUserId("workspace_owner")).toBe("usr_workspace_owner");
    expect(normalizeUserId(" usr_usr_workspace_owner ")).toBe("usr_workspace_owner");
  });

  test("rejects empty IDs", () => {
    expect(normalizeUserId(null)).toBeNull();
    expect(normalizeUserId("usr_usr_")).toBeNull();
  });
});

describe("sameUserId", () => {
  test("matches equivalent IDs across repeated public prefixes", () => {
    expect(sameUserId("usr_workspace_owner", "usr_usr_workspace_owner")).toBe(true);
    expect(sameUserId("usr_usr_workspace_owner", "usr_workspace_owner")).toBe(true);
  });

  test("rejects missing or different IDs", () => {
    expect(sameUserId(null, "usr_workspace_owner")).toBe(false);
    expect(sameUserId("usr_workspace_owner", "usr_reviewer")).toBe(false);
  });
});
