const PUNYCODE_BASE = 36;
const PUNYCODE_T_MIN = 1;
const PUNYCODE_T_MAX = 26;
const PUNYCODE_INITIAL_BIAS = 72;
const PUNYCODE_INITIAL_N = 128;
const PUNYCODE_DELIMITER = "-";

export function buildCommunityPath(
  communityId: string,
  routeSlug?: string | null,
): string {
  return `/c/${encodeCommunityRouteSegment(routeSlug || communityId)}`;
}

export function buildCanonicalCommunityRoutePathname(
  currentPathname: string,
  communityId: string,
  routeSlug?: string | null,
): string | null {
  const normalizedPathname = currentPathname.endsWith("/") && currentPathname !== "/"
    ? currentPathname.slice(0, -1)
    : currentPathname;
  const segments = normalizedPathname.split("/").filter(Boolean);
  if (segments[0] !== "c" || !segments[1]) {
    return null;
  }

  const communityPath = buildCommunityPath(communityId, routeSlug);
  const suffix = segments.slice(2).join("/");
  const nextPathname = suffix ? `${communityPath}/${suffix}` : communityPath;
  return normalizedPathname === nextPathname ? null : nextPathname;
}

export function formatCommunityRouteLabel(
  communityId: string,
  routeSlug?: string | null,
): string {
  const routeSegment = formatCommunityRouteSegment(routeSlug || communityId);
  return routeSegment.toLowerCase().startsWith("c/") ? routeSegment : `c/${routeSegment}`;
}

export function encodeCommunityRouteSegment(value: string): string {
  return encodeURIComponent(canonicalizeCommunityRouteSegment(value)).replace(/^%40/u, "@");
}

export function canonicalizeCommunityRouteSegment(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`canonicalizeCommunityRouteSegment expected a string, received ${value === null ? "null" : typeof value}`);
  }
  const trimmedInput = value.trim();
  const trimmed = trimmedInput.toLowerCase().startsWith("c/")
    ? trimmedInput.slice(2)
    : trimmedInput;

  if (!trimmed.startsWith("@")) {
    return trimmedInput;
  }

  const label = trimmed.slice(1);
  if (!label || label.toLowerCase().startsWith("xn--") || !hasNonAscii(label)) {
    return trimmed;
  }

  try {
    return `@xn--${encodePunycode(label.normalize("NFC"))}`;
  } catch {
    return trimmed;
  }
}

function formatCommunityRouteSegment(value: string): string {
  const trimmedInput = value.trim();
  const trimmed = trimmedInput.toLowerCase().startsWith("c/")
    ? trimmedInput.slice(2)
    : trimmedInput;
  if (!trimmed) return "community";

  if (trimmed.startsWith("@")) {
    const label = trimmed.slice(1);
    return `@${decodePunycodeLabel(label)}`;
  }

  return decodePunycodeLabel(trimmed);
}

function decodePunycodeLabel(value: string): string {
  if (!value.toLowerCase().startsWith("xn--")) {
    return value;
  }

  try {
    return decodePunycode(value.slice(4));
  } catch {
    return value;
  }
}

function decodePunycode(input: string): string {
  const output: number[] = [];
  let n = PUNYCODE_INITIAL_N;
  let i = 0;
  let bias = PUNYCODE_INITIAL_BIAS;
  const basicEnd = input.lastIndexOf(PUNYCODE_DELIMITER);

  if (basicEnd > -1) {
    for (let j = 0; j < basicEnd; j += 1) {
      const codePoint = input.charCodeAt(j);
      if (codePoint >= 0x80) {
        throw new Error("Invalid punycode basic code point");
      }
      output.push(codePoint);
    }
  }

  for (let index = basicEnd > -1 ? basicEnd + 1 : 0; index < input.length;) {
    const oldI = i;
    let w = 1;

    for (let k = PUNYCODE_BASE;; k += PUNYCODE_BASE) {
      if (index >= input.length) {
        throw new Error("Invalid punycode sequence");
      }

      const digit = decodePunycodeDigit(input.charCodeAt(index));
      index += 1;
      if (digit >= PUNYCODE_BASE) {
        throw new Error("Invalid punycode digit");
      }
      if (digit > Math.floor((Number.MAX_SAFE_INTEGER - i) / w)) {
        throw new Error("Punycode overflow");
      }

      i += digit * w;
      const t = k <= bias
        ? PUNYCODE_T_MIN
        : k >= bias + PUNYCODE_T_MAX
          ? PUNYCODE_T_MAX
          : k - bias;
      if (digit < t) break;
      if (w > Math.floor(Number.MAX_SAFE_INTEGER / (PUNYCODE_BASE - t))) {
        throw new Error("Punycode overflow");
      }
      w *= PUNYCODE_BASE - t;
    }

    const outputLength = output.length + 1;
    bias = adaptPunycodeBias(i - oldI, outputLength, oldI === 0);
    if (Math.floor(i / outputLength) > Number.MAX_SAFE_INTEGER - n) {
      throw new Error("Punycode overflow");
    }
    n += Math.floor(i / outputLength);
    i %= outputLength;
    output.splice(i, 0, n);
    i += 1;
  }

  return String.fromCodePoint(...output);
}

