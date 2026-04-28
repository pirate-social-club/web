"use client";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Switch } from "@/components/primitives/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";

import { SettingsRow, SettingsSection } from "./settings-page-panel-primitives";
import type { SettingsPageProps } from "../settings-page.types";

export function PreferencesTab({
  preferences,
}: Pick<SettingsPageProps, "preferences">) {
  const { locale } = useUiLocale();
  const isMobile = useIsMobile();
  const copy = getLocaleMessages(locale, "routes").settings;
  const hasIdentityRows = Boolean(preferences.ageStatusLabel || preferences.nationalityBadgeCountryLabel);
  return (
    <div className="space-y-8">
      <SettingsSection title={copy.languageSection}>
        <Card className={cn("space-y-5 border-border bg-card px-5 py-5 shadow-none", isMobile && "border-0 bg-transparent px-0 py-0")}>
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground" htmlFor="settings-language">
              {copy.appLanguageLabel}
            </label>
            <Select onValueChange={preferences.onLocaleChange} value={preferences.locale}>
              <SelectTrigger className="rounded-[var(--radius-lg)]" id="settings-language">
                <SelectValue placeholder={copy.selectLanguage} />
              </SelectTrigger>
              <SelectContent>
                {preferences.localeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={cn("flex items-center justify-end gap-3 border-t border-border pt-5", isMobile && "border-t-0 pt-1")}>
            {preferences.submitState.kind === "error" ? (
              <div className="me-auto text-base text-destructive">{preferences.submitState.message}</div>
            ) : null}
            <Button
              disabled={preferences.saveDisabled}
              loading={preferences.submitState.kind === "saving"}
              onClick={() => preferences.onSave?.()}
              type="button"
            >
              {copy.savePreferences}
            </Button>
          </div>
        </Card>
      </SettingsSection>

      {hasIdentityRows ? (
        <SettingsSection title={copy.identitySection}>
          <Card className={cn("overflow-hidden border-border bg-card shadow-none", isMobile && "border-0 bg-transparent")}>
            {preferences.ageStatusLabel ? (
              <SettingsRow label={copy.ageStatusLabel} value={preferences.ageStatusLabel} />
            ) : null}
            {preferences.nationalityBadgeCountryLabel ? (
              <SettingsRow
                label={copy.nationalityBadgeLabel}
                trailing={(
                  <Switch
                    aria-label={copy.nationalityBadgeLabel}
                    checked={preferences.nationalityBadgeEnabled}
                    disabled={preferences.nationalityBadgeDisabled}
                    onCheckedChange={preferences.onNationalityBadgeChange}
                  />
                )}
                value={preferences.nationalityBadgeCountryLabel}
              />
            ) : null}
          </Card>
        </SettingsSection>
      ) : null}

      <SettingsSection title={copy.accountSection}>
        <Card className={cn("overflow-hidden border-border bg-card shadow-none", isMobile && "border-0 bg-transparent")}>
          <SettingsRow
            label={copy.logOutLabel}
            trailing={(
              <Button onClick={() => preferences.onLogout?.()} type="button" variant="outline">
                {copy.logOutAction}
              </Button>
            )}
          />
        </Card>
      </SettingsSection>
    </div>
  );
}
