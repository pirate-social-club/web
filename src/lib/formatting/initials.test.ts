import { describe, expect, test } from "bun:test";

import { formatAvatarInitials } from "./initials";

describe("formatAvatarInitials", () => {
  test("uses the first and last words", () => {
    expect(formatAvatarInitials("Ada Byron Lovelace")).toBe("AL");
  });

  test("handles one word, Unicode, and empty input", () => {
    expect(formatAvatarInitials("pirate")).toBe("PI");
    expect(formatAvatarInitials("海 賊")).toBe("海賊");
    expect(formatAvatarInitials("", "C")).toBe("C");
  });
});
