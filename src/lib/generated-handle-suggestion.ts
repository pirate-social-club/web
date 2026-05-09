const ADJECTIVES = [
  "amber",
  "ashen",
  "brisk",
  "cobalt",
  "coral",
  "distant",
  "ember",
  "fabled",
  "gilded",
  "hidden",
  "iron",
  "lantern",
  "midnight",
  "north",
  "quiet",
  "rapid",
  "sable",
  "salt",
  "silver",
  "solar",
  "steady",
  "storm",
  "swift",
  "tidal",
  "velvet",
  "west",
];

const NOUNS = [
  "anchor",
  "atlas",
  "beacon",
  "chart",
  "comet",
  "compass",
  "cove",
  "current",
  "deck",
  "flare",
  "harbor",
  "horizon",
  "keel",
  "lantern",
  "mast",
  "moon",
  "oath",
  "reef",
  "sail",
  "signal",
  "sound",
  "star",
  "tide",
  "wake",
  "watch",
  "wind",
];

function randomInt(max: number, random = Math.random): number {
  return Math.floor(random() * max);
}

function pad4(value: number): string {
  return String(value).padStart(4, "0");
}

export function generateSignupStyleHandle(random = Math.random): string {
  const adjective = ADJECTIVES[randomInt(ADJECTIVES.length, random)];
  const noun = NOUNS[randomInt(NOUNS.length, random)];
  const digits = pad4(randomInt(10_000, random));

  return `${adjective}-${noun}-${digits}`;
}
