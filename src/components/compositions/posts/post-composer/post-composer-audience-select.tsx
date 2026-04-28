"use client";

import * as React from "react";
import { Globe, Users } from "@phosphor-icons/react";

import { ResponsiveOptionSelect } from "@/components/compositions/system/responsive-option-select/responsive-option-select";
import type { PostAudience } from "./post-composer.types";

export interface AudienceSelectProps {
  value: PostAudience;
  onChange: (value: PostAudience) => void;
  publicOptionEnabled?: boolean;
  publicOptionDisabledReason?: string;
  labels: {
    public: string;
    community: string;
    title: string;
  };
}

export function AudienceSelect({
  value,
  onChange,
  publicOptionEnabled = true,
  publicOptionDisabledReason,
  labels,
}: AudienceSelectProps) {
  const options = [
    {
      value: "public" as const,
      label: labels.public,
      icon: <Globe className="size-5 text-muted-foreground" />,
      disabled: publicOptionEnabled === false,
      disabledReason: publicOptionDisabledReason,
    },
    {
      value: "members_only" as const,
      label: labels.community,
      icon: <Users className="size-5 text-muted-foreground" />,
      disabled: false,
    },
  ] as const;

  const selected = options.find((o) => o.value === value) ?? options[1];

  return (
    <ResponsiveOptionSelect<PostAudience>
      ariaLabel={labels.title}
      drawerTitle={labels.title}
      onValueChange={onChange}
      options={options}
      selectAlign="start"
      size="lg"
      triggerContent={(
        <span className="flex min-w-0 items-center gap-2">
          {selected.icon}
          <span className="truncate">{selected.label}</span>
        </span>
      )}
      value={value}
    />
  );
}
