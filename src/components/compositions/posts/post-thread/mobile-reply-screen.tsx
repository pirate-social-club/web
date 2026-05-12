"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

import { ReplyAttachmentControl } from "./comment-media";
import { MobileThreadScreen } from "./mobile-thread-screen";
import type { PostThreadReplyAttachment } from "./post-thread.types";

export interface MobileReplyScreenProps {
  attachment?: PostThreadReplyAttachment | null;
  body: string;
  busy?: boolean;
  context?: React.ReactNode;
  identityControl?: React.ReactNode;
  onAttachmentChange?: (attachment: PostThreadReplyAttachment | null) => void;
  onBodyChange: (value: string) => void;
  onCancel?: () => void;
  onSubmit?: () => void;
  placeholder?: string;
  postLabel?: string;
  title: string;
}

export function MobileReplyScreen({
  attachment = null,
  body,
  busy = false,
  context,
  identityControl,
  onAttachmentChange,
  onBodyChange,
  onCancel,
  onSubmit,
  placeholder,
  postLabel,
  title,
}: MobileReplyScreenProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useLayoutEffect(() => {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const { body } = document;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousLeft = body.style.left;
    const previousWidth = body.style.width;

    Object.assign(body.style, {
      left: `-${scrollX}px`,
      position: "fixed",
      top: `-${scrollY}px`,
      width: "100%",
    });
    textareaRef.current?.focus({ preventScroll: true });

    return () => {
      Object.assign(body.style, {
        left: previousLeft,
        position: previousPosition,
        top: previousTop,
        width: previousWidth,
      });
      window.scrollTo(scrollX, scrollY);
    };
  }, []);

  return (
    <MobileThreadScreen
      onBackClick={onCancel}
      stabilizeForKeyboard
      title={title}
      trailingAction={(
        <Button
          className="h-11 px-4"
          disabled={busy || !(body.trim() || attachment)}
          loading={busy}
          onClick={onSubmit}
          size="sm"
        >
          {postLabel ?? copy.submitReply}
        </Button>
      )}
    >
      <div className="flex flex-1 flex-col gap-4">
        {context}
        {identityControl}
        <div>
          <Textarea
            className={cn(
              "min-h-80 flex-1 resize-none rounded-none border-0 bg-transparent p-0 leading-7 shadow-none",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
            )}
            onFocus={() => textareaRef.current?.focus({ preventScroll: true })}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder={placeholder ?? copy.replyPlaceholder}
            ref={textareaRef}
            value={body}
          />
        </div>
        {onAttachmentChange ? (
          <ReplyAttachmentControl
            attachment={attachment}
            disabled={busy}
            onChange={onAttachmentChange}
          />
        ) : null}
      </div>
    </MobileThreadScreen>
  );
}
