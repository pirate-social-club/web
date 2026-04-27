"use client";

import * as React from "react";

import {
  ASSISTANT_CONVERSATION_ID,
  seedAssistantWelcome,
} from "@/app/authenticated-routes/chat/chat-assistant-client";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useSession } from "@/lib/api/session-store";
import { isOnboardingComplete } from "@/lib/onboarding";
import { useUiLocale } from "@/lib/ui-locale";

export function ChatOnboardingPrep() {
  const hydrated = useClientHydrated();
  const session = useSession();
  const { dir, locale } = useUiLocale();
  const seededUsersRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!hydrated || !session || !isOnboardingComplete(session.onboarding)) {
      return;
    }

    const userId = session.user.user_id;
    if (seededUsersRef.current.has(userId)) {
      return;
    }

    seededUsersRef.current.add(userId);
    void seedAssistantWelcome(session, ASSISTANT_CONVERSATION_ID, {
      dir,
      locale,
      onboarding: session.onboarding,
      route: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/",
      surface: "onboarding_complete",
    }).catch(() => {
      seededUsersRef.current.delete(userId);
    });
  }, [dir, hydrated, locale, session]);

  return null;
}
