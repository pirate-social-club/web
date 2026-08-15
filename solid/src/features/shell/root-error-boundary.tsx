import type { JSX } from "@solidjs/web";
import { Errored } from "solid-js";

import { RootAppErrorState } from "@pirate/web-solid-ui";

export interface RootErrorBoundaryProps {
  children: JSX.Element;
  description: string;
  homeLabel?: string;
  onGoHome?: () => void;
  title: string;
}

/**
 * Root render-error boundary on Solid's Errored. The React version reset from
 * a resetKey prop change; Solid remounts the boundary with its parent, so the
 * host keys remounts by route instead.
 */
export function RootErrorBoundary(props: RootErrorBoundaryProps) {
  return (
    <Errored
      fallback={() => (
        <RootAppErrorState
          description={props.description}
          homeLabel={props.homeLabel ?? "Go Home"}
          onGoHome={props.onGoHome}
          title={props.title}
        />
      )}
    >
      {props.children}
    </Errored>
  );
}
