"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

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
      <Label className="text-base font-medium leading-tight" htmlFor={htmlFor} tone={tone}>
        {label}
      </Label>
      {counter ? <span className="text-base text-muted-foreground">{counter}</span> : null}
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
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="text-base leading-6 text-muted-foreground">{description}</p>
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
  warning: "text-amber-700",
};

const FormNote = React.forwardRef<HTMLParagraphElement, FormNoteProps>(
  ({ className, tone = "muted", ...props }, ref) => (
    <p
      className={cn(
        "text-base leading-6",
        formNoteToneClassName[tone],
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
FormNote.displayName = "FormNote";

export { FormFieldLabel, FormNote, FormSectionHeading };
