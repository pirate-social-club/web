"use client";

import * as React from "react";

import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/api/session-store";
import type {
  AvailabilityException,
  AvailabilityRule,
  BookingProfile,
  PriceRule,
} from "@/lib/api/bookings-types";
import {
  isDateTimeRange,
  isTimeRange,
  isValidMoneyInput,
  isValidPositiveMoneyInput,
  localInputToIsoUtc,
  usdToCents,
  centsToUsd,
} from "@/app/authenticated-helpers/booking-host-settings-validation";
import type {
  AvailabilityExceptionInput,
  AvailabilityRuleInput,
  PriceRuleInput,
  ProfileBookingsValues,
  ProfileBookingsSectionProps,
} from "@/components/compositions/bookings/profile-bookings-section/profile-bookings-section";

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function timezoneOptions(): string[] {
  try {
    const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone");
    if (all && all.length) return all;
  } catch {
    /* fall through */
  }
  return ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Vienna", "Asia/Tokyo"];
}

function isProfile(p: unknown): p is BookingProfile {
  return Boolean(p) && (p as { exists?: boolean }).exists !== false;
}

/** The props ProfileBookingsSection needs, minus the presentational-only `className`. */
export type BookingHostSectionProps = Omit<ProfileBookingsSectionProps, "className">;

export interface UseBookingHostSettingsResult {
  loading: boolean;
  sectionProps: BookingHostSectionProps;
}

/**
 * Container logic for the host's paid-booking setup, extracted from the standalone
 * /settings/bookings route so it can be mounted inside edit profile AND the compat route.
 * Owns load + persistence + validation; ProfileBookingsSection stays controlled + app-free.
 *
 * Payouts settle to the user's in-app wallet (`profile.primary_wallet_address`); there is no
 * separate payout-wallet field. Publish is gated on that wallet existing.
 */
