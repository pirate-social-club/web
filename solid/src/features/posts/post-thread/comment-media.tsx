import { createSignal, Show } from "solid-js";

import { Button, IconImage, IconX, Type, cn } from "../../../design-system";
import type { PostThreadCommentMedia, PostThreadReplyAttachment } from "./types";

const commentImageAccept = "image/jpeg,image/png,image/webp,image/gif,image/avif";

function createReplyAttachment(file: File): PostThreadReplyAttachment {
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

export function CommentMediaGrid(props: { class?: string; media?: PostThreadCommentMedia[] }) {
  const items = () => (props.media ?? []).filter((item) => item.storageRef.trim());
  return (
    <Show when={items().length > 0}>
      <div class={cn("mt-2 grid max-w-sm gap-2", props.class)}>
        {items().map((item) => (
          <div class="block overflow-hidden rounded-[var(--radius-lg)] border border-border-soft bg-muted">
            <img alt={item.alt ?? ""} class="max-h-80 w-full object-contain" loading="lazy" src={item.storageRef} />
          </div>
        ))}
      </div>
    </Show>
  );
}

export function ReplyAttachmentControl(props: {
  attachment: PostThreadReplyAttachment | null;
  class?: string;
  disabled?: boolean;
  onChange: (attachment: PostThreadReplyAttachment | null) => void;
}) {
  let inputRef: HTMLInputElement | undefined;
  const [fileRevision, setFileRevision] = createSignal(0);

  const handleFileList = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    props.onChange(createReplyAttachment(file));
    setFileRevision((value) => value + 1);
  };

  return (
    <div class={cn("space-y-2", props.class)} data-file-revision={fileRevision()}>
      <Show when={props.attachment}>
        {(attachment) => (
          <div class="grid max-w-sm grid-cols-[4.5rem_1fr_auto] items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-background p-2">
            <div class="size-[4.5rem] overflow-hidden rounded-[var(--radius-md)] bg-muted">
              <img alt="" class="size-full object-cover" src={attachment().previewUrl} />
            </div>
            <div class="min-w-0">
              <Type as="div" variant="body-strong" class="truncate">{attachment().label}</Type>
              <Type as="div" variant="caption" class="truncate">{attachment().mimeType ?? "Image"}</Type>
            </div>
            <button
              aria-label="Remove image"
              class="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              disabled={props.disabled}
              onClick={() => props.onChange(null)}
              type="button"
            >
              <IconX class="size-5" />
            </button>
          </div>
        )}
      </Show>

      <Button
        disabled={props.disabled}
        leadingIcon={<IconImage class="size-5" />}
        onClick={() => inputRef?.click()}
        size="sm"
        variant="secondary"
      >
        {props.attachment ? "Replace image" : "Add image"}
      </Button>
      <input
        accept={commentImageAccept}
        aria-label="Image attachment"
        class="sr-only"
        onChange={(event) => {
          handleFileList(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
        ref={(element) => { inputRef = element; }}
        type="file"
      />
    </div>
  );
}
