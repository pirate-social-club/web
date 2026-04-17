import * as React from "react";
import {
  CaretDown,
  DotsThree,
  Image as ImageIcon,
  Link,
  List,
  Tag,
  Trash,
} from "@phosphor-icons/react";
import { Button } from "@/components/primitives/button";
import { FormFieldLabel } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";

export function ShellPill({
  avatarSrc,
  children,
}: {
  avatarSrc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full bg-muted px-3.5 py-2.5 text-base font-semibold text-foreground">
      {avatarSrc ? (
        <img alt="" className="size-8 rounded-full object-cover" src={avatarSrc} />
      ) : (
        <div className="grid size-8 place-items-center rounded-full bg-background text-muted-foreground">
          <Tag className="size-5" />
        </div>
      )}
      <span>{children}</span>
      <CaretDown className="size-5 text-muted-foreground" />
    </div>
  );
}

export function FieldLabel({
  label,
  counter,
}: {
  label: string;
  counter?: string;
}) {
  return <FormFieldLabel className="mb-2" counter={counter} label={label} />;
}

export function UploadField({
  label,
  accept,
  multiple = false,
  onChange,
  selectedLabel,
  variant = "default",
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  onChange?: (files: FileList | null) => void;
  selectedLabel?: string;
  variant?: "default" | "artwork";
}) {
  const inputId = React.useId();
  const isArtwork = variant === "artwork";

  return (
    <div className="block">
      <FieldLabel label={label} />
      <input
        id={inputId}
        accept={accept}
        className="sr-only"
        multiple={multiple}
        onChange={(event) => onChange?.(event.target.files)}
        type="file"
      />
      <label
        className={cn(
          "flex w-full cursor-pointer rounded-[var(--radius-lg)] border border-border-soft bg-background transition-colors hover:border-primary/40",
          isArtwork ? "items-center gap-4 px-4 py-4" : "items-center justify-between gap-4 px-4 py-3.5",
        )}
        htmlFor={inputId}
      >
        {isArtwork ? (
          <>
            <div className="grid size-24 shrink-0 place-items-center rounded-[var(--radius-lg)] border border-border-soft bg-muted">
              {selectedLabel ? (
                <span className="px-3 text-center text-base font-semibold text-foreground">
                  Cover
                </span>
              ) : (
                <ImageIcon className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-base font-semibold text-foreground">
                {selectedLabel || "Upload square artwork"}
              </p>
              <p className="text-base text-muted-foreground">
                Shows in feed, release, and player surfaces.
              </p>
            </div>
          </>
        ) : (
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">
              {selectedLabel || "No file selected"}
            </p>
          </div>
        )}
        <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-3.5 py-2 text-base font-semibold text-foreground">
          {selectedLabel ? "Replace" : "Choose file"}
        </span>
      </label>
    </div>
  );
}

export function LabeledTextarea({
  label,
  placeholder,
  defaultValue,
  value,
  onChange,
  className,
}: {
  label: string;
  placeholder: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <div>
      <FieldLabel label={label} />
      <Textarea
        className={className}
        defaultValue={value == null ? defaultValue : undefined}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}

export function EditorChrome({
  value,
  onChange,
}: {
  value: string;
  onChange?: (value: string) => void;
}) {
  const toolbar = ["B", "i", "S", "x2", "T", "link", "list", "ordered", "more"];

  return (
    <div className="rounded-full border border-border-soft bg-background">
      <div className="flex flex-wrap items-center gap-3 border-b border-border-soft px-4 py-3 text-muted-foreground">
        {toolbar.map((item) => (
          <span key={item} className="text-base font-medium">
            {item === "link" ? <Link className="size-5" /> : null}
            {item === "list" ? <List className="size-5" /> : null}
            {item === "ordered" ? <List className="size-5" /> : null}
            {item === "more" ? <DotsThree className="size-5" /> : null}
            {!["link", "list", "ordered", "more"].includes(item) ? item : null}
          </span>
        ))}
      </div>
      <Textarea
        className="min-h-44 rounded-none border-0 shadow-none focus-visible:ring-0"
        onChange={(event) => onChange?.(event.target.value)}
        value={value}
      />
    </div>
  );
}

export function LinkPreviewCard({
  title,
  domain,
  description,
  imageSrc,
}: {
  title: string;
  domain: string;
  description?: string;
  imageSrc?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border-soft bg-card">
      <div className="flex min-h-28 flex-col md:flex-row">
        <div className="flex-1 space-y-2 px-4 py-4">
          <p className="text-base font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Preview
          </p>
          <p className="text-base font-semibold text-foreground">{title}</p>
          {description ? <p className="text-base text-muted-foreground">{description}</p> : null}
          <p className="text-base text-muted-foreground">{domain}</p>
        </div>
        {imageSrc ? (
          <img
            alt=""
            className="h-28 w-full border-t border-border-soft object-cover md:h-auto md:w-40 md:border-l md:border-t-0"
            src={imageSrc}
          />
        ) : null}
      </div>
    </div>
  );
}