export function useBookingHostSettings(): UseBookingHostSettingsResult {
  const api = useApi();
  const session = useSession();
  const payoutWallet = session?.profile?.primary_wallet_address ?? null;
  const payoutReady = Boolean(payoutWallet && payoutWallet.trim().length > 0);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [mutating, setMutating] = React.useState(false);
  const [isPublished, setIsPublished] = React.useState(false);
  const [basePriceError, setBasePriceError] = React.useState<string | null>(null);

  const [values, setValues] = React.useState<ProfileBookingsValues>({
    timezone: browserTimezone(),
    durationSeconds: 1800,
    priceUsd: "0.00",
  });

  const [rules, setRules] = React.useState<AvailabilityRule[]>([]);
  const [exceptions, setExceptions] = React.useState<AvailabilityException[]>([]);
  const [priceRules, setPriceRules] = React.useState<PriceRule[]>([]);

  const tzOptions = React.useMemo(() => timezoneOptions(), []);

  const onValuesChange = React.useCallback((patch: Partial<ProfileBookingsValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
    if (patch.priceUsd !== undefined) setBasePriceError(null);
  }, []);

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
          setValues({
            timezone: profile.host_timezone || browserTimezone(),
            durationSeconds: profile.default_slot_duration_seconds || 1800,
            priceUsd: centsToUsd(profile.base_price_cents || 0),
          });
          setIsPublished(profile.is_published);
        }
        await reloadAvailability();
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "Failed to load booking settings");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [api, reloadAvailability]);

  // Persist profile fields + the app-wallet payout destination. Returns false on validation failure.
  const persistProfile = React.useCallback(async (): Promise<boolean> => {
    if (!isValidMoneyInput(values.priceUsd)) {
      setBasePriceError("Enter a valid base price");
      return false;
    }
    setBasePriceError(null);
    await api.hostBookings.updateBookingProfile({
      host_timezone: values.timezone,
      default_slot_duration_seconds: values.durationSeconds,
      base_price_cents: usdToCents(values.priceUsd),
      payout_wallet_address: payoutWallet,
    });
    return true;
  }, [api, values, payoutWallet]);

  // Auto-save (debounced) whenever a profile field changes — no explicit Save step. Skips the
  // initial load; silent on success (only surfaces errors) so it doesn't spam toasts.
  const autosaveReady = React.useRef(false);
  React.useEffect(() => {
    if (loading) return;
    if (!autosaveReady.current) {
      autosaveReady.current = true;
      return;
    }
    const timer = setTimeout(() => {
      setSaving(true);
      void persistProfile()
        .catch((error) => toast.error(error instanceof ApiError ? error.message : "Could not save"))
        .finally(() => setSaving(false));
    }, 700);
    return () => clearTimeout(timer);
  }, [loading, values.timezone, values.durationSeconds, values.priceUsd, persistProfile]);

  const onTogglePublish = React.useCallback(async () => {
    setPublishing(true);
    try {
      if (!isPublished) {
        // Ensure the profile (incl. the app-wallet payout destination) is persisted before publish,
        // so publish never 409s on an unsaved/absent profile regardless of save order.
        if (!await persistProfile()) return;
        const res = await api.hostBookings.publishBookingProfile();
        if (isProfile(res)) setIsPublished(res.is_published);
        toast.success("Bookings published — you're now bookable");
      } else {
        const res = await api.hostBookings.unpublishBookingProfile();
        if (isProfile(res)) setIsPublished(res.is_published);
        toast.success("Bookings unpublished");
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }, [api, isPublished, persistProfile]);

  const onAddRule = React.useCallback(async (draft: AvailabilityRuleInput) => {
    if (draft.byWeekday.length === 0) {
      toast.error("Pick at least one weekday");
      return;
    }
    if (!isTimeRange(draft.startLocal, draft.endLocal)) {
      toast.error("Availability end time must be after start time");
      return;
    }
    setMutating(true);
    try {
      await api.hostBookings.createAvailabilityRule({
        by_weekday: draft.byWeekday,
        start_local: draft.startLocal,
        end_local: draft.endLocal,
        slot_duration_seconds: values.durationSeconds,
      });
      await reloadAvailability();
      toast.success("Availability added");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not add availability");
    } finally {
      setMutating(false);
    }
  }, [api, values.durationSeconds, reloadAvailability]);

  const onDeleteRule = React.useCallback(async (ruleId: string) => {
    try {
      await api.hostBookings.deleteAvailabilityRule(ruleId);
      await reloadAvailability();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not remove availability");
    }
  }, [api, reloadAvailability]);

  const onAddPriceRule = React.useCallback(async (draft: PriceRuleInput) => {
    if (draft.matchWeekday.length === 0) {
      toast.error("Pick at least one weekday");
      return;
    }
    if (!isTimeRange(draft.startLocal, draft.endLocal)) {
      toast.error("Price rule end time must be after start time");
      return;
    }
    if (!isValidPositiveMoneyInput(draft.priceUsd)) {
      toast.error("Enter a price greater than 0");
      return;
    }
    setMutating(true);
    try {
      await api.hostBookings.createPriceRule({
        match_weekday: draft.matchWeekday,
        match_local_start: draft.startLocal,
        match_local_end: draft.endLocal,
        price_cents: usdToCents(draft.priceUsd),
        priority: priceRules.length + 1,
      });
      await reloadAvailability();
      toast.success("Price rule added");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not add price rule");
    } finally {
      setMutating(false);
    }
  }, [api, priceRules.length, reloadAvailability]);

  const onDeletePriceRule = React.useCallback(async (priceRuleId: string) => {
    try {
      await api.hostBookings.deletePriceRule(priceRuleId);
      await reloadAvailability();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not remove price rule");
    }
  }, [api, reloadAvailability]);

  const onAddException = React.useCallback(async (draft: AvailabilityExceptionInput) => {
    if (!isDateTimeRange(draft.startLocal, draft.endLocal)) {
      toast.error("Exception end time must be after start time");
      return;
    }
    const startUtc = localInputToIsoUtc(draft.startLocal, values.timezone);
    const endUtc = localInputToIsoUtc(draft.endLocal, values.timezone);
    if (!startUtc || !endUtc || Date.parse(startUtc) >= Date.parse(endUtc)) {
      toast.error("Choose valid times in your teaching timezone (daylight-saving gaps are unavailable)");
      return;
    }
    setMutating(true);
    try {
      await api.hostBookings.createAvailabilityException({
        kind: draft.kind,
        start_utc: startUtc,
        end_utc: endUtc,
      });
      await reloadAvailability();
      toast.success("Exception added");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not add exception");
    } finally {
      setMutating(false);
    }
  }, [api, reloadAvailability, values.timezone]);

  const onDeleteException = React.useCallback(async (exceptionId: string) => {
    try {
      await api.hostBookings.deleteAvailabilityException(exceptionId);
      await reloadAvailability();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not remove exception");
    }
  }, [api, reloadAvailability]);

  const sectionProps: BookingHostSectionProps = {
    values,
    onValuesChange,
    rules,
    priceRules,
    exceptions,
    bookable: isPublished,
    saving,
    toggling: publishing,
    busy: mutating,
    payoutReady,
    timezoneOptions: tzOptions,
    basePriceError,
    onToggleBookable: onTogglePublish,
    onAddRule,
    onDeleteRule,
    onAddPriceRule,
    onDeletePriceRule,
    onAddException,
    onDeleteException,
  };

  return { loading, sectionProps };
}
