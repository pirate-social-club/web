import { thumbs } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";

const DEFAULT_SIZE = 128;
const AVATAR_BACKGROUND_COLORS = [
  "d9a441",
  "2f80ed",
  "27ae60",
  "eb5757",
  "9b51e0",
  "56ccf2",
  "f2994a",
  "219653",
  "bb6bd9",
  "f2c94c",
];
const avatarCache = new Map<string, string>();

function buildSeed(value: string) {
  return value.trim();
}

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function resolveBackgroundColor(seed: string): string {
  return AVATAR_BACKGROUND_COLORS[hashSeed(seed) % AVATAR_BACKGROUND_COLORS.length] ?? AVATAR_BACKGROUND_COLORS[0];
}

export function buildDefaultAvatarSrc(seedSource: string, size = DEFAULT_SIZE) {
  const seed = buildSeed(seedSource);

  if (!seed) {
    return "";
  }

  const cacheKey = `${seed}:${size}`;
  const cached = avatarCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const dataUri = createAvatar(thumbs, {
    backgroundColor: [resolveBackgroundColor(seed)],
    eyesColor: ["111111"],
    mouthColor: ["111111"],
    radius: 50,
    scale: 92,
    seed,
    shapeColor: ["f7f5f0", "fffdf7", "f6f3eb"],
    size,
  }).toDataUri();

  avatarCache.set(cacheKey, dataUri);

  return dataUri;
}
