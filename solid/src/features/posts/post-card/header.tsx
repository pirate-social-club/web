import { Show } from "solid-js";
import type { JSX } from "@solidjs/web";

import {
  Avatar,
  AvatarBadge,
  IconCrown,
  IconShield,
  IconWarningCircle,
} from "../../../design-system";
import { cn } from "../../../lib/cn";
import { useUiLocale } from "../../../lib/ui-locale";
import { PostCardActionMenu } from "./action-menu";
import { buildNationalityBadgeLabel, nationalityMatchesQualifier } from "./nationality";
import { postCardType } from "./styles";
import type {
  CommunityAuthorRole,
  PostCardByline,
  PostCardIdentity,
  PostCardIdentityPresentation,
  PostCardMenuItem,
  PostCardViewContext,
} from "./types";

export function deriveIdentityPresentation(
  viewContext: PostCardViewContext,
  identityPresentation?: PostCardIdentityPresentation,
): PostCardIdentityPresentation {
  if (identityPresentation) return identityPresentation;
  return viewContext === "home" || viewContext === "profile" ? "community_primary" : "author_primary";
}

export function resolveIdentities(
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
        secondaryIdentity: undefined,
      };
    case "community_with_author":
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

function InteractiveIdentityLink(props: {
  class?: string;
  identity?: PostCardIdentity;
}) {
  return (
    <Show when={props.identity}>
      {(identity) => {
        const labelClassName = cn("min-w-0 truncate", props.class);
        const label = identity().href ? (
          <a class={labelClassName} data-post-card-interactive="true" href={identity().href}>
            <bdi>{identity().label}</bdi>
          </a>
        ) : (
          <span class={labelClassName}><bdi>{identity().label}</bdi></span>
        );
        const statusBadge = identity().kind === "community" && identity().verificationStatus === "unverified"
          ? <CommunityVerificationBadge />
          : null;

        if (statusBadge) {
          return (
            <span class="inline-flex min-w-0 max-w-full items-center gap-1 align-baseline">
              {label}
              {statusBadge}
            </span>
          );
        }

        return label;
      }}
    </Show>
  );
}

function CommunityVerificationBadge() {
  return (
    <span
      aria-label="Unverified community"
      class="inline-flex size-[1.05em] shrink-0 items-center justify-center self-center text-warning"
      title="Community name is not verified with Handshake or Spaces."
    >
      <IconWarningCircle aria-hidden="true" class="size-full" />
    </span>
  );
}

function authorRoleBadgeCopy(role: CommunityAuthorRole): string {
  return role === "owner" ? "Owner" : "Moderator";
}

function AuthorRoleBadge(props: { role?: CommunityAuthorRole | null }) {
  return (
    <Show when={props.role}>
      {(role) => (
        <span
          aria-label={authorRoleBadgeCopy(role())}
          class={cn(
            "inline-flex size-[1.1em] shrink-0 items-center justify-center self-center",
            role() === "owner" ? "text-warning" : "text-foreground/70",
          )}
          role="img"
          title={authorRoleBadgeCopy(role())}
        >
          <Show when={role() === "owner"} fallback={<IconShield class="size-full" />}>
            <IconCrown class="size-full" />
          </Show>
        </span>
      )}
    </Show>
  );
}

function BylineSeparatedItem(props: { children: JSX.Element }) {
  return (
    <span class="inline-flex min-w-0 items-baseline gap-x-1.5">
      <span aria-hidden="true" class="shrink-0">·</span>
      <span class="min-w-0">{props.children}</span>
    </span>
  );
}

function CommunityWithAuthorByline(props: {
  authorCommunityRole?: CommunityAuthorRole | null;
  primaryIdentity?: PostCardIdentity;
  secondaryIdentity?: PostCardIdentity;
  qualifierText?: string;
  timestampLabel: string;
}) {
  return (
    <div class={cn("flex flex-col items-start gap-0.5 text-start text-muted-foreground", postCardType.meta)}>
      <InteractiveIdentityLink
        class="font-semibold text-foreground hover:underline"
        identity={props.primaryIdentity}
      />
      <div class="flex min-w-0 flex-wrap items-baseline justify-start gap-x-1.5 gap-y-0.5">
        <Show when={props.secondaryIdentity}>
          {(secondary) => (
            <>
              <InteractiveIdentityLink
                class="font-medium text-muted-foreground hover:text-foreground hover:underline"
                identity={secondary()}
              />
              <AuthorRoleBadge role={props.authorCommunityRole} />
            </>
          )}
        </Show>
        <Show when={props.qualifierText}>
          {(qualifier) => (
            <Show
              when={props.secondaryIdentity}
              fallback={<span><bdi>{qualifier()}</bdi></span>}
            >
              <BylineSeparatedItem>
                <bdi>{qualifier()}</bdi>
              </BylineSeparatedItem>
            </Show>
          )}
        </Show>
        <Show
          when={props.secondaryIdentity || props.qualifierText}
          fallback={<span><bdi>{props.timestampLabel}</bdi></span>}
        >
          <BylineSeparatedItem>
            <bdi>{props.timestampLabel}</bdi>
          </BylineSeparatedItem>
        </Show>
      </div>
    </div>
  );
}

