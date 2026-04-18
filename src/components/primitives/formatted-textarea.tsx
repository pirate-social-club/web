"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";

const toolbar = [
  { action: "bold", label: "B", title: "Bold" },
  { action: "italic", label: "I", title: "Italic" },
  { action: "strike", label: "S", title: "Strikethrough" },
  { action: "quote", label: ">", title: "Quote" },
  { action: "link", label: "[]", title: "Link" },
  { action: "bulletList", label: "UL", title: "Bulleted list" },
  { action: "orderedList", label: "OL", title: "Numbered list" },
] as const;

type ToolbarAction = (typeof toolbar)[number]["action"];

export interface FormattedTextareaProps
  extends Omit<React.ComponentProps<"textarea">, "onChange" | "value"> {
  containerClassName?: string;
  onChange?: (value: string) => void;
  value: string;
}

export function FormattedTextarea({
  className,
  containerClassName,
  onChange,
  value,
  ...props
}: FormattedTextareaProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const updateSelection = React.useCallback((selectionStart: number, selectionEnd: number) => {
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  }, []);

  const applyWrap = React.useCallback((
    token: string,
    fallbackText: string,
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const selectedText = value.slice(start, end);
    const insertedText = `${token}${selectedText || fallbackText}${token}`;
    const nextValue = `${value.slice(0, start)}${insertedText}${value.slice(end)}`;
    onChange?.(nextValue);
    const cursorStart = start + token.length;
    const cursorEnd = cursorStart + (selectedText || fallbackText).length;
    updateSelection(cursorStart, cursorEnd);
  }, [onChange, updateSelection, value]);

  const applyLinePrefix = React.useCallback((
    getPrefix: (index: number) => string,
    fallbackText: string,
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const nextLineBreak = value.indexOf("\n", end);
    const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
    const selectedBlock = value.slice(lineStart, lineEnd);
    const lines = selectedBlock.split("\n");
    const prefixedBlock = lines
      .map((line, index) => `${getPrefix(index)}${line || fallbackText}`)
      .join("\n");
    const nextValue = `${value.slice(0, lineStart)}${prefixedBlock}${value.slice(lineEnd)}`;
    onChange?.(nextValue);
    updateSelection(lineStart, lineStart + prefixedBlock.length);
  }, [onChange, updateSelection, value]);

  const applyLink = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const selectedText = value.slice(start, end) || "Link text";
    const insertedText = `[${selectedText}](https://)`;
    const nextValue = `${value.slice(0, start)}${insertedText}${value.slice(end)}`;
    onChange?.(nextValue);
    const urlStart = start + selectedText.length + 3;
    const urlEnd = urlStart + "https://".length;
    updateSelection(urlStart, urlEnd);
  }, [onChange, updateSelection, value]);

  const handleToolbarAction = React.useCallback((action: ToolbarAction) => {
    switch (action) {
      case "bold":
        applyWrap("**", "bold text");
        return;
      case "italic":
        applyWrap("*", "italic text");
        return;
      case "strike":
        applyWrap("~~", "struck text");
        return;
      case "quote":
        applyLinePrefix(() => "> ", "Quoted text");
        return;
      case "link":
        applyLink();
        return;
      case "bulletList":
        applyLinePrefix(() => "- ", "List item");
        return;
      case "orderedList":
        applyLinePrefix((index) => `${index + 1}. `, "List item");
        return;
    }
  }, [applyLinePrefix, applyLink, applyWrap]);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-input bg-background shadow-sm", containerClassName)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border-soft px-3 py-3">
        {toolbar.map((item) => (
          <button
            key={item.action}
            aria-label={item.title}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-transparent px-3 text-base font-semibold text-muted-foreground transition-colors hover:border-border-soft hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => handleToolbarAction(item.action)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <Textarea
        {...props}
        className={cn("min-h-32 rounded-none border-0 shadow-none focus-visible:ring-0", className)}
        onChange={(event) => onChange?.(event.target.value)}
        ref={textareaRef}
        value={value}
      />
    </div>
  );
}
