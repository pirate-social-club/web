"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "@/components/primitives/sonner";

type PolicySubmitState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export function useCommunityPolicyLifecycle<TSettings, TPolicy>({
  community,
  createDefaults,
  fallbackFromCommunity,
  loadPolicy,
  loadErrorMessage,
  policyToSettings,
  savePolicy,
  saveErrorMessage,
  saveSuccessMessage,
  updateCommunity,
}: {
  community: ApiCommunity | null;
  createDefaults: () => TSettings;
  fallbackFromCommunity: (community: ApiCommunity) => TSettings;
  loadPolicy: (communityId: string) => Promise<TPolicy>;
  loadErrorMessage: string;
  policyToSettings: (policy: TPolicy) => TSettings;
  savePolicy: (communityId: string, settings: TSettings) => Promise<TPolicy>;
  saveErrorMessage: string;
  saveSuccessMessage: string;
  updateCommunity?: (communityId: string, policy: TPolicy) => void;
}) {
  const [settings, setSettings] = React.useState<TSettings>(createDefaults);
  const [savedSettings, setSavedSettings] = React.useState<TSettings>(createDefaults);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (!community) {
      const defaults = createDefaults();
      setSettings(defaults);
      setSavedSettings(defaults);
      setLoading(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    const fallback = fallbackFromCommunity(community);
    setSettings(fallback);
    setSavedSettings(fallback);
    setLoading(true);
    setError(null);
    void loadPolicy(community.id)
      .then((policy) => {
        if (!cancelled) {
          const loadedSettings = policyToSettings(policy);
          setSettings(loadedSettings);
          setSavedSettings(loadedSettings);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(loadError, loadErrorMessage));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [community, createDefaults, fallbackFromCommunity, loadErrorMessage, loadPolicy, policyToSettings]);

  const dirty = React.useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [savedSettings, settings],
  );

  const save = React.useCallback(() => {
    if (!community || saving) {
      return;
    }

    setError(null);
    setSaving(true);
    void savePolicy(community.id, settings)
      .then((policy) => {
        const saved = policyToSettings(policy);
        setSettings(saved);
        setSavedSettings(saved);
        updateCommunity?.(community.id, policy);
        toast.success(saveSuccessMessage);
      })
      .catch((saveError: unknown) => {
        const message = getErrorMessage(saveError, saveErrorMessage);
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        setSaving(false);
      });
  }, [
    community,
    policyToSettings,
    saveErrorMessage,
    savePolicy,
    saveSuccessMessage,
    saving,
    settings,
    updateCommunity,
  ]);

  const submitState: PolicySubmitState = saving
    ? { kind: "saving" }
    : loading
      ? { kind: "loading" }
      : error
        ? { kind: "error", message: error }
        : { kind: "idle" };

  return { dirty, loading, save, saving, settings, setSettings, submitState };
}
