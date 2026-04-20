"use client";

import * as React from "react";
import { Check, Copy } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

import { Button } from "./button";

type CopyFieldProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
};

const CopyField = React.forwardRef<HTMLDivElement, CopyFieldProps>(
  ({ className, value, ...props }, ref) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = React.useCallback(async () => {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }, [value]);

    return (
      <div
        className={cn(
          "flex h-12 overflow-hidden items-center gap-2 rounded-lg border border-input bg-background px-4 shadow-sm",
          className,
        )}
        ref={ref}
        {...props}
      >
        <div className="min-w-0 flex-1 truncate font-mono text-base text-foreground select-all">
          {value}
        </div>
        <Button
          aria-label={copied ? "Copied" : "Copy value"}
          className="size-9 shrink-0"
          onClick={handleCopy}
          size="icon"
          variant="secondary"
        >
          {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
        </Button>
      </div>
    );
  },
);

CopyField.displayName = "CopyField";

export { CopyField };
