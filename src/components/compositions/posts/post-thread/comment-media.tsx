"use client";

import * as React from "react";
import { Image as ImageIcon, X } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import type { PostThreadCommentMedia, PostThreadReplyAttachment } from "./post-thread.types";

export const commentImageAccept = "image/jpeg,image/png,image/webp,image/gif,image/avif";

export function createReplyAttachment(file: File): PostThreadReplyAttachment {
  return {
    file,
    label: file.name || "Image",
    mimeType: file.type || null,
    previewUrl: URL.createObjectURL(file),
    sizeBytes: file.size,
  };
}

export function revokeReplyAttachment(attachment: PostThreadReplyAttachment | null | undefined) {
  if (attachment?.file && attachment.previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
}

export function CommentMediaGrid({
  className,
  media,
}: {
  className?: string;
  media?: PostThreadCommentMedia[];
}) {
  const items = (media ?? []).filter((item) => item.storageRef.trim());
  if (items.length === 0) return null;

  return (
    <div className={cn("mt-2 grid max-w-sm gap-2", className)}>
      {items.map((item, index) => (
        <div
          className="block overflow-hidden rounded-[var(--radius-lg)] border border-border-soft bg-muted"
          key={`${item.storageRef}-${index}`}
          onClick={(event) => event.stopPropagation()}
        >
          <img
            alt={item.alt ?? ""}
            className="max-h-80 w-full object-contain"
            loading="lazy"
            src={item.storageRef}
          />
        </div>
      ))}
    </div>
  );
}

export function ReplyAttachmentControl({
  attachment,
  className,
  disabled,
  onChange,
}: {
  attachment: PostThreadReplyAttachment | null;
  className?: string;
  disabled?: boolean;
  onChange: (attachment: PostThreadReplyAttachment | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  function handleFileList(files: FileList | null) {
    const file = files?.[0] ?? null;
    if (!file) return;
    onChange(createReplyAttachment(file));
  }

  return (
    <div className={cn("space-y-2", className)}>
      {attachment ? (
        <div className="grid max-w-sm grid-cols-[72px_1fr_auto] items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-background p-2">
          <div className="size-[72px] overflow-hidden rounded-[var(--radius-md)] bg-muted">
            <img alt="" className="size-full object-cover" src={attachment.previewUrl} />
          </div>
          <div className="min-w-0">
            <Type as="div" variant="body-strong" className="truncate">{attachment.label}</Type>
            <Type as="div" variant="caption" className="truncate text-muted-foreground">
              {attachment.mimeType ?? "Image"}
            </Type>
          </div>
          <button
            aria-label="Remove image"
            className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            disabled={disabled}
            onClick={() => onChange(null)}
            type="button"
          >
            <X className="size-5" weight="bold" />
          </button>
        </div>
      ) : null}

      <Button
        disabled={disabled}
        leadingIcon={<ImageIcon className="size-5" />}
        onClick={() => inputRef.current?.click()}
        size="sm"
        variant="secondary"
      >
        {attachment ? "Replace image" : "Add image"}
      </Button>
      <input
        accept={commentImageAccept}
        className="sr-only"
        onChange={(event) => {
          handleFileList(event.target.files);
          event.currentTarget.value = "";
        }}
        ref={inputRef}
        type="file"
      />
    </div>
  );
}