function encodePunycode(input: string): string {
  const codePoints = Array.from(input, (char) => char.codePointAt(0) ?? 0);
  const output: string[] = [];
  let n = PUNYCODE_INITIAL_N;
  let delta = 0;
  let bias = PUNYCODE_INITIAL_BIAS;

  for (const codePoint of codePoints) {
    if (codePoint < 0x80) {
      output.push(String.fromCharCode(codePoint));
    }
  }

  const basicLength = output.length;
  let handled = basicLength;
  if (handled > 0 && handled < codePoints.length) {
    output.push(PUNYCODE_DELIMITER);
  }

  while (handled < codePoints.length) {
    let nextCodePoint = Number.MAX_SAFE_INTEGER;
    for (const codePoint of codePoints) {
      if (codePoint >= n && codePoint < nextCodePoint) {
        nextCodePoint = codePoint;
      }
    }

    if (nextCodePoint === Number.MAX_SAFE_INTEGER) {
      throw new Error("Invalid punycode input");
    }
    if (nextCodePoint - n > Math.floor((Number.MAX_SAFE_INTEGER - delta) / (handled + 1))) {
      throw new Error("Punycode overflow");
    }

    delta += (nextCodePoint - n) * (handled + 1);
    n = nextCodePoint;

    for (const codePoint of codePoints) {
      if (codePoint < n) {
        delta += 1;
        if (delta > Number.MAX_SAFE_INTEGER) {
          throw new Error("Punycode overflow");
        }
      }

      if (codePoint !== n) {
        continue;
      }

      let q = delta;
      for (let k = PUNYCODE_BASE;; k += PUNYCODE_BASE) {
        const t = k <= bias
          ? PUNYCODE_T_MIN
          : k >= bias + PUNYCODE_T_MAX
            ? PUNYCODE_T_MAX
            : k - bias;
        if (q < t) break;
        output.push(encodePunycodeDigit(t + ((q - t) % (PUNYCODE_BASE - t))));
        q = Math.floor((q - t) / (PUNYCODE_BASE - t));
      }

      output.push(encodePunycodeDigit(q));
      bias = adaptPunycodeBias(delta, handled + 1, handled === basicLength);
      delta = 0;
      handled += 1;
    }

    delta += 1;
    n += 1;
  }

  return output.join("");
}

function decodePunycodeDigit(codePoint: number): number {
  if (codePoint >= 48 && codePoint <= 57) return codePoint - 22;
  if (codePoint >= 65 && codePoint <= 90) return codePoint - 65;
  if (codePoint >= 97 && codePoint <= 122) return codePoint - 97;
  return 36;
}

function encodePunycodeDigit(digit: number): string {
  return String.fromCharCode(digit < 26 ? digit + 97 : digit + 22);
}

function hasNonAscii(value: string): boolean {
  return /[^\x00-\x7F]/u.test(value);
}

function adaptPunycodeBias(delta: number, numPoints: number, firstTime: boolean): number {
  const skew = 38;
  const damp = 700;
  let nextDelta = firstTime ? Math.floor(delta / damp) : delta >> 1;

  nextDelta += Math.floor(nextDelta / numPoints);

  let k = 0;
  while (nextDelta > Math.floor(((PUNYCODE_BASE - PUNYCODE_T_MIN) * PUNYCODE_T_MAX) / 2)) {
    nextDelta = Math.floor(nextDelta / (PUNYCODE_BASE - PUNYCODE_T_MIN));
    k += PUNYCODE_BASE;
  }

  return k + Math.floor(((PUNYCODE_BASE - PUNYCODE_T_MIN + 1) * nextDelta) / (nextDelta + skew));
}
