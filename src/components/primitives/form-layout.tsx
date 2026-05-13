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
  labelClassName?: string;
  required?: boolean;
  tone?: "default" | "muted";
};

function FormFieldLabel({
  className,
  counter,
  htmlFor,
  label,
  labelClassName,
  required,
  tone = "muted",
}: FormFieldLabelProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <Label htmlFor={htmlFor} tone={tone}>
        <Type className={labelClassName} variant="label">
          {label}
          {required ? (
            <span aria-hidden="true" className="ms-0.5 text-destructive">*</span>
          ) : null}
        </Type>
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

type FormNoteProps = React.ComponentProps<"p"> & {
  tone?: "default" | "muted" | "destructive" | "warning";
};

const formNoteToneClassName: Record<NonNullable<FormNoteProps["tone"]>, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  destructive: "text-destructive",
  warning: "text-warning",
};

function FormNote({ className, ref, tone = "muted", ...props }: FormNoteProps) {
  return (
    <Type
      as="p"
      className={cn(formNoteToneClassName[tone], className)}
      ref={ref}
      variant="caption"
      {...props}
    />
  );
}

export { FormFieldLabel, FormNote, FormSectionHeading };
