"use client";

import * as React from "react";

import pirateBrandMarkUrl from "@/assets/logo_ghost_sm.png";
import { cn } from "@/lib/utils";

export interface PirateBrandMarkProps extends Omit<React.ComponentProps<"img">, "src"> {
  decorative?: boolean;
}

export function PirateBrandMark({
  alt = "Pirate",
  className,
  decorative = true,
  ref,
  ...props
}: PirateBrandMarkProps) {
  return (
    <img
      {...props}
      alt={decorative ? "" : alt}
      aria-hidden={decorative ? "true" : undefined}
      className={cn("size-10 object-contain", className)}
      decoding="async"
      draggable={false}
      loading="eager"
      ref={ref}
      src={pirateBrandMarkUrl}
    />
  );
}
