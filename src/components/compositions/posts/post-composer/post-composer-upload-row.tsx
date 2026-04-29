import * as React from "react";
import { X } from "@phosphor-icons/react";

import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import type { ComposerUploadValue } from "./post-composer.types";

export function PostComposerUploadRow({
  accept,
  description,
  icon,
  label,
  onChange,
  value,
}: {
  accept: string;
  description: string;
  icon: React.ReactNode;
  label: string;
  onChange: (value: ComposerUploadValue) => void;
  value: ComposerUploadValue;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    onChange({
      name: file.name,
      previewUrl: file.type.startsWith("image/") || file.type.startsWith("video/")
        ? URL.createObjectURL(file)
        : undefined,
    });
  }

  return (
    <>
      <div
        className="grid min-h-16 w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-3 text-start"
      >
        <button
          className={cn(
            "grid min-w-0 grid-cols-[auto_1fr] items-center gap-3 text-start",
            value ? "col-span-2" : "col-span-3",
          )}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <span className="grid size-12 place-items-center overflow-hidden rounded-[var(--radius-md)] bg-muted text-muted-foreground">
            {value?.previewUrl && accept.startsWith("image/") ? (
              <img alt="" className="size-full object-cover" src={value.previewUrl} />
            ) : value?.previewUrl && accept.startsWith("video/") ? (
              <video className="size-full object-cover" muted playsInline src={value.previewUrl} />
            ) : (
              icon
            )}
          </span>
          <span className="min-w-0">
            <Type as="span" variant="body-strong" className="block truncate">
              {value?.name ?? label}
            </Type>
            <Type as="span" variant="body" className="block truncate text-muted-foreground">
              {value ? "Replace" : description}
            </Type>
          </span>
        </button>
        {value ? (
          <button
            aria-label={`Remove ${label.toLowerCase()}`}
            className="grid size-10 place-items-center rounded-full text-muted-foreground"
            onClick={() => onChange(null)}
            type="button"
          >
            <X className="size-5" weight="bold" />
          </button>
        ) : null}
      </div>
      <input
        accept={accept}
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
        ref={inputRef}
        type="file"
      />
    </>
  );
}
