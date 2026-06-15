"use client";

import * as React from "react";

import { ResponsiveOptionSelect } from "@/components/compositions/system/responsive-option-select/responsive-option-select";
import { FormFieldLabel } from "@/components/primitives/form-layout";
import { cn } from "@/lib/utils";
import type { PostThreadIdentityMode, PostThreadReplyIdentity } from "./post-thread.types";

interface ReplyIdentitySelectProps {
  className?: string;
  identity?: PostThreadReplyIdentity;
  label?: string;
  onChange: (mode: PostThreadIdentityMode) => void;
  value: PostThreadIdentityMode;
}

export function ReplyIdentitySelect({
  className,
  identity,
  label = "Reply as",
  onChange,
  value,
}: ReplyIdentitySelectProps) {
  const options = React.useMemo(() => [
    { value: "public" as const, label: identity?.publicLabel ?? "Public" },
    ...(identity?.allowAnonymousIdentity === true
      ? [{ value: "anonymous" as const, label: identity.anonymousLabel ?? "Anonymous" }]
      : []),
  ], [identity?.allowAnonymousIdentity, identity?.anonymousLabel, identity?.publicLabel]);
  const selected = options.find((option) => option.value === value) ?? options[0];

  React.useEffect(() => {
    if (selected.value !== value) {
      onChange(selected.value);
    }
  }, [onChange, selected.value, value]);

  if (!identity?.allowAnonymousIdentity) {
    return null;
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <FormFieldLabel className="shrink-0" label={label} />
      <ResponsiveOptionSelect<PostThreadIdentityMode>
        ariaLabel={label}
        drawerTitle={label}
        onValueChange={onChange}
        options={options}
        selectAlign="start"
        triggerClassName="h-auto min-w-0 py-1.5"
        triggerContent={<span className="truncate">{selected.label}</span>}
        value={selected.value}
      />
    </div>
  );
}
