const coverCache = new Map<string, string>();

function hashSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function isRenderableCoverSrc(src: string): boolean {
  const trimmed = src.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed) {
    return false;
  }

  if (
    normalized.startsWith("data:")
    || normalized.startsWith("blob:")
    || normalized.startsWith("http://")
    || normalized.startsWith("https://")
    || normalized.startsWith("/")
    || normalized.startsWith("./")
    || normalized.startsWith("../")
  ) {
    return true;
  }

  return !/^[a-z][a-z0-9+.-]*:/iu.test(trimmed);
}

export function buildDefaultProfileCoverSrc(input: {
  displayName: string;
  handle?: string | null;
  userId: string;
}): string {
  const label = normalizeLabel(input.displayName || input.handle || input.userId);
  const seed = `${input.userId.trim()}:${label}:profile-cover`;
  const cached = coverCache.get(seed);

  if (cached) {
    return cached;
  }

  const hash = hashSeed(seed);
  const hue = hash % 360;
  const warmHue = (hue + 36) % 360;
  const coolHue = (hue + 154) % 360;
  const xOffset = 180 + (hash % 340);
  const yOffset = 42 + (hash % 72);

  const dataUri = encodeSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 420" role="img" aria-label="${escapeXml(label)} cover">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(${hue} 58% 18%)" />
          <stop offset="46%" stop-color="hsl(${warmHue} 70% 26%)" />
          <stop offset="100%" stop-color="hsl(${coolHue} 62% 16%)" />
        </linearGradient>
        <radialGradient id="soft" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.28)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="1600" height="420" fill="url(#bg)" />
      <circle cx="${xOffset}" cy="${yOffset}" r="220" fill="url(#soft)" />
      <circle cx="1330" cy="86" r="170" fill="rgba(255,255,255,0.08)" />
      <path d="M0 278C178 218 336 210 518 236C724 266 856 328 1088 300C1282 278 1438 204 1600 152V420H0Z" fill="rgba(255,255,255,0.08)" />
      <path d="M0 326C188 266 402 260 614 292C820 324 1006 384 1218 356C1368 336 1492 286 1600 236V420H0Z" fill="rgba(0,0,0,0.18)" />
    </svg>`,
  );

  coverCache.set(seed, dataUri);

  return dataUri;
}

export function resolveProfileCoverSrc(input: {
  coverSrc?: string | null;
  displayName: string;
  handle?: string | null;
  userId: string;
}): string {
  const coverSrc = input.coverSrc?.trim();
  return coverSrc && isRenderableCoverSrc(coverSrc)
    ? coverSrc
    : buildDefaultProfileCoverSrc(input);
}
