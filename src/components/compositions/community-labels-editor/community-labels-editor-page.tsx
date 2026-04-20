"use client";

import * as React from "react";
import { Archive, Plus, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Checkbox } from "@/components/primitives/checkbox";
import { CommunityModerationSaveFooter } from "@/components/compositions/community-moderation-shell/community-moderation-save-footer";
import { FormFieldLabel, FormSectionHeading } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { cn } from "@/lib/utils";

export interface LabelEditorDefinition {
  id: string;
  label: string;
  color: string;
  status: "active" | "archived";
}

export interface CommunityLabelsEditorPageProps {
  className?: string;
  labelsEnabled: boolean;
  labels: LabelEditorDefinition[];
  requireOnTopLevelPosts: boolean;
  onLabelsChange?: (labels: LabelEditorDefinition[]) => void;
  onLabelsEnabledChange?: (value: boolean) => void;
  onRequireOnTopLevelPostsChange?: (value: boolean) => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLoading?: boolean;
}

function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeHexInput(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("#")) return trimmed.slice(0, 7);
  return `#${trimmed.slice(0, 6)}`;
}

function LabelChipPreview({ color, label }: { color: string; label: string }) {
  const valid = isValidHexColor(color);
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-base transition-colors"
      style={
        valid
          ? { backgroundColor: `${color}15`, color }
          : { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }
      }
    >
      {label || "Preview"}
    </span>
  );
}

export function createEmptyLabelDefinition(): LabelEditorDefinition {
  return {
    id: `draft-${Math.random().toString(36).slice(2, 10)}`,
    label: "",
    color: "#f97316",
    status: "active",
  };
}

