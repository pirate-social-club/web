"use client";

import * as React from "react";

import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Checkbox } from "@/components/primitives/checkbox";
import { Type } from "@/components/primitives/type";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { usePiratePrivyWallets } from "@/components/auth/privy-provider";
import type { AvailabilityException, AvailabilityRule, BookingProfile, PriceRule } from "@/lib/api/bookings-types";
import {
  centsToUsd,
  defaultExceptionEnd,
  defaultExceptionStart,
  epochSecondsToLocalInput,
  isDateTimeRange,
  isTimeRange,
  isValidMoneyInput,
  isValidPositiveMoneyInput,
  localInputToIsoUtc,
  usdToCents,
} from "@/app/authenticated-helpers/booking-host-settings-validation";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DURATION_OPTIONS = [
  { label: "15 minutes", seconds: 900 },
  { label: "30 minutes", seconds: 1800 },
  { label: "45 minutes", seconds: 2700 },
  { label: "60 minutes", seconds: 3600 },
];

function browserTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}
function timezoneOptions(): string[] {
  try {
    const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone");
    if (all && all.length) return all;
  } catch { /* fall through */ }
  return ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Vienna", "Asia/Tokyo"];
}
function isProfile(p: unknown): p is BookingProfile { return Boolean(p) && (p as { exists?: boolean }).exists !== false; }

