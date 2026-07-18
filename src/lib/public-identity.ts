export function getPublicIdentityHandleLabel(input: {
  global_handle: { label: string };
  primary_public_handle?: { label: string } | null;
}): string {
  return input.primary_public_handle?.label ?? input.global_handle.label;
}
