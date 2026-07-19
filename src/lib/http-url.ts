export function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parse = (candidate: string) => {
    try {
      const url = new URL(candidate);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  };

  const parsed = parse(trimmed);
  if (parsed) return parsed;
  if (/\s/.test(trimmed)) return null;

  const pathStart = trimmed.search(/[/?#]/);
  const authorityCandidate = pathStart === -1 ? trimmed : trimmed.slice(0, pathStart);
  const colonIndex = authorityCandidate.indexOf(":");
  if (colonIndex > 0) {
    const hostCandidate = authorityCandidate.slice(0, colonIndex).toLowerCase();
    const portLikeHost = hostCandidate.includes(".")
      || hostCandidate === "localhost"
      || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostCandidate)
      || hostCandidate.startsWith("[");
    if (!portLikeHost) return null;
  }

  const normalizedTrimmed = trimmed.toLowerCase();
  const schemelessWebUrl = trimmed.includes(".")
    || normalizedTrimmed.startsWith("localhost")
    || /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:[/?#]|$)/.test(trimmed)
    || /^\[[\da-f:]+\](?::\d+)?(?:[/?#]|$)/i.test(trimmed);

  return schemelessWebUrl ? parse(`https://${trimmed}`) : null;
}

export function isValidHttpUrl(value: string): boolean {
  return normalizeHttpUrl(value) !== null;
}
