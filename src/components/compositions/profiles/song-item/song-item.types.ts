import type * as React from "react";

export interface SongItemMetaItem {
  label: string;
  href?: string;
}

export interface SongItemData {
  title: string;
  titleHref?: string;
  artistName?: string;
  artworkSrc?: string;
  artworkAlt?: string;
  metaItems?: SongItemMetaItem[];
}

export interface SongItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    SongItemData {
  trailingContent?: React.ReactNode;
}
