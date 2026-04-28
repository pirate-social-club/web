"use client";

import * as React from "react";

import pirateBrandMarkUrl from "@/assets/logo_ghost_sm.png";
import { cn } from "@/lib/utils";

export interface PirateBrandMarkProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  decorative?: boolean;
}

export const PirateBrandMark = React.forwardRef<HTMLImageElement, PirateBrandMarkProps>(
  ({ alt = "Pirate", className, decorative = true, ...props }, ref) => (
    <img
      {...props}
      alt={decorative ? "" : alt}
      aria-hidden={decorative ? "true" : undefined}
      className={cn("h-10 w-10 object-contain", className)}
      decoding="async"
      draggable={false}
      loading="eager"
      ref={ref}
      src={pirateBrandMarkUrl}
    />
  ),
);

PirateBrandMark.displayName = "PirateBrandMark";
