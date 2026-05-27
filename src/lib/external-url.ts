export function normalizeExternalHttpUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const parse = (candidate: string): string | null => {
    try {
      const url = new URL(candidate);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  };

  const parsed = parse(trimmed);
  if (parsed) return parsed;

  if (/^[/?#]/.test(trimmed)) return null;
  if (/\s/.test(trimmed)) return null;

  const lower = trimmed.toLowerCase();
  const hasWebHost = trimmed.includes(".")
    || lower.startsWith("localhost")
    || /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:[/?#]|$)/.test(trimmed)
    || /^\[[\da-f:]+\](?::\d+)?(?:[/?#]|$)/i.test(trimmed);

  return hasWebHost ? parse(`https://${trimmed}`) : null;
}
