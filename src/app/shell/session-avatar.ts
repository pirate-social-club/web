import type { useSession } from "@/lib/api/session-store";

export function resolveSessionAvatarFallback(
  session: ReturnType<typeof useSession>,
  defaultLabel: string,
) {
  const displayName = session?.profile?.display_name?.trim();

  if (displayName) {
    return displayName;
  }

  const handleLabel = session?.profile?.global_handle?.label?.trim();

  if (handleLabel) {
    return handleLabel;
  }

  return defaultLabel;
}

export function resolveSessionHeaderHandle(
  session: ReturnType<typeof useSession>,
  defaultLabel: string,
) {
  const primaryPublicHandle = session?.profile?.primary_public_handle?.label?.trim();

  if (primaryPublicHandle) {
    return primaryPublicHandle;
  }

  const globalHandle = session?.profile?.global_handle?.label?.trim();

  if (globalHandle) {
    return globalHandle;
  }

  return defaultLabel;
}
