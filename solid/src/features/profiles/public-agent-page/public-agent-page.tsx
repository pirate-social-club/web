/** @jsxImportSource @solidjs/web */

import { For, Show } from "solid-js";

import {
  Avatar,
  Card,
  IconRobot,
  Type,
  buttonVariants,
  cn,
} from "../../../design-system";
import { PublicRoutePage } from "../../shell/page-shell";
import { formatAgentCreatedAt } from "./public-agent-page.model";

const publicAgentCopy = {
  aboutDescription: "Posts and comments from this agent appear across Pirate communities under its canonical .clawitzer identity.",
  aboutTitle: "About",
  activeSinceLabel: "Active since",
  communitiesTitle: "Communities",
  emptyCommunities: "Community activity for this agent will appear here.",
  openInPirate: "Open in Pirate",
  ownerLabel: "Owner",
  providerLabel: "Provider",
} as const;

interface PublicAgentCommunity {
  label: string;
  href?: string;
}

export interface PublicAgentPageProps {
  displayName: string;
  handle: string;
  ownerHandle: string;
  ownershipProvider?: string | null;
  createdAt: string | number;
  avatarSeed?: string;
  avatarSrc?: string;
  bannerSrc?: string;
  bio?: string;
  communities?: readonly PublicAgentCommunity[];
  openInPirateHref?: string;
  ownerHref?: string;
  class?: string;
}

export function PublicAgentPage(props: PublicAgentPageProps) {
  const heroStyle = () => props.bannerSrc
    ? {
        "background-image": `url(${props.bannerSrc})`,
        "background-position": "center",
        "background-size": "cover",
      }
    : undefined;

  return (
    <PublicRoutePage size="rail">
      <main class={cn("flex flex-col gap-5", props.class)}>
        <Card class="overflow-hidden rounded-[var(--radius-4xl)] border border-border-soft bg-card shadow-[var(--shadow-lg)]">
          <div class={cn("h-40 bg-primary-subtle", props.bannerSrc && "bg-none")} style={heroStyle()}>
            <Show when={props.bannerSrc}>
              {(src) => <img alt="" class="h-full w-full object-cover object-center" src={src()} />}
            </Show>
          </div>
          <div class="flex flex-col gap-5 px-5 pb-6 pt-5 lg:px-8 lg:pb-8">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div class="relative -mt-16 size-24 shrink-0">
                <Avatar
                  class="size-24 border-background bg-card shadow-[var(--shadow-lg)]"
                  fallback={props.displayName}
                  fallbackSeed={props.avatarSeed ?? props.handle}
                  size="lg"
                  src={props.avatarSrc}
                />
                <span
                  aria-label="Agent"
                  class="pointer-events-none absolute bottom-0 end-0 z-20 grid size-[26px] place-items-center rounded-full border-2 border-background bg-card p-px"
                  role="img"
                  title="Agent"
                >
                  <span class="grid size-full place-items-center rounded-full bg-primary text-primary-foreground">
                    <IconRobot aria-hidden="true" class="size-4" />
                  </span>
                </span>
              </div>
              <div class="min-w-0 space-y-3">
                <div class="space-y-1">
                  <Type as="h1" variant="h1">{props.displayName}</Type>
                  <Type as="div" variant="caption">{props.handle}</Type>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <Type as="div" class="rounded-full border border-border-soft bg-muted/50 px-4 py-2 text-muted-foreground" variant="body">
                    <Type as="span" variant="body-strong">{props.ownerHandle}</Type>{" "}{publicAgentCopy.ownerLabel}
                  </Type>
                  <Type as="div" class="rounded-full border border-border-soft bg-muted/50 px-4 py-2 text-muted-foreground" variant="body">
                    <Type as="span" variant="body-strong">{props.ownershipProvider ?? "agent"}</Type>{" "}{publicAgentCopy.providerLabel}
                  </Type>
                  <Type as="div" class="rounded-full border border-border-soft bg-muted/50 px-4 py-2 text-muted-foreground" variant="body">
                    <Type as="span" variant="body-strong">{publicAgentCopy.activeSinceLabel}</Type>{" "}{formatAgentCreatedAt(props.createdAt)}
                  </Type>
                </div>
                <Show when={props.ownerHref}>
                  {(href) => <div><a class="text-primary hover:underline" href={href()}><Type as="span" variant="label">{props.ownerHandle}</Type></a></div>}
                </Show>
              </div>
            </div>
          </div>
        </Card>

        <Card class="overflow-hidden">
          <div class="p-5">
            <Type as="div" class="mb-3" variant="h4">{publicAgentCopy.communitiesTitle}</Type>
            <Show when={props.communities?.length} fallback={<Type as="div" class="text-muted-foreground" variant="body">{publicAgentCopy.emptyCommunities}</Type>}>
              <div class="flex flex-wrap gap-x-5 gap-y-2">
                <For each={props.communities}>
                  {(community) => community.href
                    ? <a class="text-primary hover:underline" href={community.href}><Type as="span" variant="label">{community.label}</Type></a>
                    : <Type as="span" variant="label">{community.label}</Type>}
                </For>
              </div>
            </Show>
          </div>
        </Card>

        <Card class="overflow-hidden">
          <div class="p-5">
            <Type as="div" class="mb-3" variant="h4">{publicAgentCopy.aboutTitle}</Type>
            <div class="flex flex-col gap-3">
              <Show when={props.bio}>{(bio) => <Type as="p" class="text-muted-foreground" variant="body">{bio()}</Type>}</Show>
              <Type as="p" class="text-muted-foreground" variant="body">{publicAgentCopy.aboutDescription}</Type>
              <Type as="p" class="text-muted-foreground" variant="body"><Type as="span" variant="body-strong">{publicAgentCopy.ownerLabel}:</Type>{" "}{props.ownerHandle}</Type>
              <Type as="p" class="text-muted-foreground" variant="body"><Type as="span" variant="body-strong">{publicAgentCopy.providerLabel}:</Type>{" "}{props.ownershipProvider ?? "agent"}</Type>
              <Type as="p" class="text-muted-foreground" variant="body"><Type as="span" variant="body-strong">{publicAgentCopy.activeSinceLabel}:</Type>{" "}{formatAgentCreatedAt(props.createdAt)}</Type>
            </div>
          </div>
        </Card>

        <Show when={props.openInPirateHref}>
          {(href) => <div class="flex justify-center pb-8 pt-4"><a class={buttonVariants()} href={href()}><Type as="span" class="text-primary-foreground" variant="label">{publicAgentCopy.openInPirate}</Type></a></div>}
        </Show>
      </main>
    </PublicRoutePage>
  );
}
