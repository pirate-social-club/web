"use client";

import * as React from "react";
import {
  FileText,
  Hash,
  MagnifyingGlass,
  Robot,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Type } from "@/components/primitives/type";
import type { ApiSearchResult } from "@/lib/api/client-api-types";
import { cn } from "@/lib/utils";

function fallbackIconForKind(kind: ApiSearchResult["kind"]) {
  switch (kind) {
    case "profile":
      return <UserCircle className="size-5" weight="regular" />;
    case "agent":
      return <Robot className="size-5" weight="regular" />;
    case "community":
      return <UsersThree className="size-5" weight="regular" />;
    case "namespace":
      return <Hash className="size-5" weight="bold" />;
    case "post":
      return <FileText className="size-5" weight="regular" />;
    default:
      return <MagnifyingGlass className="size-5" weight="regular" />;
  }
}

export function SearchResultRow({
  active = false,
  className,
  id,
  onMouseEnter,
  onSelect,
  result,
  role,
}: {
  active?: boolean;
  className?: string;
  id?: string;
  onMouseEnter?: () => void;
  onSelect: (result: ApiSearchResult) => void;
  result: ApiSearchResult;
  role?: React.AriaRole;
}) {
  return (
    <button
      aria-selected={role === "option" ? active : undefined}
      className={cn(
        "grid w-full grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-md px-3 py-2.5 text-start outline-none transition-colors",
        active ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/70",
        className,
      )}
      id={id}
      onClick={() => onSelect(result)}
      onMouseEnter={onMouseEnter}
      role={role}
      type="button"
    >
      <Avatar
        className="bg-card text-muted-foreground"
        fallback={result.title}
        fallbackIcon={fallbackIconForKind(result.kind)}
        fallbackSeed={result.resource.id}
        size="sm"
        src={result.image_ref ?? undefined}
      />
      <span className="min-w-0">
        <Type as="span" className="block truncate" variant="body">
          {result.title}
        </Type>
        {result.subtitle ? (
          <Type as="span" className="block truncate text-muted-foreground" variant="caption">
            {result.subtitle}
          </Type>
        ) : null}
        {result.excerpt ? (
          <Type as="span" className="mt-0.5 line-clamp-1 text-muted-foreground" variant="caption">
            {result.excerpt}
          </Type>
        ) : null}
      </span>
    </button>
  );
}
