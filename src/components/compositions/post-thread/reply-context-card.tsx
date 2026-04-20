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
        {eyebrow ? <div className="text-base text-muted-foreground">{eyebrow}</div> : null}
        <div className="flex flex-wrap items-center gap-2 text-base text-muted-foreground/85">
          <span className="font-medium text-foreground">{authorLabel}</span>
          {metadata ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{metadata}</span>
            </>
          ) : null}
        </div>
        <p className="text-base leading-7 text-foreground/92">{body}</p>
      </div>
    </section>
  );
}
