import { Type } from "@/components/primitives/type";
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

function LegalInlineText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  const partCounts = new Map<string, number>();

  return (
    <>
      {parts.map((part) => {
        const occurrence = partCounts.get(part) ?? 0;
        partCounts.set(part, occurrence + 1);
        const key = occurrence === 0 ? part : `${part}:${occurrence}`;

        if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
          return (
            <code
              className="rounded-md bg-foreground/8 px-1.5 py-0.5 font-mono text-base text-foreground"
              key={key}
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        return <React.Fragment key={key}>{part}</React.Fragment>;
      })}
    </>
  );
}

export function LegalMarkdown({
  className,
  source,
}: {
  className?: string;
  source: string;
}) {
  const blocks = React.useMemo(() => parseMarkdownBlocks(source), [source]);
  const blockCounts = new Map<string, number>();

  function getScopedKey(kind: string, value: string): string {
    const baseKey = `${kind}:${value}`;
    const occurrence = blockCounts.get(baseKey) ?? 0;
    blockCounts.set(baseKey, occurrence + 1);
    return occurrence === 0 ? baseKey : `${baseKey}:${occurrence}`;
  }

  return (
    <div className={cn("grid gap-5", className)}>
      {blocks.map((block) => {
        if (block.type === "heading") {
          const headingKey = getScopedKey(`heading-${block.level}`, block.text);

          if (block.level === 1) {
            return (
              <Type as="h1" variant="display" key={headingKey}>
                {block.text}
              </Type>
            );
          }

          if (block.level === 2) {
            return (
              <Type as="h2" variant="h2" className="pt-3" key={headingKey}>
                {block.text}
              </Type>
            );
          }

          return (
            <Type as="h3" variant="h4" key={headingKey}>
              {block.text}
            </Type>
          );
        }

        if (block.type === "list") {
          const itemCounts = new Map<string, number>();

          return (
            <ul className="grid gap-2 ps-6 text-base leading-7 text-muted-foreground" key={getScopedKey("list", block.items.join("\n"))}>
              {block.items.map((item) => {
                const occurrence = itemCounts.get(item) ?? 0;
                itemCounts.set(item, occurrence + 1);
                const itemKey = occurrence === 0 ? item : `${item}:${occurrence}`;

                return (
                  <li className="list-disc" key={itemKey}>
                    <LegalInlineText text={item} />
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p className="text-base leading-7 text-muted-foreground" key={getScopedKey("paragraph", block.text)}>
            <LegalInlineText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
