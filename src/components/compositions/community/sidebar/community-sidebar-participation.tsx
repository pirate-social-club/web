"use client";

import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { Type } from "@/components/primitives/type";

export interface CommunitySidebarParticipationProps {
  hasDurableGates: boolean;
}

export function CommunitySidebarParticipation({ hasDurableGates }: CommunitySidebarParticipationProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "gates").sidebar;

  return (
    <div className="flex flex-col gap-1.5">
      <Type as="p" variant="caption">
        {hasDurableGates ? copy.participationMayNote : copy.participationRequireNote}
      </Type>
      {hasDurableGates ? (
        <Type as="p" variant="caption">
          {copy.participationSkipNote}
        </Type>
      ) : null}
    </div>
  );
}
