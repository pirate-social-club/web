import { thumbs } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";

const DEFAULT_SIZE = 128;
const AVATAR_BACKGROUND_COLOR = "d9a441";
const avatarCache = new Map<string, string>();

function buildSeed(value: string) {
  return value.trim();
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
    backgroundColor: [AVATAR_BACKGROUND_COLOR],
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
