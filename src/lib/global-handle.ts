const HANDLE_SUFFIX = ".pirate";
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HANDLE_MIN_LENGTH = 3;
const HANDLE_MAX_LENGTH = 30;

export function normalizeHandleLabel(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const withoutSuffix = trimmed.endsWith(HANDLE_SUFFIX)
    ? trimmed.slice(0, -HANDLE_SUFFIX.length)
    : trimmed;
  return withoutSuffix.replace(/[^a-z0-9-]/g, "");
}

export function isValidHandleSyntax(label: string): boolean {
  return label.length >= HANDLE_MIN_LENGTH
    && label.length <= HANDLE_MAX_LENGTH
    && HANDLE_PATTERN.test(label);
}

export function formatHandle(label: string): string {
  return label ? `${label}${HANDLE_SUFFIX}` : "";
}

export { HANDLE_MIN_LENGTH, HANDLE_MAX_LENGTH };
