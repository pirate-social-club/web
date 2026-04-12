"use client";

import * as React from "react";

import { Checkbox } from "@/components/primitives/checkbox";
import { FormFieldLabel } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { OptionCard } from "@/components/primitives/option-card";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";

import type {
  AnonymousIdentityScope,
  CommunityMembershipMode,
  CommunitySettingsAboutProps,
} from "./community-settings.types";

const membershipMeta: Record<
  CommunityMembershipMode,
  { label: string; detail: string }
> = {
  open: {
    label: "Open",
    detail: "Anyone can join immediately.",
  },
  gated: {
    label: "Gated",
    detail: "Joining requires passing gate checks.",
  },
};

const anonymousScopeMeta: Record<
  AnonymousIdentityScope,
  { label: string; detail: string }
> = {
  community_stable: {
    label: "Community-stable",
    detail: "One persistent anonymous label per user across the community.",
  },
  thread_stable: {
    label: "Thread-stable",
    detail: "One persistent anonymous label per user per thread.",
  },
};

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="text-base leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({
  label,
  htmlFor,
}: {
  label: string;
  htmlFor?: string;
}) {
  return (
    <FormFieldLabel className="mb-1.5" htmlFor={htmlFor} label={label} />
  );
}

function CheckboxRow({
  checked,
  disabled,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  disabled?: boolean;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3.5">
      <Checkbox
        checked={checked}
        disabled={disabled}
        id={id}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
      <Label className="flex-1 text-base leading-6" htmlFor={id}>
        {label}
      </Label>
    </div>
  );
}

export function CommunitySettingsAbout({
  className,
  displayName,
  displayNameReadOnly,
  description,
  membershipMode,
  defaultAgeGatePolicy,
  allowAnonymousIdentity,
  anonymousIdentityScope,
  onDisplayNameChange,
  onDescriptionChange,
  onMembershipModeChange,
  onDefaultAgeGatePolicyChange,
  onAllowAnonymousIdentityChange,
  onAnonymousIdentityScopeChange,
  readOnly,
}: CommunitySettingsAboutProps) {
  return (
    <div className={cn("space-y-8", className)}>
      <Section title="General">
        <div className="grid gap-4">
          <div>
            <FieldLabel htmlFor="settings-display-name" label="Display name" />
            <Input
              className="h-12 rounded-[var(--radius-lg)]"
              disabled={readOnly || displayNameReadOnly}
              id="settings-display-name"
              onChange={(e) => onDisplayNameChange(e.target.value)}
              value={displayName}
            />
          </div>

          <div>
            <FieldLabel htmlFor="settings-description" label="Description" />
            <Textarea
              disabled={readOnly}
              id="settings-description"
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="What is this community for?"
              value={description}
            />
          </div>
        </div>
      </Section>

      <Section title="Membership">
        <div className="space-y-2">
          {(Object.keys(membershipMeta) as CommunityMembershipMode[]).map(
            (mode) => (
              <OptionCard
                description={membershipMeta[mode].detail}
                key={mode}
                selected={mode === membershipMode}
                title={membershipMeta[mode].label}
                onClick={() => !readOnly && onMembershipModeChange(mode)}
              />
            ),
          )}
        </div>
      </Section>

      <Section className="border-t border-border-soft pt-8" title="Access">
        <div className="space-y-5">
          <CheckboxRow
            checked={defaultAgeGatePolicy === "18_plus"}
            disabled={readOnly}
            id="settings-18-plus"
            label="18+ community"
            onCheckedChange={(checked) =>
              onDefaultAgeGatePolicyChange(checked ? "18_plus" : "none")
            }
          />

          <CheckboxRow
            checked={allowAnonymousIdentity}
            disabled={readOnly}
            id="settings-anonymous"
            label="Allow anonymous posting"
            onCheckedChange={onAllowAnonymousIdentityChange}
          />

          {allowAnonymousIdentity ? (
            <div className="space-y-3 border-l border-border-soft pl-4">
              <p className="text-base font-medium text-foreground">
                Anonymous scope
              </p>
              <div className="space-y-2">
                {(
                  Object.keys(anonymousScopeMeta) as AnonymousIdentityScope[]
                ).map((scope) => (
                  <OptionCard
                    description={anonymousScopeMeta[scope].detail}
                    key={scope}
                    selected={scope === anonymousIdentityScope}
                    title={anonymousScopeMeta[scope].label}
                    onClick={() =>
                      !readOnly && onAnonymousIdentityScopeChange(scope)
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Section>
    </div>
  );
}
