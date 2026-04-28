import * as React from "react";

import { StandardRoutePage } from "./page-shell";

/**
 * Storybook wrapper that simulates the mobile default route shell context
 * (fixed header + bottom nav clearance). Use this when a component story
 * needs to render inside the actual route frame to catch gutter issues.
 */
export function StorybookMobileDefaultRoute({
  children,
  size = "rail",
}: {
  children: React.ReactNode;
  size?: React.ComponentProps<typeof StandardRoutePage>["size"];
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Fake fixed header to simulate shell chrome */}
      <div className="fixed inset-x-0 top-0 z-40 h-16 border-b border-border-soft bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex h-full items-center px-3">
          <div className="h-4 w-20 rounded bg-muted" />
        </div>
      </div>
      {/* Fake bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-border-soft bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="flex h-full items-center justify-around px-2">
          <div className="h-4 w-12 rounded bg-muted" />
          <div className="h-4 w-12 rounded bg-muted" />
          <div className="h-4 w-12 rounded bg-muted" />
        </div>
      </div>
      <StandardRoutePage size={size}>{children}</StandardRoutePage>
    </div>
  );
}
