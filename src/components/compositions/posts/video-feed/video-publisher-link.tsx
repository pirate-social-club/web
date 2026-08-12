"use client";

import * as React from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";

export function VideoPublisherLink({
  children,
  className,
  external = false,
  handle,
  href,
  label,
  showExternalIcon = false,
}: {
  children: React.ReactNode;
  className: string;
  external?: boolean;
  handle: string;
  href: string;
  label?: string;
  showExternalIcon?: boolean;
}) {
  return (
    <a
      aria-label={external && label ? `${handle} — ${label}` : undefined}
      className={className}
      data-publisher-external={external ? "true" : undefined}
      href={href}
    >
      {children}
      {external && showExternalIcon ? <ArrowSquareOut aria-hidden className="ms-1 inline-block size-3.5 align-[-0.1em]" /> : null}
    </a>
  );
}
