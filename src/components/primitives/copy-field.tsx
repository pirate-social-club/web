"use client";

import * as React from "react";
import { Check, Copy } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

import { Button } from "./button";
import { inputVariants } from "./input";

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
          inputVariants({ size: "lg" }),
          "items-center gap-2 overflow-hidden pe-2",
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
