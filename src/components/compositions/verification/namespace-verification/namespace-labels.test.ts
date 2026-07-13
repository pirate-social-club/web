import { describe, expect, test } from "bun:test";

import {
  canonicalizeNamespaceRootInput,
  canonicalizeNamespaceRootLabel,
  namespaceFamilyForRootInput,
  namespaceRootLabelForRequest,
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
    const result = canonicalizeNamespaceRootLabel("hns", "Pirate");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rootLabel).toBe("pirate");
    expect(result.namespaceKey).toBe("pirate");
    expect(result.routePath).toBe("/c/pirate");
  });

  test("allows underscores in HNS root labels", () => {
    const result = canonicalizeNamespaceRootLabel("hns", "Tame_Impala");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rootLabel).toBe("tame_impala");
    expect(result.namespaceKey).toBe("tame_impala");
    expect(result.routePath).toBe("/c/tame_impala");
  });

  test("matches the hsd covenant grammar for HNS roots", () => {
    for (const label of ["a--b", "a".repeat(63)]) {
      expect(canonicalizeNamespaceRootLabel("hns", label).ok).toBe(true);
    }

    for (const label of [
      "_leading",
      "trailing_",
      "-leading",
      "trailing-",
      "a".repeat(64),
      "example",
      "invalid",
      "local",
      "localhost",
      "test",
    ]) {
      expect(canonicalizeNamespaceRootLabel("hns", label).ok).toBe(false);
    }
  });

  test("rejects underscores in Spaces root labels", () => {
    const result = canonicalizeNamespaceRootLabel("spaces", "tame_impala");

    expect(result.ok).toBe(false);
    expect(result.empty).toBe(false);
  });

  test("allows canonical literal ASCII xn labels", () => {
    const result = canonicalizeNamespaceRootLabel("spaces", "xn--t77hga");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rootLabel).toBe("xn--t77hga");
    expect(result.namespaceKey).toBe("@xn--t77hga");
  });

  test("rejects literal ASCII xn labels that are not canonical IDNA", () => {
    const result = canonicalizeNamespaceRootLabel("spaces", "xn--238746723487");

    expect(result.ok).toBe(false);
    expect(result.empty).toBe(false);
  });

  test("rejects non-IDNA Unicode labels", () => {
    const result = canonicalizeNamespaceRootLabel("spaces", "\uD800");

    expect(result.ok).toBe(false);
    expect(result.empty).toBe(false);
  });

  test("normalizes typed Unicode for input display", () => {
    expect(canonicalizeNamespaceRootInput("spaces", "\u{1F1F5}\u{1F1F8}")).toBe("xn--t77hga");
  });

  test("infers namespace family from the submitted prefix", () => {
    expect(namespaceFamilyForRootInput("@myspace")).toBe("spaces");
    expect(namespaceFamilyForRootInput("myhns")).toBe("hns");
    expect(namespaceFamilyForRootInput(".myhns")).toBe("hns");
  });

  test("adds the Spaces prefix for API requests", () => {
    expect(namespaceRootLabelForRequest("spaces", "myspace")).toBe("@myspace");
    expect(namespaceRootLabelForRequest("hns", "myhns")).toBe("myhns");
  });
});
