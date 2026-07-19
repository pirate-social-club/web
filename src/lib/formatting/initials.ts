export function formatAvatarInitials(value: string, fallback = "?"): string {
  const words = value.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return fallback;

  if (words.length === 1) {
    return Array.from(words[0]).slice(0, 2).join("").toUpperCase();
  }

  const firstInitial = Array.from(words[0])[0] ?? "";
  const lastInitial = Array.from(words[words.length - 1])[0] ?? "";
  return `${firstInitial}${lastInitial}`.toUpperCase() || fallback;
}
