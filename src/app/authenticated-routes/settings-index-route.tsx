"use client";

import { navigate } from "@/app/router";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { StackedSectionNav } from "@/components/compositions/system/stacked-section-nav/stacked-section-nav";
import { useSession } from "@/lib/api/session-store";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { usePwaInstallPrompt } from "@/lib/pwa/use-pwa-install-prompt";
import { toast } from "@/components/primitives/sonner";

import { AuthRequiredRouteState } from "./route-shell";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { buildSettingsPath } from "./profile-settings-mapping";

export function CurrentUserSettingsIndexPage() {
  const { copy } = useRouteMessages();
  const session = useSession();
  const profile = session?.profile ?? null;
  const isMobile = useIsMobile();
  const pageTitle = copy.settings.title;
  const pwaPrompt = usePwaInstallPrompt();

  const items: React.ComponentProps<typeof StackedSectionNav>["sections"][number]["items"] = [
    {
      label: copy.settings.profileTab,
      onSelect: () => navigate(buildSettingsPath("profile")),
    },
    {
      label: copy.settings.preferencesTab,
      onSelect: () => navigate(buildSettingsPath("preferences")),
    },
    {
      label: "Agents",
      onSelect: () => navigate(buildSettingsPath("agents")),
    },
  ];

  if (pwaPrompt.canPrompt && !pwaPrompt.isInstalled) {
    items.push({
      label: copy.settings.installAppLabel,
      description: copy.settings.installAppDescription,
      onSelect: () => {
        const platform = pwaPrompt.isIOS ? "ios_manual" : "chromium";
        trackAnalyticsEvent({
          eventName: "pwa_install_prompt_opened",
          properties: { surface: "settings", platform },
        });
        if (pwaPrompt.isIOS) {
          pwaPrompt.promptInstallIOS("settings");
          toast(copy.settings.installAppIOSInstructions);
        } else {
          void pwaPrompt.promptInstall("settings");
        }
      },
    });
  }

  const sections = [{
    label: pageTitle,
    items,
  }];
  const content = !profile ? (
    <AuthRequiredRouteState description={copy.routeStatus.settings.auth} title={pageTitle} />
  ) : (
    <section className={isMobile ? "flex w-full flex-col py-5" : "mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8"}>
      <StackedSectionNav mobileLayout={isMobile} sections={sections} />
    </section>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        <MobilePageHeader onCloseClick={() => navigate("/me")} title={pageTitle} />
        <section className="flex min-w-0 flex-1 flex-col py-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
          <div className="min-w-0">
            {content}
          </div>
        </section>
      </div>
    );
  }

  return content;
}
