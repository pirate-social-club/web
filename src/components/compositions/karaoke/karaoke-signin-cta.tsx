import { Microphone } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export interface KaraokeSignInCtaProps {
  /** Triggers the auth flow (Privy connect). Absent when sign-in is unavailable. */
  onSignIn?: () => void;
  /** True while the auth flow is mounting/opening (in-button spinner). */
  busy?: boolean;
  /** True when auth cannot be offered (Privy not configured or failed to load). */
  unavailable?: boolean;
  className?: string;
}

/**
 * Logged-out stand-in for the scoring panel: occupies the same slot the post-auth
 * "Start" CTA uses, so the karaoke page is never a dead-end. Clicking "Sing" opens
 * the auth flow; once a session exists the route swaps this for the scoring panel.
 */
export function KaraokeSignInCta({ busy = false, className, onSignIn, unavailable = false }: KaraokeSignInCtaProps) {
  if (unavailable || !onSignIn) {
    return (
      <div className={cn("flex w-full flex-col items-center gap-2 text-center", className)}>
        <Type as="p" className="text-muted-foreground" variant="caption">
          Sign-in is unavailable right now.
        </Type>
      </div>
    );
  }

  return (
    <div className={cn("flex w-full flex-col items-center gap-3 text-center", className)}>
      <Button
        className="w-full"
        leadingIcon={<Microphone className="size-5" weight="fill" />}
        loading={busy}
        onClick={onSignIn}
        size="lg"
      >
        Sing
      </Button>
      <Type as="p" className="text-muted-foreground" variant="caption">
        Sign in to sing along and get scored.
      </Type>
    </div>
  );
}
