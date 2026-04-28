"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";

export interface AutoResizeTextareaProps
  extends React.ComponentProps<"textarea"> {
  maxRows?: number;
}

const AutoResizeTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutoResizeTextareaProps
>(({ className, maxRows = 5, rows = 1, onInput, ...props }, ref) => {
  const innerRef = React.useRef<HTMLTextAreaElement>(null);
  React.useImperativeHandle(ref, () => innerRef.current!);

  const resize = React.useCallback(() => {
    const textarea = innerRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const computedStyle = getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;

    const maxScrollHeight = maxRows * lineHeight + paddingTop + paddingBottom;
    const nextScrollHeight = Math.min(textarea.scrollHeight, maxScrollHeight);

    textarea.style.height = `${nextScrollHeight + borderTop + borderBottom}px`;
  }, [maxRows]);

  React.useLayoutEffect(() => {
    resize();
  });

  React.useEffect(() => {
    const handleResize = () => resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resize]);

  return (
    <Textarea
      className={cn("resize-none", className)}
      onInput={(event) => {
        resize();
        onInput?.(event);
      }}
      ref={innerRef}
      rows={rows}
      {...props}
    />
  );
});
AutoResizeTextarea.displayName = "AutoResizeTextarea";

export { AutoResizeTextarea };
