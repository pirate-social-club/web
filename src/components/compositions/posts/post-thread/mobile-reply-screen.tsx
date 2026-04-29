import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

import { MobileThreadScreen } from "./mobile-thread-screen";

export interface MobileReplyScreenProps {
  body: string;
  busy?: boolean;
  context?: React.ReactNode;
  onBodyChange: (value: string) => void;
  onCancel?: () => void;
  onSubmit?: () => void;
  placeholder?: string;
  postLabel?: string;
  title: string;
}

export function MobileReplyScreen({
  body,
  busy = false,
  context,
  onBodyChange,
  onCancel,
  onSubmit,
  placeholder,
  postLabel,
  title,
}: MobileReplyScreenProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;
  return (
    <MobileThreadScreen
      onBackClick={onCancel}
      title={title}
      trailingAction={(
        <Button
          className="h-11 px-4"
          disabled={busy || !body.trim()}
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
        <div>
          <Textarea
            autoFocus
            className={cn(
              "min-h-80 flex-1 resize-none rounded-none border-0 bg-transparent px-0 py-0 leading-7 shadow-none",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
            )}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder={placeholder ?? copy.replyPlaceholder}
            value={body}
          />
        </div>
      </div>
    </MobileThreadScreen>
  );
}
