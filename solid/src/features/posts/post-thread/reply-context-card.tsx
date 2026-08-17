import { Type } from "../../../design-system";

export interface ReplyContextCardProps {
  authorLabel: string;
  body: string;
  eyebrow?: string;
  metadata?: string;
}

export function ReplyContextCard(props: ReplyContextCardProps) {
  return (
    <section class="border-b border-border-soft pb-3">
      <div class="space-y-2">
        {props.eyebrow ? <Type as="div" variant="caption">{props.eyebrow}</Type> : null}
        <Type as="div" variant="caption" class="flex flex-wrap items-center gap-2">
          <Type as="span" variant="label" class="text-foreground">{props.authorLabel}</Type>
          {props.metadata ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{props.metadata}</span>
            </>
          ) : null}
        </Type>
        <Type as="p" variant="body">{props.body}</Type>
      </div>
    </section>
  );
}
