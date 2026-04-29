import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title,
  description,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 px-5 py-10 text-center",
        className,
      )}
    >
      <div className="relative size-32 overflow-hidden rounded-full md:size-40">
        <picture>
          <source
            srcSet="/mascots/error-ghost-512.webp 2x, /mascots/error-ghost-256.webp 1x"
            type="image/webp"
          />
          <img
            alt="Confused pirate ghost"
            className="size-full object-cover"
            draggable={false}
            src="/mascots/error-ghost-256.png"
          />
        </picture>
      </div>
      {title ? (
        <Type as="p" className="text-muted-foreground" variant="h4">
          {title}
        </Type>
      ) : null}
      {description ? (
        <p className="max-w-xs text-lg leading-7 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
