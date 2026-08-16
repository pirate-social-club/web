import { Errored, type ParentProps } from "solid-js";
import type { JSX } from "@solidjs/web";

export function RenderErrorBoundary(props: ParentProps<{ fallback: JSX.Element }>) {
  return <Errored fallback={props.fallback}>{props.children}</Errored>;
}
