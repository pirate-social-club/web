"use client";

import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";

import { PublicRouteMessageState } from "@/app/public-route-states";
import { getJoinCtaLabel } from "@/lib/identity-gates";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

export function PublicCommunityNotFound({ communityId }: { communityId: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicCommunity;
  return (
    <PublicRouteMessageState
      description={copy.notFoundDescription.replace("{communityId}", communityId)}
      title={copy.notFoundTitle}
    />
  );
}

export function PublicCommunityErrorState({ description }: { description: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicCommunity;
  return <PublicRouteMessageState description={description} title={copy.errorTitle} />;
}

export function resolvePublicCommunityJoinActionLabel(
  eligibility: ApiJoinEligibility | null,
  locale: string,
): string {
  return getJoinCtaLabel(eligibility ?? ({ status: "joinable" } as ApiJoinEligibility), { locale });
}
