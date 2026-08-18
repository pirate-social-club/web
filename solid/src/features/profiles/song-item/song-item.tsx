/** @jsxImportSource @solidjs/web */

import type { JSX } from "@solidjs/web";
import { For, Show } from "solid-js";

import {
  IconMusicNote,
  Type,
  cn,
} from "../../../design-system";

export interface SongItemMetaItem {
  label: string;
  href?: string;
}

export interface SongItemProps {
  title: string;
  titleHref?: string;
  artistName?: string;
  artworkSrc?: string;
  artworkAlt?: string;
  metaItems?: SongItemMetaItem[];
  trailingContent?: JSX.Element;
  class?: string;
}

export function SongItem(props: SongItemProps) {
  const artworkSrc = () => props.artworkSrc?.trim() || "";

  return (
    <article class={cn("flex min-w-0 items-center gap-4 px-5 py-4", props.class)}>
      <div class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-lg)] bg-muted">
        <Show
          when={artworkSrc()}
          fallback={<IconMusicNote aria-hidden="true" class="size-5 text-muted-foreground" />}
        >
          {(src) => <img alt={props.artworkAlt ?? `${props.title} artwork`} class="size-full object-cover" src={src()} />}
        </Show>
      </div>

      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <Show
          when={props.titleHref}
          fallback={<Type as="div" class="truncate" variant="body-strong">{props.title}</Type>}
        >
          {(href) => <a class="block truncate hover:underline" href={href()}><Type as="span" variant="body-strong">{props.title}</Type></a>}
        </Show>
        <Show when={props.artistName}>
          {(artist) => <Type as="div" class="truncate text-muted-foreground" variant="caption">{artist()}</Type>}
        </Show>
        <Show when={props.metaItems?.length}>
          <Type as="div" class="flex flex-wrap gap-x-2 gap-y-1 text-muted-foreground" variant="caption">
            <For each={props.metaItems}>
              {(item, index) => (
                <>
                  <Show when={index() > 0}><span aria-hidden="true">·</span></Show>
                  <Show when={item.href} fallback={<span>{item.label}</span>}>
                    {(href) => <a class="hover:underline" href={href()}>{item.label}</a>}
                  </Show>
                </>
              )}
            </For>
          </Type>
        </Show>
      </div>

      <Show when={props.trailingContent}>
        <div class="shrink-0">{props.trailingContent}</div>
      </Show>
    </article>
  );
}
