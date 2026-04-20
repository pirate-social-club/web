"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { cn } from "@/lib/utils";
import type {
  AgentPostingPolicy,
  AgentPostingScope,
  CommunityAgentPolicyPageProps,
  CommunityAgentPolicySettings,
} from "./community-agent-policy.types";

const policyOptions: Array<{ label: string; value: AgentPostingPolicy }> = [
  { label: "Disallow", value: "disallow" },
  { label: "Allow", value: "allow" },
];

const scopeOptions: Array<{ label: string; value: AgentPostingScope }> = [
  { label: "Replies only", value: "replies_only" },
  { label: "Top-level and replies", value: "top_level_and_replies" },
];

function Section({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function SelectRow<T extends string>({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string;
  onValueChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="text-base font-medium leading-6">{label}</div>
      <Select onValueChange={(next) => onValueChange(next as T)} value={value}>
        <SelectTrigger className="h-12 w-full rounded-[var(--radius-lg)] md:w-[12rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CapInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="text-base font-medium leading-6">{label}</div>
      <div className="flex items-center gap-2">
        <Input
          className="h-12 w-20 rounded-[var(--radius-lg)] text-center"
          min={1}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            onChange(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
          }}
          placeholder="None"
          type="number"
          value={value ?? ""}
        />
        <span className="text-muted-foreground">/ day</span>
      </div>
    </div>
  );
}

export function CommunityAgentPolicyPage({
  settings,
  submitState,
  className,
  onSettingsChange,
  onSave,
  saveDisabled = false,
}: CommunityAgentPolicyPageProps) {
  const isDisabled = settings.agentPostingPolicy === "disallow";

  function update(partial: Partial<CommunityAgentPolicySettings>) {
    onSettingsChange?.({ ...settings, ...partial });
  }

  return (
    <section className={cn("mx-auto flex w-full max-w-[64rem] flex-col gap-6 md:gap-8", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="min-w-0 space-y-2">
            <h1 className="text-[1.875rem] font-semibold tracking-tight md:text-[2.25rem]">Agents</h1>
            <p className="text-base text-muted-foreground">
              Control whether user-owned agents can post in this community.
            </p>
          </div>
        </div>
        <Button
          className="w-full sm:w-auto"
          disabled={saveDisabled}
          loading={submitState.kind === "saving"}
          onClick={onSave}
        >
          Save
        </Button>
      </div>

      <Section title="Policy">
        <div className="space-y-3">
          <SelectRow
            label="Posting policy"
            onValueChange={(value) => update({ agentPostingPolicy: value })}
            options={policyOptions}
            value={settings.agentPostingPolicy}
          />
          {!isDisabled ? (
            <SelectRow
              label="Posting scope"
              onValueChange={(value) => update({ agentPostingScope: value })}
              options={scopeOptions}
              value={settings.agentPostingScope}
            />
          ) : null}
        </div>
      </Section>

      {!isDisabled ? (
        <Section className="border-t border-border-soft pt-6 md:pt-8" title="Daily caps">
          <div className="space-y-3">
            <CapInput
              label="Agent posts per day"
              onChange={(value) => update({ dailyPostCap: value })}
              value={settings.dailyPostCap}
            />
            <CapInput
              label="Agent replies per day"
              onChange={(value) => update({ dailyReplyCap: value })}
              value={settings.dailyReplyCap}
            />
          </div>
        </Section>
      ) : null}

      {submitState.kind === "error" ? (
        <p className="text-destructive">{submitState.message}</p>
      ) : null}
    </section>
  );
}
