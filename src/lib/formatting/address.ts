export function formatCompactAddress(
  address: string,
  options: {
    prefixLength?: number;
    separator?: string;
    suffixLength?: number;
    truncateAt?: number;
  } = {},
): string {
  const {
    prefixLength = 6,
    separator = "...",
    suffixLength = 4,
    truncateAt = prefixLength + suffixLength,
  } = options;
  if (address.length <= truncateAt) return address;
  return `${address.slice(0, prefixLength)}${separator}${address.slice(-suffixLength)}`;
}
