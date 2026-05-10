import * as React from "react";

import { cn } from "@/lib/utils";

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const inlinePattern =
    /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*\*([\s\S]+?)\*\*\*|\*\*([\s\S]+?)\*\*|\*([\s\S]+?)\*|~~([\s\S]+?)~~)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = inlinePattern.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const [
      fullMatch,
      ,
      linkLabel,
      linkHref,
      boldItalicText,
      boldText,
      italicText,
      strikeText,
    ] = match;
    const key = `${keyPrefix}-${match.index}`;

    if (linkLabel && linkHref) {
      nodes.push(
        <a
          className="text-primary underline underline-offset-4"
          href={linkHref}
          key={key}
          rel="noreferrer"
          target="_blank"
        >
          {linkLabel}
        </a>,
      );
    } else if (boldItalicText) {
      nodes.push(
        <strong key={key}>
          <em>{renderInline(boldItalicText, `${key}-strong-em`)}</em>
        </strong>,
      );
    } else if (boldText) {
      nodes.push(<strong key={key}>{renderInline(boldText, `${key}-strong`)}</strong>);
    } else if (italicText) {
      nodes.push(<em key={key}>{renderInline(italicText, `${key}-em`)}</em>);
    } else if (strikeText) {
      nodes.push(<s key={key}>{renderInline(strikeText, `${key}-strike`)}</s>);
    } else {
      nodes.push(fullMatch);
    }

    lastIndex = match.index + fullMatch.length;
    match = inlinePattern.exec(text);
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function FormattedInline({ text, keyPrefix }: { text: string; keyPrefix: string }) {
  return <>{renderInline(text, keyPrefix)}</>;
}

function FormattedParagraph({ lines, textKey }: { lines: string[]; textKey: string }) {
  return (
    <p className="leading-snug text-inherit">
      <FormattedInline keyPrefix={textKey} text={lines.join(" ")} />
    </p>
  );
}

function nextFormattedTextKey(
  keyCounts: Map<string, number>,
  kind: string,
  value: string,
): string {
  const baseKey = `${kind}:${value}`;
  const occurrence = keyCounts.get(baseKey) ?? 0;
  keyCounts.set(baseKey, occurrence + 1);
  return occurrence === 0 ? baseKey : `${baseKey}:${occurrence}`;
}

export function FormattedText({
  className,
  dir = "auto",
  lang,
  value,
}: {
  className?: string;
  dir?: React.HTMLAttributes<HTMLDivElement>["dir"];
  lang?: string;
  value: string;
}) {
  const lines = value.split("\n");
  const blocks: React.ReactNode[] = [];
  const keyCounts = new Map<string, number>();
  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index]?.trim() ?? "";

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index]?.trim() ?? "")) {
        quoteLines.push((lines[index] ?? "").trim().replace(/^>\s?/, ""));
        index += 1;
      }
      const quoteKey = nextFormattedTextKey(keyCounts, "quote", quoteLines.join("\n"));
      blocks.push(
        <blockquote
          className="border-s-2 border-border-soft ps-4 italic text-muted-foreground"
          key={quoteKey}
        >
          <FormattedParagraph lines={quoteLines} textKey={quoteKey} />
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      const itemLines: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index]?.trim() ?? "")) {
        const itemLine = (lines[index] ?? "").trim().replace(/^[-*]\s+/, "");
        const itemKey = nextFormattedTextKey(keyCounts, "ul-item", itemLine);
        itemLines.push(itemLine);
        items.push(
          <li key={itemKey}>
            <FormattedInline keyPrefix={itemKey} text={itemLine} />
          </li>,
        );
        index += 1;
      }
      const listKey = nextFormattedTextKey(keyCounts, "ul-block", itemLines.join("\n"));
      blocks.push(
        <ul className="list-disc space-y-1 ps-6 leading-snug text-inherit" key={listKey}>
          {items}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      const itemLines: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index]?.trim() ?? "")) {
        const itemLine = (lines[index] ?? "").trim().replace(/^\d+\.\s+/, "");
        const itemKey = nextFormattedTextKey(keyCounts, "ol-item", itemLine);
        itemLines.push(itemLine);
        items.push(
          <li key={itemKey}>
            <FormattedInline keyPrefix={itemKey} text={itemLine} />
          </li>,
        );
        index += 1;
      }
      const listKey = nextFormattedTextKey(keyCounts, "ol-block", itemLines.join("\n"));
      blocks.push(
        <ol className="list-decimal space-y-1 ps-6 leading-snug text-inherit" key={listKey}>
          {items}
        </ol>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const line = lines[index] ?? "";
      const lineTrimmed = line.trim();
      if (!lineTrimmed || /^>\s?/.test(lineTrimmed) || /^[-*]\s+/.test(lineTrimmed) || /^\d+\.\s+/.test(lineTrimmed)) {
        break;
      }
      paragraphLines.push(line);
      index += 1;
    }
    const paragraphKey = nextFormattedTextKey(keyCounts, "p", paragraphLines.join("\n"));
    blocks.push(
      <FormattedParagraph key={paragraphKey} lines={paragraphLines} textKey={paragraphKey} />,
    );
  }

  return (
    <div className={cn("space-y-3 text-base", className)} dir={dir} lang={lang}>
      {blocks}
    </div>
  );
}
