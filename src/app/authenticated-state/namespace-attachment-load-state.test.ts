import { describe, expect, test } from "bun:test";

import { namespaceAttachmentLoadState } from "./namespace-attachment-load-state";

describe("namespaceAttachmentLoadState", () => {
  test("holds the namespace page while the current attachment is unresolved", () => {
    expect(namespaceAttachmentLoadState({
      currentVerificationId: "nv_current",
      errorVerificationId: null,
      resolvedVerificationId: null,
    })).toBe("loading");
  });

  test("becomes ready only when attachments match the current verification", () => {
    expect(namespaceAttachmentLoadState({
      currentVerificationId: "nv_current",
      errorVerificationId: null,
      resolvedVerificationId: "nv_previous",
    })).toBe("loading");
    expect(namespaceAttachmentLoadState({
      currentVerificationId: "nv_current",
      errorVerificationId: null,
      resolvedVerificationId: "nv_current",
    })).toBe("ready");
  });

  test("reports an initial attachment load failure instead of showing the chooser", () => {
    expect(namespaceAttachmentLoadState({
      currentVerificationId: "nv_current",
      errorVerificationId: "nv_current",
      resolvedVerificationId: null,
    })).toBe("error");
  });
});
