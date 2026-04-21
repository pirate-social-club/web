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
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

import { SettingsRow, SettingsSection } from "./settings-page-panel-primitives";
import type { SettingsPageProps } from "../settings-page.types";

export function PreferencesTab({
  preferences,
}: Pick<SettingsPageProps, "preferences">) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").settings;
  return (
    <div className="space-y-8">
      <SettingsSection title={copy.languageSection}>
        <Card className="space-y-5 border-border bg-card px-5 py-5 shadow-none">
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
          <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
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

      {preferences.ageStatusLabel ? (
        <SettingsSection title={copy.identitySection}>
          <Card className="overflow-hidden border-border bg-card shadow-none">
            <SettingsRow label={copy.ageStatusLabel} value={preferences.ageStatusLabel} />
          </Card>
        </SettingsSection>
      ) : null}
    </div>
  );
}
