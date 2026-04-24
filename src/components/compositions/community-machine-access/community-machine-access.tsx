"use client";

import * as React from "react";

import { CommunityModerationSaveFooter } from "@/components/compositions/community-moderation-shell/community-moderation-save-footer";
import { Checkbox } from "@/components/primitives/checkbox";
import { FormNote } from "@/components/primitives/form-layout";
import { Label } from "@/components/primitives/label";
import { cn } from "@/lib/utils";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";
import type {
  CommunityMachineAccessPageProps,
  CommunityMachineAccessSettings,
  MachineAccessSurface,
} from "./community-machine-access.types";
import { Type } from "@/components/primitives/type";

function SurfaceRow({
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
    <div className="flex min-h-14 items-center gap-3 rounded-md border border-border-soft bg-muted/20 px-4 py-3.5">
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

function StaticRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 rounded-md border border-border-soft bg-muted/20 px-4 py-3.5">
      <div className="text-base leading-6">{label}</div>
      <div className="text-base font-medium leading-6">{value}</div>
    </div>
  );
}

const surfaceRows: Array<{
  key: MachineAccessSurface;
  copyKey:
    | "communityIdentityLabel"
    | "communityStatsLabel"
    | "threadCardsLabel"
    | "threadBodiesLabel"
    | "topCommentsLabel"
    | "eventsLabel";
  locked?: boolean;
}> = [
  { key: "communityIdentity", copyKey: "communityIdentityLabel", locked: true },
  { key: "communityStats", copyKey: "communityStatsLabel" },
  { key: "threadCards", copyKey: "threadCardsLabel" },
  { key: "threadBodies", copyKey: "threadBodiesLabel" },
  { key: "topComments", copyKey: "topCommentsLabel" },
  { key: "events", copyKey: "eventsLabel" },
];

export function CommunityMachineAccessPage({
  settings,
  submitState,
  className,
  onSettingsChange,
  onSave,
  saveDisabled = false,
}: CommunityMachineAccessPageProps) {
  const { copy } = useRouteMessages();
  const mc = copy.moderation.machineAccess;

  function updateSurface(surface: MachineAccessSurface, included: boolean) {
    if (surface === "communityIdentity") {
      return;
    }
    onSettingsChange?.({
      ...settings,
      includedSurfaces: {
        ...settings.includedSurfaces,
        [surface]: included,
        communityIdentity: true,
      },
    });
  }

  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      <div className="space-y-2">
        <Type as="h1" variant="h1" className="md:text-4xl">{mc.title}</Type>
        <FormNote>{mc.defaultNotice}</FormNote>
      </div>

      {settings.policyOrigin === "default" ? (
        <FormNote>{mc.policyOriginDefault}</FormNote>
      ) : null}

      <section className="space-y-4">
        <Type as="h2" variant="h2" className="">{mc.surfacesTitle}</Type>
        <div className="space-y-3">
          {surfaceRows.map((row) => (
            <SurfaceRow
              checked={settings.includedSurfaces[row.key]}
              disabled={row.locked}
              id={`machine-access-${row.key}`}
              key={row.key}
              label={mc[row.copyKey]}
              onCheckedChange={(checked) => updateSurface(row.key, checked)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t border-border-soft pt-6 md:pt-8">
        <Type as="h2" variant="h2" className="">{mc.limitsTitle}</Type>
        <div className="space-y-3">
          <StaticRow label={mc.anonymousRateLabel} value={mc.lowRateTier} />
          <StaticRow label={mc.authenticatedRateLabel} value={mc.standardRateTier} />
          <StaticRow label={mc.topCommentsLimitLabel} value={String(settings.topCommentsLimit)} />
        </div>
      </section>

      <section className="space-y-4 border-t border-border-soft pt-6 md:pt-8">
        <Type as="h2" variant="h2" className="">{mc.allowedUsesTitle}</Type>
        <div className="space-y-3">
          <StaticRow label={mc.summarizationLabel} value={mc.allowedLabel} />
          <StaticRow label={mc.analyticsLabel} value={mc.allowedLabel} />
          <StaticRow label={mc.aiTrainingLabel} value={mc.prohibitedLabel} />
        </div>
      </section>

      <FormNote>{mc.memberOnlyNotice}</FormNote>
      <FormNote>{mc.killSwitchNotice}</FormNote>

      {submitState.kind === "error" ? (
        <p className="text-base text-destructive">{submitState.message}</p>
      ) : null}

      <CommunityModerationSaveFooter
        disabled={saveDisabled}
        loading={submitState.kind === "saving"}
        onSave={onSave}
      />
    </section>
  );
}
