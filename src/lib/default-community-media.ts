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

function sanitizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function buildDefaultCommunityBannerSrc(input: {
  communityId: string;
  displayName: string;
}): string {
  const seed = `${input.communityId}:${sanitizeLabel(input.displayName)}:banner`;
  const hash = hashSeed(seed);
  const hue = hash % 360;
  const accentHue = (hue + 52) % 360;
  const tertiaryHue = (hue + 128) % 360;

  return encodeSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 320" role="img" aria-label="${sanitizeLabel(input.displayName)} banner">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(${hue} 60% 17%)" />
          <stop offset="48%" stop-color="hsl(${accentHue} 68% 22%)" />
          <stop offset="100%" stop-color="hsl(${tertiaryHue} 62% 15%)" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.22)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="1600" height="320" fill="url(#bg)" />
      <circle cx="260" cy="88" r="180" fill="url(#glow)" />
      <circle cx="1340" cy="54" r="148" fill="rgba(255,255,255,0.08)" />
      <path d="M0 252C118 206 260 180 428 182C594 184 744 226 924 228C1112 230 1270 176 1600 110V320H0Z"
            fill="rgba(255,255,255,0.08)" />
      <path d="M0 274C202 210 354 202 538 220C734 240 914 282 1118 272C1294 264 1448 220 1600 176V320H0Z"
            fill="rgba(0,0,0,0.16)" />
    </svg>`,
  );
}

export function resolveCommunityBannerSrc(input: {
  communityId: string;
  displayName: string;
  bannerSrc?: string | null;
}): string {
  const bannerSrc = input.bannerSrc?.trim();
  return bannerSrc || buildDefaultCommunityBannerSrc(input);
}
