import * as React from "react";

import { Avatar } from "@/components/primitives/avatar";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";
import { postCardType } from "./post-card.styles";
import { PostCardActionMenu } from "./post-card-action-menu";
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

function AgentByline({ byline }: { byline: PostCardByline }) {
  const { agentAuthor, community, timestampLabel } = byline;
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;
  if (!agentAuthor) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-start gap-x-1.5 gap-y-0.5 text-start text-muted-foreground",
        postCardType.meta,
      )}
    >
      {agentAuthor.href ? (
        <a className="font-semibold text-foreground hover:underline" href={agentAuthor.href}>
          <bdi>{agentAuthor.label}</bdi>
        </a>
      ) : (
        <span className="font-semibold text-foreground"><bdi>{agentAuthor.label}</bdi></span>
      )}
      <span>{copy.ownedBy}</span>
      {agentAuthor.ownerHref ? (
        <a className="font-medium text-muted-foreground hover:text-foreground hover:underline" href={agentAuthor.ownerHref}>
          <bdi>{agentAuthor.ownerLabel}</bdi>
        </a>
      ) : (
        <span className="font-medium text-muted-foreground"><bdi>{agentAuthor.ownerLabel}</bdi></span>
      )}
      {community ? (
        <>
          <span aria-hidden="true">·</span>
          <InteractiveIdentityLink
            className="font-medium text-muted-foreground hover:text-foreground hover:underline"
            identity={community}
          />
        </>
      ) : null}
      <span aria-hidden="true">·</span>
      <span><bdi>{timestampLabel}</bdi></span>
    </div>
  );
}

function PostCardBylineContent({
  byline,
  identityPresentation,
  qualifierLabels,
  viewContext,
}: {
  byline: PostCardByline;
  identityPresentation?: PostCardIdentityPresentation;
  qualifierLabels?: string[];
  viewContext: PostCardViewContext;
}) {
  const { timestampLabel } = byline;

  if (byline.agentAuthor) {
    return <AgentByline byline={byline} />;
  }

  const resolvedPresentation = deriveIdentityPresentation(viewContext, identityPresentation);
  const { primaryIdentity, secondaryIdentity } = resolveIdentities(byline, resolvedPresentation);
  const qualifierText = qualifierLabels?.filter(Boolean).join(" · ");

  if (!primaryIdentity && !secondaryIdentity) {
    return <div className={cn("text-muted-foreground", postCardType.meta)}>{timestampLabel}</div>;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-start gap-x-1.5 gap-y-0.5 text-start text-muted-foreground",
        postCardType.meta,
      )}
    >
      <InteractiveIdentityLink
        className="font-semibold text-foreground hover:underline"
        identity={primaryIdentity}
      />
      {qualifierText ? (
        <>
          <span aria-hidden="true">·</span>
          <span><bdi>{qualifierText}</bdi></span>
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
      <span><bdi>{timestampLabel}</bdi></span>
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
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;
  const resolvedPresentation = deriveIdentityPresentation(viewContext, identityPresentation);
  const { primaryIdentity, secondaryIdentity } = resolveIdentities(byline, resolvedPresentation);
  const avatarIdentity = byline.agentAuthor
    ? byline.author ?? primaryIdentity ?? secondaryIdentity
    : primaryIdentity ?? secondaryIdentity;

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
      <div className="min-w-0 flex-1 text-start">
        <PostCardBylineContent
          byline={byline}
          identityPresentation={identityPresentation}
          qualifierLabels={qualifierLabels}
          viewContext={viewContext}
        />
      </div>
      <PostCardActionMenu
        items={menuItems ?? []}
        label={saved ? copy.savedPostActions : copy.postOptions}
        onAction={onMenuAction}
      />
    </div>
  );
}
