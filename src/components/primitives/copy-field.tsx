"use client";

import * as React from "react";
import { Check, Copy } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { useResettableTimeout } from "@/hooks/use-resettable-timeout";

import { Button } from "./button";
import { inputVariants } from "./input";

type CopyFieldProps = React.ComponentProps<"div"> & {
  /** Accessible name for the copied value, used by the copy button. */
  copyLabel?: string;
  value: string;
  /** Preserve the full value on screen instead of truncating it to one line. */
  wrap?: boolean;
};

function CopyField({ className, copyLabel = "value", ref, value, wrap = false, ...props }: CopyFieldProps) {
  const [copied, setCopied] = React.useState(false);
  const { schedule: scheduleCopiedReset } = useResettableTimeout();

  const handleCopy = React.useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    scheduleCopiedReset(() => setCopied(false), 2000);
  }, [scheduleCopiedReset, value]);

  return (
    <div
      className={cn(
        inputVariants({ size: "lg" }),
        "items-center gap-2 overflow-hidden pe-2",
        className,
      )}
      ref={ref}
      {...props}
    >
      <div
        className={cn(
          "min-w-0 flex-1 font-mono text-base text-foreground select-all",
          wrap ? "break-all whitespace-normal" : "truncate",
        )}
      >
        {value}
      </div>
      <Button
        aria-label={copied ? `${copyLabel} copied` : `Copy ${copyLabel}`}
        className="size-9 shrink-0"
        onClick={handleCopy}
        size="icon"
        variant="secondary"
      >
        {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
      </Button>
    </div>
  );
}

export { CopyField };
