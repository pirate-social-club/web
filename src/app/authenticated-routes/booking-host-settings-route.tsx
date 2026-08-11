"use client";

import * as React from "react";

import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { Type } from "@/components/primitives/type";
import { ProfileBookingsSection } from "@/components/compositions/bookings/profile-bookings-section/profile-bookings-section";
import { useBookingHostSettings } from "@/app/authenticated-state/use-booking-host-settings";
import { AuthRequiredRouteState } from "@/app/authenticated-helpers/route-shell";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { useSession } from "@/lib/api/session-store";

// Compatibility route. The canonical home for host booking setup is now Settings → Profile
// (edit profile). This route renders the SAME section + container hook so existing links,
// bookmarks, and docs that point at /settings/bookings keep working identically.
export function BookingHostSettingsPage(): React.ReactElement {
  const { copy } = useRouteMessages();
  const session = useSession();
  const profile = session?.profile ?? null;

  return (
    <StandardRoutePage size="rail">
      {profile ? (
        <BookingHostSettingsContent />
      ) : (
        <AuthRequiredRouteState description={copy.routeStatus.settings.auth} title="Booking settings" />
      )}
    </StandardRoutePage>
  );
}

function BookingHostSettingsContent(): React.ReactElement {
  const { loading, sectionProps } = useBookingHostSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div className="space-y-1">
        <Type as="h1" variant="h2">Booking settings</Type>
        <Type variant="caption" className="text-muted-foreground">
          Configure your paid 1:1 sessions. You can also manage these from Settings → Profile.
        </Type>
      </div>
      {loading ? (
        <Type variant="body">Loading booking settings…</Type>
      ) : (
        <ProfileBookingsSection {...sectionProps} />
      )}
    </div>
  );
}
