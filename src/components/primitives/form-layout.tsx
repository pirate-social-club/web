"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Type, typeVariants } from "./type";

import { Label } from "./label";

type FormFieldLabelProps = {
  className?: string;
  counter?: React.ReactNode;
  htmlFor?: string;
  label: React.ReactNode;
  tone?: "default" | "muted";
};

function FormFieldLabel({
  className,
  counter,
  htmlFor,
  label,
  tone = "muted",
}: FormFieldLabelProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <Label htmlFor={htmlFor} tone={tone}>
        <Type variant="label">{label}</Type>
      </Label>
      {counter ? <Type variant="caption">{counter}</Type> : null}
    </div>
  );
}

type FormSectionHeadingProps = {
  className?: string;
  description?: React.ReactNode;
  title: React.ReactNode;
};

function FormSectionHeading({
  className,
  description,
  title,
}: FormSectionHeadingProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <Type as="h3" variant="body-strong">{title}</Type>
      {description ? (
        <Type as="p" variant="caption">{description}</Type>
      ) : null}
    </div>
  );
}

type FormNoteProps = React.HTMLAttributes<HTMLParagraphElement> & {
  tone?: "default" | "muted" | "destructive" | "warning";
};

const formNoteToneClassName: Record<NonNullable<FormNoteProps["tone"]>, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  destructive: "text-destructive",
  warning: "text-warning",
};

const FormNote = React.forwardRef<HTMLParagraphElement, FormNoteProps>(
  ({ className, tone = "muted", ...props }, ref) => (
    <Type
      as="p"
      className={cn(formNoteToneClassName[tone], className)}
      ref={ref}
      variant="caption"
      {...props}
    />
  ),
);
FormNote.displayName = "FormNote";

export { FormFieldLabel, FormNote, FormSectionHeading };