export function BookingHostSettingsPage(): React.ReactElement {
  const api = useApi();
  const { connectedWallets } = usePiratePrivyWallets();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [isPublished, setIsPublished] = React.useState(false);

  const [timezone, setTimezone] = React.useState(browserTimezone());
  const [durationSeconds, setDurationSeconds] = React.useState(1800);
  const [priceUsd, setPriceUsd] = React.useState("0.00");
  const [payoutWallet, setPayoutWallet] = React.useState("");
  const [headline, setHeadline] = React.useState("");

  const [rules, setRules] = React.useState<AvailabilityRule[]>([]);
  const [exceptions, setExceptions] = React.useState<AvailabilityException[]>([]);
  const [priceRules, setPriceRules] = React.useState<PriceRule[]>([]);
  const [newWeekdays, setNewWeekdays] = React.useState<number[]>([1, 2, 3, 4, 5]);
  const [newStart, setNewStart] = React.useState("09:00");
  const [newEnd, setNewEnd] = React.useState("17:00");
  const [addingRule, setAddingRule] = React.useState(false);
  const [newExceptionKind, setNewExceptionKind] = React.useState<"block" | "open">("block");
  const [newExceptionStart, setNewExceptionStart] = React.useState(defaultExceptionStart);
  const [newExceptionEnd, setNewExceptionEnd] = React.useState(() => defaultExceptionEnd(defaultExceptionStart()));
  const [addingException, setAddingException] = React.useState(false);
  const [newPriceWeekdays, setNewPriceWeekdays] = React.useState<number[]>([1, 2, 3, 4, 5]);
  const [newPriceStart, setNewPriceStart] = React.useState("09:00");
  const [newPriceEnd, setNewPriceEnd] = React.useState("12:00");
  const [newPriceUsd, setNewPriceUsd] = React.useState("75.00");
  const [addingPriceRule, setAddingPriceRule] = React.useState(false);

  const reloadAvailability = React.useCallback(async () => {
    const [rulesRes, exceptionsRes, priceRulesRes] = await Promise.all([
      api.hostBookings.listAvailabilityRules(),
      api.hostBookings.listAvailabilityExceptions(),
      api.hostBookings.listPriceRules(),
    ]);
    setRules(rulesRes.data);
    setExceptions(exceptionsRes.data);
    setPriceRules(priceRulesRes.data);
  }, [api]);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const profile = await api.hostBookings.getBookingProfile();
        if (active && isProfile(profile)) {
          setTimezone(profile.host_timezone || browserTimezone());
          setDurationSeconds(profile.default_slot_duration_seconds || 1800);
          setPriceUsd(centsToUsd(profile.base_price_cents || 0));
          setPayoutWallet(profile.payout_wallet_address ?? "");
          setHeadline(profile.display_headline ?? "");
          setIsPublished(profile.is_published);
        }
        await reloadAvailability();
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "Failed to load booking settings");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [api, reloadAvailability]);

  const handleSaveProfile = React.useCallback(async () => {
    if (!isValidMoneyInput(priceUsd)) { toast.error("Enter a valid base price"); return; }
    setSaving(true);
    try {
      await api.hostBookings.updateBookingProfile({
        host_timezone: timezone,
        default_slot_duration_seconds: durationSeconds,
        base_price_cents: usdToCents(priceUsd),
        payout_wallet_address: payoutWallet.trim() || null,
        display_headline: headline.trim() || null,
      });
      toast.success("Booking settings saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [api, timezone, durationSeconds, priceUsd, payoutWallet, headline]);

  const handleTogglePublish = React.useCallback(async () => {
    setPublishing(true);
    try {
      const res = isPublished
        ? await api.hostBookings.unpublishBookingProfile()
        : await api.hostBookings.publishBookingProfile();
      if (isProfile(res)) setIsPublished(res.is_published);
      toast.success(isPublished ? "Bookings unpublished" : "Bookings published — you're now bookable");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }, [api, isPublished]);

  const handleAddRule = React.useCallback(async () => {
    if (newWeekdays.length === 0) { toast.error("Pick at least one weekday"); return; }
    if (!isTimeRange(newStart, newEnd)) { toast.error("Availability end time must be after start time"); return; }
    setAddingRule(true);
    try {
      await api.hostBookings.createAvailabilityRule({
        by_weekday: [...newWeekdays].sort(),
        start_local: newStart,
        end_local: newEnd,
        slot_duration_seconds: durationSeconds,
      });
      await reloadAvailability();
      toast.success("Availability added");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not add availability");
    } finally {
      setAddingRule(false);
    }
  }, [api, newWeekdays, newStart, newEnd, durationSeconds, reloadAvailability]);

  const handleDeleteRule = React.useCallback(async (ruleId: string) => {
    try {
      await api.hostBookings.deleteAvailabilityRule(ruleId);
      await reloadAvailability();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not remove availability");
    }
  }, [api, reloadAvailability]);

  const handleAddException = React.useCallback(async () => {
    if (!isDateTimeRange(newExceptionStart, newExceptionEnd)) {
      toast.error("Exception end time must be after start time");
      return;
    }
    setAddingException(true);
    try {
      await api.hostBookings.createAvailabilityException({
        kind: newExceptionKind,
        start_utc: localInputToIsoUtc(newExceptionStart),
        end_utc: localInputToIsoUtc(newExceptionEnd),
      });
      await reloadAvailability();
      toast.success("Exception added");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not add exception");
    } finally {
      setAddingException(false);
    }
  }, [api, newExceptionKind, newExceptionStart, newExceptionEnd, reloadAvailability]);

  const handleDeleteException = React.useCallback(async (exceptionId: string) => {
    try {
      await api.hostBookings.deleteAvailabilityException(exceptionId);
      await reloadAvailability();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not remove exception");
    }
  }, [api, reloadAvailability]);

  const handleAddPriceRule = React.useCallback(async () => {
    if (newPriceWeekdays.length === 0) { toast.error("Pick at least one weekday"); return; }
    if (!isTimeRange(newPriceStart, newPriceEnd)) { toast.error("Price rule end time must be after start time"); return; }
    if (!isValidPositiveMoneyInput(newPriceUsd)) { toast.error("Enter a price greater than 0"); return; }
    setAddingPriceRule(true);
    try {
      await api.hostBookings.createPriceRule({
        match_weekday: [...newPriceWeekdays].sort(),
        match_local_start: newPriceStart,
        match_local_end: newPriceEnd,
        price_cents: usdToCents(newPriceUsd),
        priority: priceRules.length + 1,
      });
      await reloadAvailability();
      toast.success("Price rule added");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not add price rule");
    } finally {
      setAddingPriceRule(false);
    }
  }, [api, newPriceWeekdays, newPriceStart, newPriceEnd, newPriceUsd, priceRules.length, reloadAvailability]);

  const handleDeletePriceRule = React.useCallback(async (priceRuleId: string) => {
    try {
      await api.hostBookings.deletePriceRule(priceRuleId);
      await reloadAvailability();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not remove price rule");
    }
  }, [api, reloadAvailability]);

  if (loading) {
    return <StandardRoutePage size="rail"><div className="p-6"><Type variant="body">Loading booking settings…</Type></div></StandardRoutePage>;
  }

  const canPublish = payoutWallet.trim().length > 0;

  return (
    <StandardRoutePage size="rail">
      <div className="mx-auto max-w-2xl space-y-8 p-6">
        <div className="space-y-1">
          <Type as="h1" variant="h2">Booking settings</Type>
          <Type variant="caption" className="text-muted-foreground">Configure your paid 1:1 sessions.</Type>
        </div>

        {/* Profile */}
        <section className="space-y-4">
          <Type variant="label">Session</Type>
          <label className="block space-y-1">
            <Type variant="caption" className="text-muted-foreground">Timezone</Type>
            <select className="w-full rounded-lg border border-border bg-background p-2" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {timezoneOptions().map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </label>
          <label className="block space-y-1">
            <Type variant="caption" className="text-muted-foreground">Session duration</Type>
            <select className="w-full rounded-lg border border-border bg-background p-2" value={String(durationSeconds)} onChange={(e) => setDurationSeconds(Number(e.target.value))}>
              {DURATION_OPTIONS.map((o) => <option key={o.seconds} value={o.seconds}>{o.label}</option>)}
            </select>
          </label>
          <label className="block space-y-1">
            <Type variant="caption" className="text-muted-foreground">Price (USDC)</Type>
            <Input type="number" step="0.01" min="0" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} placeholder="0.00" />
          </label>
          <label className="block space-y-1">
            <Type variant="caption" className="text-muted-foreground">Headline (optional)</Type>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. 1:1 portfolio review" />
          </label>
        </section>

        {/* Payout wallet */}
        <section className="space-y-2">
          <Type variant="label">Payout wallet</Type>
          <Type variant="caption" className="text-muted-foreground">Required before you can publish. Your earnings settle here.</Type>
          <Input value={payoutWallet} onChange={(e) => setPayoutWallet(e.target.value)} placeholder="0x…" />
          {connectedWallets[0]?.address && connectedWallets[0].address.toLowerCase() !== payoutWallet.trim().toLowerCase() && (
            <Button variant="ghost" size="sm" onClick={() => setPayoutWallet(connectedWallets[0]!.address)}>
              Use connected wallet ({connectedWallets[0].address.slice(0, 6)}…{connectedWallets[0].address.slice(-4)})
            </Button>
          )}
        </section>

        <Button onClick={handleSaveProfile} loading={saving} disabled={saving}>Save settings</Button>

        {/* Availability */}
        <section className="space-y-3 border-t border-border pt-6">
          <Type variant="label">Weekly availability</Type>
          {rules.length === 0 && <Type variant="caption" className="text-muted-foreground">No availability yet — add a recurring weekly window below.</Type>}
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <Type variant="body">{rule.by_weekday.map((d) => WEEKDAYS[d]).join(", ")} · {rule.start_local}–{rule.end_local}</Type>
              <Button variant="ghost" size="sm" onClick={() => void handleDeleteRule(rule.id)}>Remove</Button>
            </div>
          ))}
          <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((label, index) => (
                <label key={label} className="flex items-center gap-1">
                  <Checkbox
                    checked={newWeekdays.includes(index)}
                    onCheckedChange={(checked) =>
                      setNewWeekdays((prev) => (checked ? [...prev, index] : prev.filter((d) => d !== index)))
                    }
                  />
                  <Type variant="caption">{label}</Type>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
              <Type variant="caption">to</Type>
              <Input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={handleAddRule} loading={addingRule} disabled={addingRule}>Add availability</Button>
          </div>
        </section>

        {/* Variable pricing */}
        <section className="space-y-3 border-t border-border pt-6">
          <Type variant="label">Variable pricing</Type>
          {priceRules.length === 0 && <Type variant="caption" className="text-muted-foreground">Base price applies to every available slot.</Type>}
          {priceRules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <Type variant="body">
                {(rule.match_weekday ?? []).map((d) => WEEKDAYS[d]).join(", ") || "All days"}
                {" · "}
                {rule.match_local_start ?? "Any"}–{rule.match_local_end ?? "Any"}
                {" · "}
                ${centsToUsd(rule.price_cents)}
              </Type>
              <Button variant="ghost" size="sm" onClick={() => void handleDeletePriceRule(rule.id)}>Remove</Button>
            </div>
          ))}
          <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((label, index) => (
                <label key={label} className="flex items-center gap-1">
                  <Checkbox
                    checked={newPriceWeekdays.includes(index)}
                    onCheckedChange={(checked) =>
                      setNewPriceWeekdays((prev) => (checked ? [...prev, index] : prev.filter((d) => d !== index)))
                    }
                  />
                  <Type variant="caption">{label}</Type>
                </label>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_1fr] sm:items-center">
              <Input type="time" value={newPriceStart} onChange={(e) => setNewPriceStart(e.target.value)} />
              <Type variant="caption">to</Type>
              <Input type="time" value={newPriceEnd} onChange={(e) => setNewPriceEnd(e.target.value)} />
              <Input type="number" step="0.01" min="0.01" value={newPriceUsd} onChange={(e) => setNewPriceUsd(e.target.value)} aria-label="Price in USDC" />
            </div>
            <Button variant="outline" size="sm" onClick={handleAddPriceRule} loading={addingPriceRule} disabled={addingPriceRule}>Add price rule</Button>
          </div>
        </section>

        {/* Exceptions */}
        <section className="space-y-3 border-t border-border pt-6">
          <Type variant="label">One-off exceptions</Type>
          {exceptions.length === 0 && <Type variant="caption" className="text-muted-foreground">Recurring availability applies as-is.</Type>}
          {exceptions.map((exception) => (
            <div key={exception.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <Type variant="body">
                {exception.kind === "block" ? "Block" : "Open"}
                {" · "}
                {epochSecondsToLocalInput(exception.start).replace("T", " ")}–{epochSecondsToLocalInput(exception.end).replace("T", " ")}
              </Type>
              <Button variant="ghost" size="sm" onClick={() => void handleDeleteException(exception.id)}>Remove</Button>
            </div>
          ))}
          <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_8rem]">
              <Input type="datetime-local" value={newExceptionStart} onChange={(e) => setNewExceptionStart(e.target.value)} />
              <Input type="datetime-local" value={newExceptionEnd} onChange={(e) => setNewExceptionEnd(e.target.value)} />
              <select className="w-full rounded-lg border border-border bg-background p-2" value={newExceptionKind} onChange={(e) => setNewExceptionKind(e.target.value as "block" | "open")}>
                <option value="block">Block</option>
                <option value="open">Open</option>
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddException} loading={addingException} disabled={addingException}>Add exception</Button>
          </div>
        </section>

        {/* Cancellation policy (display-only; enforced server-side) */}
        <section className="space-y-1 border-t border-border pt-6">
          <Type variant="label">Cancellation policy</Type>
          <Type variant="caption" className="text-muted-foreground">
            Bookers who cancel within 24 hours of booking receive a full refund; later cancellations are non-refundable.
            If you (the host) cancel or no-show, the booker is fully refunded.
          </Type>
        </section>

        {/* Publish */}
        <section className="space-y-2 border-t border-border pt-6">
          <Type variant="label">{isPublished ? "Your bookings are live" : "Publish your bookings"}</Type>
          {!canPublish && <Type variant="caption" className="text-muted-foreground">Add a payout wallet and save before publishing.</Type>}
          <Button
            variant={isPublished ? "outline" : "default"}
            onClick={handleTogglePublish}
            loading={publishing}
            disabled={publishing || (!isPublished && !canPublish)}
          >
            {isPublished ? "Unpublish" : "Publish bookings"}
          </Button>
        </section>
      </div>
    </StandardRoutePage>
  );
}
