import * as React from "react";

import { cn } from "@/lib/utils";

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    const text = paragraphLines.join(" ").trim();
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", items: listItems });
    }
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 1, text: line.slice(2).trim() });
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 2, text: line.slice(3).trim() });
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 3, text: line.slice(4).trim() });
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      listItems.push(line.slice(2).trim());
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function renderInlineText(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          className="rounded-md bg-foreground/8 px-1.5 py-0.5 font-mono text-base text-foreground"
          key={`${part}-${index}`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

export function LegalMarkdown({
  className,
  source,
}: {
  className?: string;
  source: string;
}) {
  const blocks = React.useMemo(() => parseMarkdownBlocks(source), [source]);

  return (
    <div className={cn("grid gap-5", className)}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          if (block.level === 1) {
            return (
              <h1
                className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl"
                key={`block-${index}`}
              >
                {block.text}
              </h1>
            );
          }

          if (block.level === 2) {
            return (
              <h2
                className="pt-3 text-2xl font-semibold tracking-tight text-foreground"
                key={`block-${index}`}
              >
                {block.text}
              </h2>
            );
          }

          return (
            <h3 className="text-lg font-semibold text-foreground" key={`block-${index}`}>
              {block.text}
            </h3>
          );
        }

        if (block.type === "list") {
          return (
            <ul className="grid gap-2 ps-6 text-base leading-7 text-muted-foreground" key={`block-${index}`}>
              {block.items.map((item, itemIndex) => (
                <li className="list-disc" key={`item-${index}-${itemIndex}`}>
                  {renderInlineText(item)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p className="text-base leading-7 text-muted-foreground" key={`block-${index}`}>
            {renderInlineText(block.text)}
          </p>
        );
      })}
    </div>
  );
}
