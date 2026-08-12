// Owner: web_identity_boundary. Remove repeated-prefix compatibility after the
// API user-ID migration is complete and legacy stored sessions have expired.
export function normalizeUserId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const identifier = trimmed.replace(/^(usr_)+/u, "");
  return identifier ? `usr_${identifier}` : null;
}

export function sameUserId(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalizedLeft = normalizeUserId(left);
  const normalizedRight = normalizeUserId(right);
  return normalizedLeft != null && normalizedLeft === normalizedRight;
}
