"use client";

import * as React from "react";
import { Plus, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Checkbox } from "@/components/primitives/checkbox";
import { IconButton } from "@/components/primitives/icon-button";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { cn } from "@/lib/utils";

import type {
  CommunitySettingsFlairDefinition,
  CommunitySettingsFlairPolicy,
  CommunitySettingsPostingProps,
} from "./community-settings.types";

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FlairRow({
  definition,
  readOnly,
  onArchive,
  onColorChange,
  onLabelChange,
}: {
  definition: CommunitySettingsFlairDefinition;
  readOnly?: boolean;
  onLabelChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onArchive: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3">
      <input
        className="size-10 shrink-0 cursor-pointer rounded-lg border border-border-soft bg-transparent p-0.5"
        disabled={readOnly}
        type="color"
        value={definition.colorToken ?? "#6377f0"}
        onChange={(e) => onColorChange(e.target.value)}
      />
      <Input
        className="h-10 flex-1 rounded-[var(--radius-lg)]"
        disabled={readOnly}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder="Tag label"
        value={definition.label}
      />
      {!readOnly ? (
        <IconButton size="sm" variant="ghost" onClick={onArchive}>
          <Trash className="size-4" />
        </IconButton>
      ) : null}
    </div>
  );
}

export function CommunitySettingsPosting({
  className,
  flairPolicy,
  onFlairPolicyChange,
  readOnly,
}: CommunitySettingsPostingProps) {
  const flairEnabled = flairPolicy?.flairEnabled ?? false;
  const definitions = flairPolicy?.definitions ?? [];

  const activeDefinitions = definitions
    .filter((d) => d.status === "active")
    .sort((a, b) => a.position - b.position);

  const toggleFlair = React.useCallback(
    (checked: boolean) => {
      onFlairPolicyChange({
        flairEnabled: checked,
        definitions: definitions.length > 0 ? definitions : [],
      });
    },
    [definitions, onFlairPolicyChange],
  );

  const addFlair = React.useCallback(() => {
    const maxPosition = activeDefinitions.reduce(
      (max, d) => Math.max(max, d.position),
      -1,
    );
    const newDef: CommunitySettingsFlairDefinition = {
      flairId: crypto.randomUUID(),
      label: "",
      colorToken: "#6377f0",
      status: "active",
      position: maxPosition + 1,
    };
    onFlairPolicyChange({
      flairEnabled: true,
      definitions: [...definitions, newDef],
    });
  }, [definitions, activeDefinitions, onFlairPolicyChange]);

  const updateFlair = React.useCallback(
    (flairId: string, partial: Partial<CommunitySettingsFlairDefinition>) => {
      if (!flairPolicy) return;
      onFlairPolicyChange({
        ...flairPolicy,
        definitions: definitions.map((d) =>
          d.flairId === flairId ? { ...d, ...partial } : d,
        ),
      });
    },
    [flairPolicy, definitions, onFlairPolicyChange],
  );

  const archiveFlair = React.useCallback(
    (flairId: string) => {
      if (!flairPolicy) return;
      onFlairPolicyChange({
        ...flairPolicy,
        definitions: definitions.map((d) =>
          d.flairId === flairId
            ? { ...d, status: "archived" as const }
            : d,
        ),
      });
    },
    [flairPolicy, definitions, onFlairPolicyChange],
  );

  return (
    <div className={cn("space-y-6", className)}>
      <Section title="Tags">
        <div className="flex min-h-14 items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3.5">
          <Checkbox
            checked={flairEnabled}
            disabled={readOnly}
            id="settings-flair-enabled"
            onCheckedChange={(next) => toggleFlair(next === true)}
          />
          <Label className="flex-1 text-base leading-6" htmlFor="settings-flair-enabled">
            Require tags on posts
          </Label>
        </div>

        {flairEnabled ? (
          <div className="space-y-3 border-l border-border-soft pl-4">
            {activeDefinitions.length === 0 ? (
              <p className="text-base text-muted-foreground">
                No tags defined yet.
              </p>
            ) : (
              activeDefinitions.map((def) => (
                <FlairRow
                  key={def.flairId}
                  definition={def}
                  readOnly={readOnly}
                  onArchive={() => archiveFlair(def.flairId)}
                  onColorChange={(v) =>
                    updateFlair(def.flairId, { colorToken: v })
                  }
                  onLabelChange={(v) =>
                    updateFlair(def.flairId, { label: v })
                  }
                />
              ))
            )}
            {!readOnly ? (
              <Button onClick={addFlair} size="sm" variant="secondary">
                <Plus className="size-4" weight="bold" />
                Add tag
              </Button>
            ) : null}
          </div>
        ) : null}
      </Section>
    </div>
  );
}
