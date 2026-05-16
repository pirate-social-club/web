export function formatRelativeTimestamp(value: string | number): string {
  const timestamp = typeof value === "number" ? value * 1000 : new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";

  const diffMs = Date.now() - timestamp;
  const isFuture = diffMs < 0;
  const diffMinutes = Math.floor(Math.abs(diffMs) / 60_000);
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return isFuture ? `in ${diffMinutes}m` : `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return isFuture ? `in ${diffHours}h` : `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return isFuture ? `in ${diffDays}d` : `${diffDays}d`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return isFuture ? `in ${diffWeeks}w` : `${diffWeeks}w`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return isFuture ? `in ${diffMonths}mo` : `${diffMonths}mo`;

  const diffYears = Math.max(1, Math.floor(diffDays / 365));
  return isFuture ? `in ${diffYears}y` : `${diffYears}y`;
}
