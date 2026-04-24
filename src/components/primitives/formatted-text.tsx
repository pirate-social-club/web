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

function renderParagraph(lines: string[], key: string) {
  return (
    <p className="leading-snug text-inherit" key={key}>
      {renderInline(lines.join(" "), key)}
    </p>
  );
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
      blocks.push(
        <blockquote
          className="border-s-2 border-border-soft ps-4 italic text-muted-foreground"
          key={`quote-${index}`}
        >
          {renderParagraph(quoteLines, `quote-${index}`)}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index]?.trim() ?? "")) {
        const itemLine = (lines[index] ?? "").trim().replace(/^[-*]\s+/, "");
        items.push(<li key={`ul-${index}`}>{renderInline(itemLine, `ul-${index}`)}</li>);
        index += 1;
      }
      blocks.push(
        <ul className="list-disc space-y-1 ps-6 leading-snug text-inherit" key={`ul-block-${index}`}>
          {items}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index]?.trim() ?? "")) {
        const itemLine = (lines[index] ?? "").trim().replace(/^\d+\.\s+/, "");
        items.push(<li key={`ol-${index}`}>{renderInline(itemLine, `ol-${index}`)}</li>);
        index += 1;
      }
      blocks.push(
        <ol className="list-decimal space-y-1 ps-6 leading-snug text-inherit" key={`ol-block-${index}`}>
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
    blocks.push(renderParagraph(paragraphLines, `p-${index}`));
  }

  return (
    <div className={cn("space-y-3 text-base", className)} dir={dir} lang={lang}>
      {blocks}
    </div>
  );
}
