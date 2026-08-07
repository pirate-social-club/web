import type { NamespaceFamily } from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";

const MAX_HNS_ROOT_LABEL_LENGTH = 63;
const MAX_SPACES_ROOT_LABEL_LENGTH = 62;
const HNS_ROOT_LABEL_BLACKLIST = new Set(["example", "invalid", "local", "localhost", "test"]);
const HNS_ROOT_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?$/u;

export type NamespaceRootLabelResult =
  | {
      ok: true;
      empty: false;
      rootLabel: string;
      namespaceKey: string;
      routePath: string;
    }
  | {
      ok: false;
      empty: boolean;
      rootLabel: string;
      namespaceKey: string | null;
      routePath: string | null;
      reason: "empty" | "invalid";
    };

export function canonicalizeNamespaceRootLabel(
  family: NamespaceFamily,
  value: string,
): NamespaceRootLabelResult {
  const label = stripFamilyInputPrefix(family, value.trim().normalize("NFKC").toLowerCase());
  if (!label) {
    return {
      ok: false,
      empty: true,
      rootLabel: "",
      namespaceKey: null,
      routePath: null,
      reason: "empty",
    };
  }

  const asciiLabel = toAsciiRootLabel(label);
  if (!asciiLabel) {
    return {
      ok: false,
      empty: false,
      rootLabel: label,
      namespaceKey: null,
      routePath: null,
      reason: "invalid",
    };
  }

  if (!isProtocolRootLabel(family, asciiLabel)) {
    return {
      ok: false,
      empty: false,
      rootLabel: label,
      namespaceKey: null,
      routePath: null,
      reason: "invalid",
    };
  }

  const namespaceKey = family === "spaces" ? `@${asciiLabel}` : asciiLabel;
  return {
    ok: true,
    empty: false,
    rootLabel: asciiLabel,
    namespaceKey,
    routePath: `/c/${namespaceKey}`,
  };
}

export function canonicalizeNamespaceRootInput(
  family: NamespaceFamily,
  value: string,
): string {
  const result = canonicalizeNamespaceRootLabel(family, value);
  return result.ok ? result.rootLabel : value;
}

export function namespaceFamilyForRootInput(value: string): NamespaceFamily {
  return value.trim().startsWith("@") ? "spaces" : "hns";
}

export function namespaceRootLabelForRequest(
  family: NamespaceFamily,
  rootLabel: string,
): string {
  return family === "spaces" ? `@${rootLabel}` : rootLabel;
}

function stripFamilyInputPrefix(family: NamespaceFamily, value: string): string {
  if (family === "spaces" && value.startsWith("@")) {
    return value.slice(1);
  }

  if (family === "hns" && value.startsWith(".")) {
    return value.slice(1);
  }

  return value;
}

function toAsciiRootLabel(value: string): string | null {
  if (!value || value.includes(".")) {
    return value;
  }

  if (/^[\x00-\x7F]+$/u.test(value) && !value.startsWith("xn--")) {
    return value;
  }

  try {
    const hostname = new URL(`http://${value}.invalid`).hostname;
    if (!hostname.endsWith(".invalid")) {
      return null;
    }

    const asciiLabel = hostname.slice(0, -".invalid".length);
    return value.startsWith("xn--") && asciiLabel !== value ? null : asciiLabel;
  } catch {
    return null;
  }
}

function isProtocolRootLabel(family: NamespaceFamily, value: string): boolean {
  if (family === "hns") {
    return value.length <= MAX_HNS_ROOT_LABEL_LENGTH
      && HNS_ROOT_LABEL_PATTERN.test(value)
      && !HNS_ROOT_LABEL_BLACKLIST.has(value);
  }

  if (!value || value.length > MAX_SPACES_ROOT_LABEL_LENGTH) {
    return false;
  }

  const verifyRange = value.startsWith("xn--") && value.length > "xn--".length
    ? value.slice("xn--".length)
    : value;
  return Boolean(verifyRange)
    && !verifyRange.startsWith("-")
    && !verifyRange.endsWith("-")
    && !verifyRange.includes("--")
    && /^[a-z0-9-]+$/u.test(verifyRange);
}
