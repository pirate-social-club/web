import { Type } from "@/components/primitives/type";

export interface ReplyContextCardProps {
  authorLabel: string;
  body: string;
  eyebrow?: string;
  metadata?: string;
}

export function ReplyContextCard({
  authorLabel,
  body,
  eyebrow,
  metadata,
}: ReplyContextCardProps) {
  return (
    <section className="border-b border-border-soft pb-3">
      <div className="space-y-2">
        {eyebrow ? <Type as="div" variant="caption" className="">{eyebrow}</Type> : null}
        <Type as="div" variant="caption" className="flex flex-wrap items-center gap-2 /85">
          <span className="font-medium text-foreground">{authorLabel}</span>
          {metadata ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{metadata}</span>
            </>
          ) : null}
        </Type>
        <p className="text-base leading-7 text-foreground/92">{body}</p>
      </div>
    </section>
  );
}
