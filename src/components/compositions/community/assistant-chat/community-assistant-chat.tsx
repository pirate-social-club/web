"use client";

import * as React from "react";
import { PaperPlaneTilt, PlusCircle } from "@phosphor-icons/react";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/system/modal/modal";
import { Button } from "@/components/primitives/button";
import { Textarea } from "@/components/primitives/textarea";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import type { ApiCommunityAssistantMessage } from "@/lib/api/client-api-types";

export type CommunityAssistantChatPolicyPreview = {
  displayName: string;
  shortBio: string;
  avatarRef: string | null;
  defaultPrompt: string;
  starterPrompts: string[];
};

export type CommunityAssistantChatModalProps = {
  draft: string;
  error?: string | null;
  loading?: boolean;
  messages: ApiCommunityAssistantMessage[];
  onDraftChange: (draft: string) => void;
  onNewChat: () => void;
  onOpenChange: (open: boolean) => void;
  onSend: (message?: string) => void;
  open: boolean;
  policy: CommunityAssistantChatPolicyPreview;
  sending?: boolean;
};

function MessageBubble({ message }: { message: ApiCommunityAssistantMessage }) {
  const fromUser = message.role === "user";

  return (
    <div className={cn("flex", fromUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-md px-4 py-3 text-base leading-7",
          fromUser
            ? "bg-primary text-primary-foreground"
            : "border border-border-soft bg-card text-card-foreground",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

export function CommunityAssistantChatModal({
  draft,
  error,
  loading = false,
  messages,
  onDraftChange,
  onNewChat,
  onOpenChange,
  onSend,
  open,
  policy,
  sending = false,
}: CommunityAssistantChatModalProps) {
  const canSend = draft.trim().length > 0 && !sending;
  const hasMessages = messages.length > 0;

  return (
    <Modal onOpenChange={onOpenChange} open={open}>
      <ModalContent className="flex max-h-[min(44rem,calc(100vh-2rem))] w-[min(100vw-2rem,44rem)] flex-col overflow-hidden border-border bg-background p-0">
        <ModalHeader className="shrink-0 border-b border-border-soft px-5 py-4 pe-12 text-start">
          <div className="flex min-w-0 items-center gap-3">
            {policy.avatarRef ? (
              <img
                alt=""
                className="size-11 shrink-0 rounded-full border border-border-soft object-cover"
                src={policy.avatarRef}
              />
            ) : (
              <div className="grid size-11 shrink-0 place-items-center rounded-full border border-border-soft bg-muted text-base font-semibold text-muted-foreground">
                {policy.displayName.trim().slice(0, 1).toUpperCase() || "A"}
              </div>
            )}
            <div className="min-w-0">
              <ModalTitle className="truncate">{policy.displayName}</ModalTitle>
              <ModalDescription className="line-clamp-1 text-sm text-muted-foreground">
                {policy.shortBio}
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex min-h-48 items-center justify-center text-base text-muted-foreground">
                Loading assistant...
              </div>
            ) : hasMessages ? (
              <div className="space-y-3">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col justify-end gap-5">
                <div className="space-y-2">
                  <Type as="p" variant="body" className="text-muted-foreground">
                    {policy.defaultPrompt}
                  </Type>
                </div>
                {policy.starterPrompts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {policy.starterPrompts.map((prompt, index) => (
                      <Button
                        key={`${index}:${prompt}`}
                        onClick={() => onSend(prompt)}
                        size="sm"
                        variant="outline"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {error ? (
            <div className="border-t border-border-soft px-5 py-3 text-base text-destructive">
              {error}
            </div>
          ) : null}

          <form
            className="shrink-0 border-t border-border-soft bg-background px-5 py-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSend) {
                onSend();
              }
            }}
          >
            <div className="flex items-end gap-2">
              <Textarea
                aria-label="Message assistant"
                className="max-h-32 min-h-12 resize-none rounded-md text-base leading-6"
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder="Ask this community..."
                rows={1}
                value={draft}
              />
              <Button
                aria-label="Send assistant message"
                disabled={!canSend}
                loading={sending}
                size="icon"
                type="submit"
              >
                <PaperPlaneTilt className="size-5" weight="bold" />
              </Button>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                leadingIcon={<PlusCircle className="size-4" weight="bold" />}
                onClick={onNewChat}
                size="sm"
                variant="ghost"
              >
                New chat
              </Button>
            </div>
          </form>
        </div>
      </ModalContent>
    </Modal>
  );
}
