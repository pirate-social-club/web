import type { JSX } from "@solidjs/web";
import { createEffect, onCleanup } from "solid-js";

import { Button, Textarea } from "../../../design-system";
import { cn } from "../../../design-system";
import { createUiLocale } from "../../../lib/ui-locale";
import { ReplyAttachmentControl } from "./comment-media";
import { MobileThreadScreen } from "./mobile-thread-screen";
import type { PostThreadReplyAttachment } from "./types";
import { postThreadCommonCopy } from "./copy";

export interface MobileReplyScreenProps {
  attachment?: PostThreadReplyAttachment | null;
  body: string;
  busy?: boolean;
  context?: JSX.Element;
  identityControl?: JSX.Element;
  onAttachmentChange?: (attachment: PostThreadReplyAttachment | null) => void;
  onBodyChange: (value: string) => void;
  onCancel?: () => void;
  onSubmit?: () => void;
  placeholder?: string;
  postLabel?: string;
  title: string;
}

export function MobileReplyScreen(props: MobileReplyScreenProps) {
  const { locale } = createUiLocale();
  const copy = () => postThreadCommonCopy(locale());
  let textareaRef: HTMLTextAreaElement | undefined;

  createEffect(() => props.title, () => {
    if (typeof document === "undefined") return;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const body = document.body;
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
    textareaRef?.focus({ preventScroll: true });
    onCleanup(() => {
      Object.assign(body.style, {
        left: previousLeft,
        position: previousPosition,
        top: previousTop,
        width: previousWidth,
      });
      window.scrollTo(scrollX, scrollY);
    });
  });

  return (
    <MobileThreadScreen
      onBackClick={props.onCancel}
      stabilizeForKeyboard
      title={props.title}
      trailingAction={(
        <Button
          class="h-11 px-4"
          disabled={props.busy || !(props.body.trim() || props.attachment)}
          loading={props.busy}
          onClick={props.onSubmit}
          size="sm"
        >
          {props.postLabel ?? copy().submitReply}
        </Button>
      )}
    >
      <div class="flex flex-1 flex-col gap-4">
        {props.context}
        {props.identityControl}
        <div>
          <Textarea
            class={cn(
              "min-h-80 flex-1 resize-none rounded-none border-0 bg-transparent p-0 shadow-none",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
            )}
            onFocus={() => textareaRef?.focus({ preventScroll: true })}
            onInput={(event) => props.onBodyChange(event.currentTarget.value)}
            placeholder={props.placeholder ?? copy().replyPlaceholder}
            ref={(element) => { textareaRef = element; }}
            value={props.body}
          />
        </div>
        {props.onAttachmentChange ? (
          <ReplyAttachmentControl
            attachment={props.attachment ?? null}
            disabled={props.busy}
            onChange={props.onAttachmentChange!}
          />
        ) : null}
      </div>
    </MobileThreadScreen>
  );
}