export function CommunityLabelsEditorPage({
  className,
  labelsEnabled,
  labels,
  requireOnTopLevelPosts,
  onLabelsChange,
  onLabelsEnabledChange,
  onRequireOnTopLevelPostsChange,
  onSave,
  saveDisabled = false,
  saveLoading = false,
}: CommunityLabelsEditorPageProps) {
  const activeLabels = labels.filter((l) => l.status === "active");
  const archivedLabels = labels.filter((l) => l.status === "archived");
  const duplicateActiveLabelNames = React.useMemo(() => {
    const counts = new Map<string, number>();

    for (const label of activeLabels) {
      const normalized = label.label.trim().toLowerCase();
      if (!normalized) {
        continue;
      }
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }

    return new Set(
      [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([name]) => name),
    );
  }, [activeLabels]);

  const updateLabel = React.useCallback(
    (id: string, patch: Partial<LabelEditorDefinition>) => {
      onLabelsChange?.(labels.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    },
    [labels, onLabelsChange],
  );

  const removeLabel = React.useCallback(
    (id: string) => {
      onLabelsChange?.(labels.filter((l) => l.id !== id));
    },
    [labels, onLabelsChange],
  );

  const archiveLabel = React.useCallback(
    (id: string) => {
      updateLabel(id, { status: "archived" });
    },
    [updateLabel],
  );

  const restoreLabel = React.useCallback(
    (id: string) => {
      updateLabel(id, { status: "active" });
    },
    [updateLabel],
  );

  const addLabel = React.useCallback(() => {
    onLabelsChange?.([...labels, createEmptyLabelDefinition()]);
  }, [labels, onLabelsChange]);

  return (
    <section className={cn("mx-auto flex w-full max-w-[64rem] flex-col gap-6 md:gap-8", className)}>
      <div className="space-y-2">
        <h1 className="text-[1.875rem] font-semibold tracking-tight md:text-[2.25rem]">Labels</h1>
      </div>

      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-border-soft bg-card p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <FormSectionHeading title="Enable labels" />
              <Checkbox
                checked={labelsEnabled}
                onCheckedChange={(checked) => onLabelsEnabledChange?.(checked === true)}
              />
            </div>
            {labelsEnabled ? (
              <div className="space-y-3 border-t border-border-soft pt-4">
                <div className="flex items-center justify-between gap-3">
                  <FormSectionHeading title="Require on top-level posts" />
                  <Checkbox
                    checked={requireOnTopLevelPosts}
                    onCheckedChange={(checked) => onRequireOnTopLevelPostsChange?.(checked === true)}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {labelsEnabled ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <FormSectionHeading
                description={activeLabels.length > 0 ? `${activeLabels.length} label${activeLabels.length === 1 ? "" : "s"}` : undefined}
                title="Definitions"
              />
              <Button onClick={addLabel} variant="secondary">
                <Plus className="size-5" />
                Add label
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {activeLabels.map((def) => {
                const hasBlankName = def.label.trim().length === 0;
                const hasDuplicateName = duplicateActiveLabelNames.has(def.label.trim().toLowerCase());
                const hasInvalidColor = !isValidHexColor(def.color);

                return (
                  <div className="rounded-[1.75rem] border border-border-soft bg-card p-4 md:p-5" key={def.id}>
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_9rem_auto] md:items-end">
                      <div className="space-y-2">
                        <FormFieldLabel label="Name" />
                        <Input
                          aria-invalid={hasBlankName || hasDuplicateName}
                          className={cn(
                            "h-12 px-4 py-2",
                            (hasBlankName || hasDuplicateName) && "border-destructive focus-visible:ring-destructive/40",
                          )}
                          onChange={(event) => updateLabel(def.id, { label: event.target.value })}
                          placeholder="Label name"
                          value={def.label}
                        />
                      </div>

                      <div className="space-y-2">
                        <FormFieldLabel label="Color" />
                        <div className="flex items-center gap-2">
                          <Input
                            aria-invalid={hasInvalidColor}
                            className={cn(
                              "h-12 px-4 py-2 font-mono",
                              hasInvalidColor && "border-destructive focus-visible:ring-destructive/40",
                            )}
                            onChange={(event) => updateLabel(def.id, { color: normalizeHexInput(event.target.value) })}
                            placeholder="#f97316"
                            value={def.color}
                          />
                          {isValidHexColor(def.color) ? (
                            <div
                              className="size-12 shrink-0 rounded-full border border-border-soft"
                              style={{ backgroundColor: def.color }}
                            />
                          ) : (
                            <div className="size-12 shrink-0 rounded-full border border-border-soft bg-muted" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <Button
                          aria-label={`Archive ${def.label.trim() || "label"}`}
                          className="size-12"
                          onClick={() => archiveLabel(def.id)}
                          size="icon"
                          title={`Archive ${def.label.trim() || "label"}`}
                          variant="secondary"
                        >
                          <Archive className="size-5" />
                        </Button>
                        <Button
                          aria-label={`Delete ${def.label.trim() || "label"}`}
                          className="size-12"
                          onClick={() => removeLabel(def.id)}
                          size="icon"
                          title={`Delete ${def.label.trim() || "label"}`}
                          variant="secondary"
                        >
                          <Trash className="size-5" />
                        </Button>
                      </div>
                    </div>

                    {def.label || def.color ? (
                      <div className="mt-3 border-t border-border-soft pt-3">
                        <LabelChipPreview color={def.color} label={def.label} />
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {activeLabels.length === 0 ? (
                <div className="rounded-[1.75rem] border border-dashed border-border-soft bg-card px-5 py-8 text-base text-muted-foreground">
                  No labels defined.
                </div>
              ) : null}
            </div>

            {archivedLabels.length > 0 ? (
              <div className="space-y-3">
                <FormSectionHeading
                  description={`${archivedLabels.length} archived`}
                  title="Archived"
                />
                <div className="flex flex-col gap-2">
                  {archivedLabels.map((def) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-border-soft bg-card px-4 py-3 opacity-60"
                      key={def.id}
                    >
                      <div className="flex items-center gap-3">
                        <LabelChipPreview color={def.color} label={def.label} />
                      </div>
                      <Button
                        aria-label={`Restore ${def.label.trim() || "label"}`}
                        className="size-10"
                        onClick={() => restoreLabel(def.id)}
                        size="icon"
                        title={`Restore ${def.label.trim() || "label"}`}
                        variant="secondary"
                      >
                        <Archive className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <CommunityModerationSaveFooter
        disabled={saveDisabled}
        loading={saveLoading}
        onSave={onSave}
      />
    </section>
  );
}
