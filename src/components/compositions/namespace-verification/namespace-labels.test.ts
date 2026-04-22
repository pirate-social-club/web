import { describe, expect, test } from "bun:test";

import {
  canonicalizeNamespaceRootInput,
  canonicalizeNamespaceRootLabel,
} from "./namespace-labels";

describe("namespace label canonicalization", () => {
  test("canonicalizes Spaces emoji labels to IDNA ASCII with @ namespace routes", () => {
    const result = canonicalizeNamespaceRootLabel("spaces", "\u{1F1F5}\u{1F1F8}");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rootLabel).toBe("xn--t77hga");
    expect(result.namespaceKey).toBe("@xn--t77hga");
    expect(result.routePath).toBe("/c/@xn--t77hga");
  });

  test("keeps HNS routes unprefixed", () => {
    const result = canonicalizeNamespaceRootLabel("hns", "Example");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rootLabel).toBe("example");
    expect(result.namespaceKey).toBe("example");
    expect(result.routePath).toBe("/c/example");
  });

  test("allows literal ASCII xn labels even when they do not decode to display Unicode", () => {
    const result = canonicalizeNamespaceRootLabel("spaces", "xn--238746723487");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rootLabel).toBe("xn--238746723487");
    expect(result.namespaceKey).toBe("@xn--238746723487");
  });

  test("rejects non-IDNA Unicode labels", () => {
    const result = canonicalizeNamespaceRootLabel("spaces", "\uD800");

    expect(result.ok).toBe(false);
    expect(result.empty).toBe(false);
  });

  test("normalizes typed Unicode for input display", () => {
    expect(canonicalizeNamespaceRootInput("spaces", "\u{1F1F5}\u{1F1F8}")).toBe("xn--t77hga");
  });
});
