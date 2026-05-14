"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Checkbox } from "@/components/primitives/checkbox";
import { Input } from "@/components/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { cn } from "@/lib/utils";
import { defaultRouteCopy } from "../../system/route-copy-defaults";
import type {
  AgentOwnershipProvider,
  AgentPostingPolicy,
  AgentPostingScope,
  CommunityAgentPolicyPageProps,
  CommunityAgentPolicySettings,
  GuestCommentPolicy,
} from "./community-agent-policy.types";
import { Type } from "@/components/primitives/type";







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
      <Type as="h2" variant="h2">{title}</Type>
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
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
      <div className="text-base font-medium leading-6">{label}</div>
      <Select onValueChange={(next) => onValueChange(next as T)} value={value}>
        <SelectTrigger className="h-12 w-full rounded-[var(--radius-lg)] md:w-48">
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


function ProviderRow({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 p-4">
      <span className="text-base font-medium leading-6">{label}</span>
      <Checkbox checked={checked} onCheckedChange={(next) => onCheckedChange(next === true)} />
    </label>
  );
}

function CapInput({
  label,
  value,
  onChange,
  nonePlaceholder,
  perDaySuffix,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  nonePlaceholder: string;
  perDaySuffix: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
      <div className="text-base font-medium leading-6">{label}</div>
      <div className="flex items-center gap-2">
        <Input
          className="h-12 w-20 rounded-[var(--radius-lg)] text-center"
          min={1}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            onChange(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
          }}
          placeholder={nonePlaceholder}
          type="number"
          value={value ?? ""}
        />
        <span className="text-muted-foreground">{perDaySuffix}</span>
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
  const copy = defaultRouteCopy;
  const mc = copy.moderation.agents;

  const policyOptions: Array<{ label: string; value: AgentPostingPolicy }> = [
    { label: mc.policyDisallow, value: "disallow" },
    { label: mc.policyAllow, value: "allow" },
  ];

  const scopeOptions: Array<{ label: string; value: AgentPostingScope }> = [
    { label: mc.scopeRepliesOnly, value: "replies_only" },
    { label: mc.scopeTopLevelAndReplies, value: "top_level_and_replies" },
  ];

  const guestCommentOptions: Array<{ label: string; value: GuestCommentPolicy }> = [
    { label: mc.guestCommentsDisallow, value: "disallow" },
    { label: mc.guestCommentsAltchaRequired, value: "altcha_required" },
  ];

  const providerOptions: Array<{ label: string; value: AgentOwnershipProvider }> = [
    { label: mc.providerClawKey, value: "clawkey" },
    { label: mc.providerSelfAgentId, value: "self_agent_id" },
  ];
  const isDisabled = settings.agentPostingPolicy === "disallow";

  function update(partial: Partial<CommunityAgentPolicySettings>) {
    onSettingsChange?.({ ...settings, ...partial });
  }

  function toggleProvider(provider: AgentOwnershipProvider, checked: boolean) {
    const nextProviders = checked
      ? [...new Set([...settings.acceptedAgentOwnershipProviders, provider])]
      : settings.acceptedAgentOwnershipProviders.filter((value) => value !== provider);
    update({ acceptedAgentOwnershipProviders: nextProviders });
  }

  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="min-w-0 space-y-2">
            <Type as="h1" variant="h1" className="md:text-4xl">{mc.title}</Type>
            <Type as="p" variant="caption">
              Control whether user-owned agents can post in this community.
            </Type>
          </div>
        </div>
        <Button
          className="community-moderation-inline-save-action w-full sm:w-auto"
          disabled={saveDisabled}
          loading={submitState.kind === "saving"}
          onClick={onSave}
        >
          Save
        </Button>
      </div>

      <Section title={mc.policySection}>
        <div className="space-y-3">
          <SelectRow
            label={mc.postingPolicyLabel}
            onValueChange={(value) => update({ agentPostingPolicy: value })}
            options={policyOptions}
            value={settings.agentPostingPolicy}
          />
          {!isDisabled ? (
            <SelectRow
              label={mc.postingScopeLabel}
              onValueChange={(value) => update({ agentPostingScope: value })}
              options={scopeOptions}
              value={settings.agentPostingScope}
            />
          ) : null}
          <SelectRow
            label={mc.guestCommentsLabel}
            onValueChange={(value) => update({ guestCommentPolicy: value })}
            options={guestCommentOptions}
            value={settings.guestCommentPolicy}
          />
        </div>
      </Section>

      {!isDisabled ? (
        <Section className="border-t border-border-soft pt-6 md:pt-8" title={mc.ownershipProvidersTitle}>
          <div className="space-y-3">
            {providerOptions.map((provider) => (
              <ProviderRow
                key={provider.value}
                checked={settings.acceptedAgentOwnershipProviders.includes(provider.value)}
                label={provider.label}
                onCheckedChange={(checked) => toggleProvider(provider.value, checked)}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {!isDisabled ? (
        <Section className="border-t border-border-soft pt-6 md:pt-8" title={mc.dailyCapsTitle}>
          <div className="space-y-3">
            <CapInput
              label={mc.agentPostsPerDayLabel}
              nonePlaceholder={mc.nonePlaceholder}
              onChange={(value) => update({ dailyPostCap: value })}
              perDaySuffix={mc.perDaySuffix}
              value={settings.dailyPostCap}
            />
            <CapInput
              label={mc.agentRepliesPerDayLabel}
              nonePlaceholder={mc.nonePlaceholder}
              onChange={(value) => update({ dailyReplyCap: value })}
              perDaySuffix={mc.perDaySuffix}
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