function AgentByline(props: { byline: PostCardByline; ownedByLabel: string }) {
  const agentAuthor = () => props.byline.agentAuthor;
  return (
    <Show when={agentAuthor()}>
      {(agent) => (
        <div
          class={cn(
            "flex flex-wrap items-baseline justify-start gap-x-1.5 gap-y-0.5 text-start text-muted-foreground",
            postCardType.meta,
          )}
        >
          <Show
            when={agent().href}
            fallback={<span class="font-semibold text-foreground"><bdi>{agent().label}</bdi></span>}
          >
            {(href) => (
              <a class="font-semibold text-foreground hover:underline" href={href()}>
                <bdi>{agent().label}</bdi>
              </a>
            )}
          </Show>
          <span>{props.ownedByLabel}</span>
          <Show
            when={agent().ownerHref}
            fallback={<span class="font-medium text-muted-foreground"><bdi>{agent().ownerLabel}</bdi></span>}
          >
            {(href) => (
              <a class="font-medium text-muted-foreground hover:text-foreground hover:underline" href={href()}>
                <bdi>{agent().ownerLabel}</bdi>
              </a>
            )}
          </Show>
          <Show when={props.byline.community}>
            {(community) => (
              <BylineSeparatedItem>
                <InteractiveIdentityLink
                  class="font-medium text-muted-foreground hover:text-foreground hover:underline"
                  identity={community()}
                />
              </BylineSeparatedItem>
            )}
          </Show>
          <BylineSeparatedItem>
            <bdi>{props.byline.timestampLabel}</bdi>
          </BylineSeparatedItem>
        </div>
      )}
    </Show>
  );
}

function PostCardBylineContent(props: {
  authorCommunityRole?: CommunityAuthorRole | null;
  byline: PostCardByline;
  identityPresentation?: PostCardIdentityPresentation;
  qualifierLabels?: string[];
  viewContext: PostCardViewContext;
  ownedByLabel: string;
}) {
  const resolvedPresentation = () => deriveIdentityPresentation(props.viewContext, props.identityPresentation);

  const showAgentByline = () => props.byline.agentAuthor
    && resolvedPresentation() !== "community_primary"
    && resolvedPresentation() !== "community_with_author";

  const identities = () => resolveIdentities(props.byline, resolvedPresentation());
  const qualifierText = () => props.qualifierLabels?.filter(Boolean).join(" · ");
  const shouldShowAuthorRole = () => Boolean(
    props.authorCommunityRole
    && props.byline.author
    && identities().primaryIdentity === props.byline.author
    && resolvedPresentation() !== "anonymous_primary"
    && resolvedPresentation() !== "anonymous_with_community",
  );

  return (
    <Show
      when={!showAgentByline()}
      fallback={<AgentByline byline={props.byline} ownedByLabel={props.ownedByLabel} />}
    >
      <Show
        when={identities().primaryIdentity || identities().secondaryIdentity}
        fallback={<div class={cn("text-muted-foreground", postCardType.meta)}>{props.byline.timestampLabel}</div>}
      >
        <Show
          when={resolvedPresentation() === "community_with_author"}
          fallback={(
            <div
              class={cn(
                "flex flex-wrap items-baseline justify-start gap-x-1.5 gap-y-0.5 text-start text-muted-foreground",
                postCardType.meta,
              )}
            >
              <InteractiveIdentityLink
                class="font-semibold text-foreground hover:underline"
                identity={identities().primaryIdentity}
              />
              <Show when={shouldShowAuthorRole()}>
                <AuthorRoleBadge role={props.authorCommunityRole} />
              </Show>
              <Show when={qualifierText()}>
                {(qualifier) => (
                  <BylineSeparatedItem>
                    <bdi>{qualifier()}</bdi>
                  </BylineSeparatedItem>
                )}
              </Show>
              <Show when={identities().secondaryIdentity}>
                {(secondary) => (
                  <BylineSeparatedItem>
                    <InteractiveIdentityLink
                      class="font-medium text-muted-foreground hover:text-foreground hover:underline"
                      identity={secondary()}
                    />
                  </BylineSeparatedItem>
                )}
              </Show>
              <BylineSeparatedItem>
                <bdi>{props.byline.timestampLabel}</bdi>
              </BylineSeparatedItem>
            </div>
          )}
        >
          <CommunityWithAuthorByline
            authorCommunityRole={props.authorCommunityRole}
            primaryIdentity={identities().primaryIdentity}
            qualifierText={qualifierText()}
            secondaryIdentity={identities().secondaryIdentity}
            timestampLabel={props.byline.timestampLabel}
          />
        </Show>
      </Show>
    </Show>
  );
}

