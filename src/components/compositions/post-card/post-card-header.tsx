import * as React from "react";

import { cn } from "@/lib/utils";
import { useUiLocale } from "@/lib/ui-locale";
import { Avatar } from "@/components/primitives/avatar";
import { ActionMenu } from "@/components/primitives/action-menu";
import { postCardType } from "./post-card.styles";
import type {
  PostCardByline,
  PostCardIdentity,
  PostCardIdentityPresentation,
  PostCardMenuItem,
  PostCardViewContext,
} from "./post-card.types";

function deriveIdentityPresentation(
  viewContext: PostCardViewContext,
  identityPresentation?: PostCardIdentityPresentation,
): PostCardIdentityPresentation {
  if (identityPresentation) return identityPresentation;
  return viewContext === "home" ? "author_with_community" : "author_primary";
}

function resolveIdentities(
  byline: PostCardByline,
  identityPresentation: PostCardIdentityPresentation,
): {
  primaryIdentity?: PostCardIdentity;
  secondaryIdentity?: PostCardIdentity;
} {
  const { author, community } = byline;

  switch (identityPresentation) {
    case "community_primary":
      return {
        primaryIdentity: community ?? author,
        secondaryIdentity: community && author ? author : undefined,
      };
    case "author_with_community":
      return {
        primaryIdentity: author ?? community,
        secondaryIdentity: author && community ? community : undefined,
      };
    case "anonymous_with_community":
      return {
        primaryIdentity: author ?? community,
        secondaryIdentity: author && community ? community : undefined,
      };
    case "anonymous_primary":
    case "author_primary":
      return {
        primaryIdentity: author ?? community,
        secondaryIdentity: undefined,
      };
  }
}

function InteractiveIdentityLink({
  className,
  identity,
}: {
  className?: string;
  identity?: PostCardIdentity;
}) {
  if (!identity) return null;

  if (identity.href) {
    return (
      <a className={className} data-post-card-interactive="true" href={identity.href}>
        <bdi>{identity.label}</bdi>
      </a>
    );
  }

  return <span className={className}><bdi>{identity.label}</bdi></span>;
}

function PostCardBylineContent({
  byline,
  identityPresentation,
  qualifierLabels,
  viewContext,
  isRtl,
}: {
  byline: PostCardByline;
  identityPresentation?: PostCardIdentityPresentation;
  qualifierLabels?: string[];
  viewContext: PostCardViewContext;
  isRtl: boolean;
}) {
  const { timestampLabel } = byline;
  const resolvedPresentation = deriveIdentityPresentation(viewContext, identityPresentation);
  const { primaryIdentity, secondaryIdentity } = resolveIdentities(byline, resolvedPresentation);
  const qualifierText = qualifierLabels?.filter(Boolean).join(" · ");

  if (!primaryIdentity && !secondaryIdentity) {
    return <div className={cn("text-muted-foreground", postCardType.meta)}>{timestampLabel}</div>;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-muted-foreground",
        isRtl ? "justify-end text-right" : "justify-start text-left",
        postCardType.meta,
      )}
      dir="auto"
    >
      <InteractiveIdentityLink
        className="font-semibold text-foreground hover:underline"
        identity={primaryIdentity}
      />
      {qualifierText ? (
        <>
          <span aria-hidden="true">·</span>
          <span>{qualifierText}</span>
        </>
      ) : null}
      {secondaryIdentity ? (
        <>
          <span aria-hidden="true">·</span>
          <InteractiveIdentityLink
            className="font-medium text-muted-foreground hover:text-foreground hover:underline"
            identity={secondaryIdentity}
          />
        </>
      ) : null}
      <span aria-hidden="true">·</span>
      <span>{timestampLabel}</span>
    </div>
  );
}

export interface PostCardHeaderProps {
  viewContext: PostCardViewContext;
  identityPresentation?: PostCardIdentityPresentation;
  byline: PostCardByline;
  qualifierLabels?: string[];
  saved?: boolean;
  menuItems?: PostCardMenuItem[];
  onMenuAction?: (key: string) => void;
  className?: string;
}

export function PostCardHeader({
  viewContext,
  identityPresentation,
  byline,
  qualifierLabels,
  saved,
  menuItems,
  onMenuAction,
  className,
}: PostCardHeaderProps) {
  const { isRtl } = useUiLocale();
  const resolvedPresentation = deriveIdentityPresentation(viewContext, identityPresentation);
  const { primaryIdentity, secondaryIdentity } = resolveIdentities(byline, resolvedPresentation);
  const avatarIdentity = primaryIdentity ?? secondaryIdentity;

  const AvatarElement = (
    <Avatar
      fallback={avatarIdentity?.label ?? ""}
      size="sm"
      src={avatarIdentity?.avatarSrc}
      className={cn(
        avatarIdentity?.href && "cursor-pointer transition-opacity hover:opacity-80"
      )}
    />
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        className,
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {avatarIdentity?.href ? (
        <a href={avatarIdentity.href} className="shrink-0">
          <span data-post-card-interactive="true">
            {AvatarElement}
          </span>
        </a>
      ) : (
        AvatarElement
      )}
      <div className={cn("min-w-0 flex-1", isRtl ? "text-right" : "text-left")}>
        <PostCardBylineContent
          byline={byline}
          identityPresentation={identityPresentation}
          isRtl={isRtl}
          qualifierLabels={qualifierLabels}
          viewContext={viewContext}
        />
      </div>
      <ActionMenu items={menuItems ?? []} label={saved ? "Saved post actions" : "Post options"} onAction={onMenuAction} />
    </div>
  );
}
