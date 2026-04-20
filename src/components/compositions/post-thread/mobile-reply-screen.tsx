import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";

import { MobileThreadScreen } from "./mobile-thread-screen";

export interface MobileReplyScreenProps {
  body: string;
  context?: React.ReactNode;
  onBodyChange: (value: string) => void;
  placeholder?: string;
  postLabel?: string;
  title: string;
}

export function MobileReplyScreen({
  body,
  context,
  onBodyChange,
  placeholder = "Write a reply",
  postLabel = "Post",
  title,
}: MobileReplyScreenProps) {
  return (
    <MobileThreadScreen
      title={title}
      trailingAction={(
        <Button className="h-11 px-4" disabled={!body.trim()} size="sm">
          {postLabel}
        </Button>
      )}
    >
      <div className="flex flex-1 flex-col gap-4">
        {context}
        <div>
          <Textarea
            autoFocus
            className={cn(
              "min-h-[20rem] flex-1 resize-none rounded-none border-0 bg-transparent px-0 py-0 leading-7 shadow-none",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
            )}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder={placeholder}
            value={body}
          />
        </div>
      </div>
    </MobileThreadScreen>
  );
}
