"use client";

import * as React from "react";

import { Avatar, type AvatarSize } from "@/components/primitives/avatar";
import { resolveCommunityAvatarSrc } from "@/lib/default-community-media";

export function CommunityAvatar({
  avatarSrc,
  className,
  communityId,
  displayName,
  size = "md",
}: {
  avatarSrc?: string | null;
  className?: string;
  communityId: string;
  displayName: string;
  size?: AvatarSize;
}) {
  const resolvedAvatarSrc = React.useMemo(
    () => resolveCommunityAvatarSrc({ avatarSrc, communityId, displayName }),
    [avatarSrc, communityId, displayName],
  );

  return (
    <Avatar
      className={className}
      fallback={displayName}
      size={size}
      src={resolvedAvatarSrc}
    />
  );
}
