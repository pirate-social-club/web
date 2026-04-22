"use client";

import * as React from "react";
import { Globe, Users } from "@phosphor-icons/react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/primitives/select";
import { cn } from "@/lib/utils";
import type { PostAudience } from "./post-composer.types";

export interface AudienceSelectProps {
  value: PostAudience;
  onChange: (value: PostAudience) => void;
  publicOptionEnabled?: boolean;
  publicOptionDisabledReason?: string;
  labels: {
    public: string;
    publicDescription: string;
    community: string;
    communityDescription: string;
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
      description: labels.publicDescription,
      icon: Globe,
      disabled: publicOptionEnabled === false,
    },
    {
      value: "members_only" as const,
      label: labels.community,
      description: labels.communityDescription,
      icon: Users,
      disabled: false,
    },
  ] as const;

  const selected = options.find((o) => o.value === value) ?? options[1];
  const SelectedIcon = selected.icon;

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as PostAudience)}
    >
      <SelectTrigger
        className={cn(
          "h-auto w-auto gap-2 rounded-full border-border-soft bg-card px-3 py-1.5 text-base font-medium shadow-none transition-colors hover:bg-muted",
        )}
      >
        <SelectedIcon className="size-5 text-muted-foreground" />
        <span>{selected.label}</span>
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="items-start py-3"
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="space-y-0.5">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-base text-muted-foreground">
                    {option.description}
                  </div>
                  {option.disabled && publicOptionDisabledReason ? (
                    <div className="text-base text-amber-700">
                      {publicOptionDisabledReason}
                    </div>
                  ) : null}
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
