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
import type { AvailabilityRule, BookingProfile } from "@/lib/api/bookings-types";

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
function centsToUsd(cents: number): string { return (cents / 100).toFixed(2); }
function usdToCents(usd: string): number { return Math.round(Number.parseFloat(usd || "0") * 100); }
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
  const [newWeekdays, setNewWeekdays] = React.useState<number[]>([1, 2, 3, 4, 5]);
  const [newStart, setNewStart] = React.useState("09:00");
  const [newEnd, setNewEnd] = React.useState("17:00");
  const [addingRule, setAddingRule] = React.useState(false);

  const reloadRules = React.useCallback(async () => {
    const res = await api.hostBookings.listAvailabilityRules();
    setRules(res.data);
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
        await reloadRules();
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "Failed to load booking settings");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [api, reloadRules]);

  const handleSaveProfile = React.useCallback(async () => {
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
    setAddingRule(true);
    try {
      await api.hostBookings.createAvailabilityRule({
        by_weekday: [...newWeekdays].sort(),
        start_local: newStart,
        end_local: newEnd,
        slot_duration_seconds: durationSeconds,
      });
      await reloadRules();
      toast.success("Availability added");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not add availability");
    } finally {
      setAddingRule(false);
    }
  }, [api, newWeekdays, newStart, newEnd, durationSeconds, reloadRules]);

  const handleDeleteRule = React.useCallback(async (ruleId: string) => {
    try {
      await api.hostBookings.deleteAvailabilityRule(ruleId);
      await reloadRules();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not remove availability");
    }
  }, [api, reloadRules]);

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