export interface PostCardHeaderLabels {
  /** Verb phrase between the agent label and its owner (React: locale copy). */
  ownedBy?: string;
  postOptions?: string;
  savedPostActions?: string;
}

export interface PostCardHeaderProps {
  viewContext: PostCardViewContext;
  identityPresentation?: PostCardIdentityPresentation;
  byline: PostCardByline;
  authorCommunityRole?: CommunityAuthorRole | null;
  authorNationalityBadgeCountry?: string | null;
  authorNationalityBadgeLabel?: string;
  qualifierLabels?: string[];
  saved?: boolean;
  menuItems?: PostCardMenuItem[];
  onMenuAction?: (key: string) => void;
  labels?: PostCardHeaderLabels;
  class?: string;
}

export function PostCardHeader(props: PostCardHeaderProps) {
  const { locale } = useUiLocale();
  const resolvedPresentation = () => deriveIdentityPresentation(props.viewContext, props.identityPresentation);
  const identities = () => resolveIdentities(props.byline, resolvedPresentation());
  const avatarIdentity = () => props.byline.agentAuthor
    ? resolvedPresentation() === "community_primary"
      ? identities().primaryIdentity ?? identities().secondaryIdentity
      : props.byline.author ?? identities().primaryIdentity ?? identities().secondaryIdentity
    : identities().primaryIdentity ?? identities().secondaryIdentity;
  const shouldShowAuthorNationalityBadge = () => Boolean(
    props.authorNationalityBadgeCountry
    && !props.byline.agentAuthor
    && props.byline.author
    && avatarIdentity() === props.byline.author
    && resolvedPresentation() !== "anonymous_primary"
    && resolvedPresentation() !== "anonymous_with_community"
    && !nationalityMatchesQualifier({
      countryCode: props.authorNationalityBadgeCountry!,
      locale: locale(),
      qualifierLabels: props.qualifierLabels,
    }),
  );

  const avatarElement = () => (
    <Show
      when={shouldShowAuthorNationalityBadge()}
      fallback={(
        <Avatar
          fallback={avatarIdentity()?.label ?? ""}
          fallbackSeed={avatarIdentity()?.avatarSeed}
          size="md"
          src={avatarIdentity()?.avatarSrc}
          class={cn(
            avatarIdentity()?.href && "cursor-pointer transition-opacity hover:opacity-80",
          )}
        />
      )}
    >
      <AvatarBadge
        avatarClass={cn(
          avatarIdentity()?.href && "cursor-pointer transition-opacity hover:opacity-80",
        )}
        badgeCountryCode={props.authorNationalityBadgeCountry}
        badgeLabel={props.authorNationalityBadgeLabel ?? buildNationalityBadgeLabel(props.authorNationalityBadgeCountry ?? "", locale())}
        fallback={avatarIdentity()?.label ?? ""}
        fallbackSeed={avatarIdentity()?.avatarSeed}
        size="md"
        src={avatarIdentity()?.avatarSrc}
      />
    </Show>
  );

  return (
    <div class={cn("flex items-center gap-2", props.class)}>
      <Show when={avatarIdentity()?.href} fallback={avatarElement()}>
        {(href) => (
          <a href={href()} class="shrink-0">
            <span data-post-card-interactive="true">
              {avatarElement()}
            </span>
          </a>
        )}
      </Show>
      <div class="min-w-0 flex-1 text-start">
        <PostCardBylineContent
          authorCommunityRole={props.authorCommunityRole}
          byline={props.byline}
          identityPresentation={props.identityPresentation}
          qualifierLabels={props.qualifierLabels}
          viewContext={props.viewContext}
          ownedByLabel={props.labels?.ownedBy ?? "owned by"}
        />
      </div>
      <PostCardActionMenu
        items={props.menuItems ?? []}
        label={props.saved
          ? (props.labels?.savedPostActions ?? "Saved post actions")
          : (props.labels?.postOptions ?? "Post options")}
        onAction={props.onMenuAction}
      />
    </div>
  );
}
