import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

interface EmptyInboxStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function EmptyInboxState({
  title,
  description,
  className,
}: EmptyInboxStateProps) {
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
            srcSet="/mascots/empty-inbox-ghost-512.webp 2x, /mascots/empty-inbox-ghost-256.webp 1x"
            type="image/webp"
          />
          <img
            alt="Friendly pirate ghost checking an empty mailbox"
            className="size-full object-cover"
            draggable={false}
            src="/mascots/empty-inbox-ghost-256.png"
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
    </div>
  );
}
