import * as React from "react";
import { MusicNote } from "@phosphor-icons/react";

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/primitives/item";
import { cn } from "@/lib/utils";
import type { SongItemProps } from "./song-item.types";

function SongItemMeta({ items }: { items: NonNullable<SongItemProps["metaItems"]> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-muted-foreground">
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {index > 0 ? <span aria-hidden>·</span> : null}
          {item.href ? (
            <a className="font-medium text-foreground hover:underline" href={item.href}>
              {item.label}
            </a>
          ) : (
            <span>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function SongItem({
  artistName,
  artworkAlt,
  artworkSrc,
  className,
  metaItems,
  title,
  titleHref,
  trailingContent,
  ...props
}: SongItemProps) {
  return (
    <Item className={cn("gap-4 px-5 py-4", className)} {...props}>
      <ItemMedia className="size-16 overflow-hidden rounded-[var(--radius-lg)] bg-muted" variant="image">
        {artworkSrc ? (
          <img
            alt={artworkAlt ?? title}
            className="size-full object-cover"
            src={artworkSrc}
          />
        ) : (
          <MusicNote className="size-5 text-muted-foreground" />
        )}
      </ItemMedia>
      <ItemContent className="gap-2">
        {titleHref ? (
          <a className="w-fit hover:underline" href={titleHref}>
            <ItemTitle>{title}</ItemTitle>
          </a>
        ) : (
          <ItemTitle>{title}</ItemTitle>
        )}
        {artistName ? (
          <ItemDescription className="line-clamp-1">{artistName}</ItemDescription>
        ) : null}
        {metaItems?.length ? <SongItemMeta items={metaItems} /> : null}
      </ItemContent>
      {trailingContent ? <ItemActions>{trailingContent}</ItemActions> : null}
    </Item>
  );
}
