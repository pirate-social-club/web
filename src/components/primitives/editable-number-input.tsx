"use client";

import * as React from "react";

import { Input } from "@/components/primitives/input";

type EditableNumberInputProps = Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> & {
  onValueChange: (value: number) => void;
  value: number;
};

export function EditableNumberInput({ onBlur, onValueChange, value, ...props }: EditableNumberInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [draftValue, setDraftValue] = React.useState(String(value));

  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraftValue(String(value));
  }, [value]);

  return (
    <Input
      {...props}
      ref={inputRef}
      onBlur={(event) => {
        setDraftValue(String(value));
        onBlur?.(event);
      }}
      onChange={(event) => {
        setDraftValue(event.target.value);
        const parsed = Number.parseInt(event.target.value, 10);
        if (!Number.isNaN(parsed)) onValueChange(parsed);
      }}
      type="number"
      value={draftValue}
    />
  );
}
