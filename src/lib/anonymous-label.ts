const ANONYMOUS_ADJECTIVES = [
  "amber",
  "brisk",
  "cinder",
  "distant",
  "ember",
  "fable",
  "granite",
  "harbor",
  "ivory",
  "jade",
  "keel",
  "lunar",
  "marble",
  "north",
  "onyx",
  "signal",
] as const;

const ANONYMOUS_NOUNS = [
  "anchor",
  "beacon",
  "corsair",
  "deck",
  "echo",
  "flag",
  "gale",
  "harpoon",
  "isle",
  "jetty",
  "keystone",
  "lantern",
  "mast",
  "narwhal",
  "oar",
  "port",
] as const;

function hashSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function buildAnonymousLabel(input: {
  communityId: string;
  userId: string;
}): string {
  const seed = `${input.communityId}:${input.userId}`;
  const hash = hashSeed(seed);
  const adjective =
    ANONYMOUS_ADJECTIVES[hash % ANONYMOUS_ADJECTIVES.length];
  const noun =
    ANONYMOUS_NOUNS[
      Math.floor(hash / ANONYMOUS_ADJECTIVES.length) % ANONYMOUS_NOUNS.length
    ];
  const suffix = (
    Math.floor(
      hash / (ANONYMOUS_ADJECTIVES.length * ANONYMOUS_NOUNS.length),
    ) % 100
  )
    .toString()
    .padStart(2, "0");

  return `anon_${adjective}-${noun}-${suffix}`;
}
