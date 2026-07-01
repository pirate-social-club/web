"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Checkbox } from "@/components/primitives/checkbox";
import { FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Type } from "@/components/primitives/type";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import type {
  AvailabilityException,
  AvailabilityRule,
  PriceRule,
} from "@/lib/api/bookings-types";

import { SettingsSection } from "@/components/compositions/settings/settings-page/panels/settings-page-panel-primitives";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const BOOKING_DURATION_SECONDS = [900, 1800, 2700, 3600] as const;

// Display-only formatter; persistence/validation lives in the container (mirrors
// booking-host-settings-validation). Kept tiny + inline so this composition stays app-layer-free.
function formatUsd(cents: number): string {
  return (Math.max(0, Math.round(cents)) / 100).toFixed(2);
}

function formatLocalStamp(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface ProfileBookingsValues {
  timezone: string;
  durationSeconds: number;
  priceUsd: string;
}

export interface AvailabilityRuleInput {
  byWeekday: number[];
  startLocal: string;
  endLocal: string;
}

export interface PriceRuleInput {
  matchWeekday: number[];
  startLocal: string;
  endLocal: string;
  priceUsd: string;
}

export interface AvailabilityExceptionInput {
  kind: "block" | "open";
  startLocal: string;
  endLocal: string;
}

export interface ProfileBookingsSectionProps {
  values: ProfileBookingsValues;
  onValuesChange: (patch: Partial<ProfileBookingsValues>) => void;

  rules: AvailabilityRule[];
  priceRules: PriceRule[];
  exceptions: AvailabilityException[];

  isPublished: boolean;
  saving?: boolean;
  publishing?: boolean;
  /** Disable the price-rule/availability adders + save while persistence is in flight. */
  busy?: boolean;
  /** Whether the user's app wallet is available to receive payouts (gates publish). */
  payoutReady: boolean;

  timezoneOptions: string[];

  /** Inline error for the base-price field (container-validated). */
  basePriceError?: string | null;

  onSaveProfile?: () => void;
  onTogglePublish?: () => void;

  onAddRule?: (draft: AvailabilityRuleInput) => void;
  onDeleteRule?: (ruleId: string) => void;
  onAddPriceRule?: (draft: PriceRuleInput) => void;
  onDeletePriceRule?: (priceRuleId: string) => void;
  onAddException?: (draft: AvailabilityExceptionInput) => void;
  onDeleteException?: (exceptionId: string) => void;

  className?: string;
}

function WeekdayPicker({
  selected,
  onToggle,
}: {
  selected: number[];
  onToggle: (index: number, checked: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {WEEKDAYS.map((label, index) => (
        <label key={label} className="flex items-center gap-1">
          <Checkbox
            checked={selected.includes(index)}
            onCheckedChange={(checked) => onToggle(index, checked === true)}
          />
          <Type variant="caption">{label}</Type>
        </label>
      ))}
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  return (
    <Card className={cn("space-y-5 border-border bg-card p-5 shadow-none", isMobile && "border-0 bg-transparent p-0")}>
      {children}
    </Card>
  );
}

function ListRow({ children, onRemove, removeLabel }: { children: React.ReactNode; onRemove?: () => void; removeLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <Type variant="body" className="min-w-0 break-words">{children}</Type>
      {onRemove ? (
        <Button variant="ghost" size="sm" onClick={onRemove} type="button" className="shrink-0">{removeLabel}</Button>
      ) : null}
    </div>
  );
}

export function ProfileBookingsSection({
  values,
  onValuesChange,
  rules,
  priceRules,
  exceptions,
  isPublished,
  saving,
  publishing,
  busy,
  payoutReady,
  timezoneOptions,
  basePriceError,
  onSaveProfile,
  onTogglePublish,
  onAddRule,
  onDeleteRule,
  onAddPriceRule,
  onDeletePriceRule,
  onAddException,
  onDeleteException,
  className,
}: ProfileBookingsSectionProps) {
  const isMobile = useIsMobile();
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").settings.booking;
  const removeLabel = copy.remove;

  // Ephemeral add-form state belongs to the composition (UI scratch, not persisted).
  const [ruleWeekdays, setRuleWeekdays] = React.useState<number[]>([1, 2, 3, 4, 5]);
  const [ruleStart, setRuleStart] = React.useState("09:00");
  const [ruleEnd, setRuleEnd] = React.useState("17:00");

  const [priceWeekdays, setPriceWeekdays] = React.useState<number[]>([1, 2, 3, 4, 5]);
  const [priceStart, setPriceStart] = React.useState("09:00");
  const [priceEnd, setPriceEnd] = React.useState("12:00");
  const [priceRuleUsd, setPriceRuleUsd] = React.useState("75.00");

  const [exceptionKind, setExceptionKind] = React.useState<"block" | "open">("block");
  const [exceptionStart, setExceptionStart] = React.useState("");
  const [exceptionEnd, setExceptionEnd] = React.useState("");

  // Match the Input primitive (rounded-full pill, border-input) so selects and text fields align.
  const selectClass = "flex h-10 w-full min-w-0 items-center rounded-full border border-input bg-background px-4 text-base shadow-sm outline-none focus-visible:border-border focus-visible:ring-1 focus-visible:ring-border-soft";

  return (
    <div className={cn("space-y-8", className)}>
      <SettingsSection title={copy.sectionTitle}>
        <Type as="p" variant="caption" className="text-muted-foreground">{copy.intro}</Type>

        {/* Session + base price */}
        <SectionCard>
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground" htmlFor="booking-timezone">{copy.timezoneLabel}</label>
            <select
              id="booking-timezone"
              className={selectClass}
              value={values.timezone}
              onChange={(e) => onValuesChange({ timezone: e.target.value })}
            >
              {timezoneOptions.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground" htmlFor="booking-duration">{copy.durationLabel}</label>
            <select
              id="booking-duration"
              className={selectClass}
              value={String(values.durationSeconds)}
              onChange={(e) => onValuesChange({ durationSeconds: Number(e.target.value) })}
            >
              {BOOKING_DURATION_SECONDS.map((sec) => (
                <option key={sec} value={sec}>{copy.durationMinutes.replace("{count}", String(sec / 60))}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground" htmlFor="booking-price">{copy.basePriceLabel}</label>
            <Input
              id="booking-price"
              type="number"
              step="0.01"
              min="0"
              value={values.priceUsd}
              onChange={(e) => onValuesChange({ priceUsd: e.target.value })}
              placeholder="0.00"
            />
            {basePriceError ? <FormNote tone="destructive">{basePriceError}</FormNote> : null}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
            <Button type="button" onClick={onSaveProfile} loading={saving} disabled={saving}>{copy.saveSettings}</Button>
          </div>
        </SectionCard>
      </SettingsSection>

      {/* Weekly availability */}
      <SettingsSection title={copy.weeklyAvailabilityTitle}>
        <SectionCard>
          {rules.length === 0 ? (
            <Type variant="caption" className="text-muted-foreground">{copy.noAvailability}</Type>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <ListRow key={rule.id} removeLabel={removeLabel} onRemove={onDeleteRule ? () => onDeleteRule(rule.id) : undefined}>
                  {rule.by_weekday.map((d) => WEEKDAYS[d]).join(", ")} · {rule.start_local}–{rule.end_local}
                </ListRow>
              ))}
            </div>
          )}
          <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
            <WeekdayPicker
              selected={ruleWeekdays}
              onToggle={(index, checked) =>
                setRuleWeekdays((prev) => (checked ? [...prev, index] : prev.filter((d) => d !== index)))
              }
            />
            <div className="flex items-center gap-2">
              <Input type="time" value={ruleStart} onChange={(e) => setRuleStart(e.target.value)} aria-label={copy.weeklyAvailabilityTitle} className="min-w-0 flex-1" />
              <Type variant="caption" className="shrink-0">{copy.rangeSeparator}</Type>
              <Input type="time" value={ruleEnd} onChange={(e) => setRuleEnd(e.target.value)} aria-label={copy.weeklyAvailabilityTitle} className="min-w-0 flex-1" />
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={busy || ruleWeekdays.length === 0}
              onClick={() => onAddRule?.({ byWeekday: [...ruleWeekdays].sort((a, b) => a - b), startLocal: ruleStart, endLocal: ruleEnd })}
            >
              {copy.addAvailability}
            </Button>
          </div>
        </SectionCard>
      </SettingsSection>

      {/* Variable pricing */}
      <SettingsSection title={copy.variablePricingTitle}>
        <SectionCard>
          {priceRules.length === 0 ? (
            <Type variant="caption" className="text-muted-foreground">{copy.noPriceRules}</Type>
          ) : (
            <div className="space-y-2">
              {priceRules.map((rule) => (
                <ListRow key={rule.id} removeLabel={removeLabel} onRemove={onDeletePriceRule ? () => onDeletePriceRule(rule.id) : undefined}>
                  {(rule.match_weekday ?? []).map((d) => WEEKDAYS[d]).join(", ") || copy.allDays}
                  {" · "}
                  {rule.match_local_start ?? copy.anyTime}–{rule.match_local_end ?? copy.anyTime}
                  {" · "}
                  ${formatUsd(rule.price_cents)}
                </ListRow>
              ))}
            </div>
          )}
          <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
            <WeekdayPicker
              selected={priceWeekdays}
              onToggle={(index, checked) =>
                setPriceWeekdays((prev) => (checked ? [...prev, index] : prev.filter((d) => d !== index)))
              }
            />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_1fr] sm:items-center">
              <Input type="time" value={priceStart} onChange={(e) => setPriceStart(e.target.value)} aria-label={copy.variablePricingTitle} className="min-w-0" />
              <Type variant="caption" className="shrink-0">{copy.rangeSeparator}</Type>
              <Input type="time" value={priceEnd} onChange={(e) => setPriceEnd(e.target.value)} aria-label={copy.variablePricingTitle} className="min-w-0" />
              <Input type="number" step="0.01" min="0.01" value={priceRuleUsd} onChange={(e) => setPriceRuleUsd(e.target.value)} aria-label={copy.basePriceLabel} className="min-w-0" />
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={busy || priceWeekdays.length === 0}
              onClick={() => onAddPriceRule?.({ matchWeekday: [...priceWeekdays].sort((a, b) => a - b), startLocal: priceStart, endLocal: priceEnd, priceUsd: priceRuleUsd })}
            >
              {copy.addPriceRule}
            </Button>
          </div>
        </SectionCard>
      </SettingsSection>

      {/* One-off exceptions */}
      <SettingsSection title={copy.exceptionsTitle}>
        <SectionCard>
          {exceptions.length === 0 ? (
            <Type variant="caption" className="text-muted-foreground">{copy.noExceptions}</Type>
          ) : (
            <div className="space-y-2">
              {exceptions.map((exception) => (
                <ListRow key={exception.id} removeLabel={removeLabel} onRemove={onDeleteException ? () => onDeleteException(exception.id) : undefined}>
                  {exception.kind === "block" ? copy.exceptionBlock : copy.exceptionOpen} · {formatLocalStamp(exception.start)}–{formatLocalStamp(exception.end)}
                </ListRow>
              ))}
            </div>
          )}
          <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_8rem]">
              <Input type="datetime-local" value={exceptionStart} onChange={(e) => setExceptionStart(e.target.value)} aria-label={copy.exceptionsTitle} className="min-w-0" />
              <Input type="datetime-local" value={exceptionEnd} onChange={(e) => setExceptionEnd(e.target.value)} aria-label={copy.exceptionsTitle} className="min-w-0" />
              <select className={selectClass} value={exceptionKind} onChange={(e) => setExceptionKind(e.target.value as "block" | "open")} aria-label={copy.exceptionsTitle}>
                <option value="block">{copy.exceptionBlock}</option>
                <option value="open">{copy.exceptionOpen}</option>
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={busy || !exceptionStart || !exceptionEnd}
              onClick={() => onAddException?.({ kind: exceptionKind, startLocal: exceptionStart, endLocal: exceptionEnd })}
            >
              {copy.addException}
            </Button>
          </div>
        </SectionCard>
      </SettingsSection>

      {/* Cancellation policy (display-only; enforced server-side) */}
      <SettingsSection title={copy.cancellationTitle}>
        <Type variant="caption" className="text-muted-foreground">{copy.cancellationCopy}</Type>
      </SettingsSection>

      {/* Publish */}
      <SettingsSection title={isPublished ? copy.publishTitleLive : copy.publishTitleIdle}>
        <SectionCard>
          {!payoutReady ? (
            <Type variant="caption" className="text-muted-foreground">{copy.publishBlockedNote}</Type>
          ) : (
            <Type variant="caption" className="text-muted-foreground">
              {isPublished ? copy.publishLiveNote : copy.publishReadyNote}
            </Type>
          )}
          <div className="flex items-center justify-end">
            <Button
              variant={isPublished ? "outline" : "default"}
              type="button"
              onClick={onTogglePublish}
              loading={publishing}
              disabled={publishing || (!isPublished && !payoutReady)}
            >
              {isPublished ? copy.unpublish : copy.publish}
            </Button>
          </div>
        </SectionCard>
      </SettingsSection>
    </div>
  );
}
