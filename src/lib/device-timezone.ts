// The learner's device IANA timezone, sent on streak-qualifying writes (study
// attempts, karaoke session start). The server pins it per streak so day
// boundaries follow the streak owner, not the viewer.
export function deviceTimezone(): string | undefined {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof timezone === "string" && timezone.trim() ? timezone : undefined;
  } catch {
    return undefined;
  }
}
