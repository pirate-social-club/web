import * as React from "react";

import type { ApiClient } from "@/lib/api/client";
import { findStoredOwnedAgentKey, saveStoredOwnedAgentKey } from "@/lib/agents/agent-key-store";
import { getErrorMessage } from "@/lib/error-utils";
import { logger } from "@/lib/logger";
import { toast } from "@/components/primitives/sonner";
import type { SettingsPageProps } from "@/components/compositions/settings/settings-page/settings-page.types";

import {
  type AgentRegistrationMessages,
  type ImportedOpenClawBundle,
  type PendingAgentRegistration,
  displayNameFromAgentHandle,
  formatOwnedAgentsLoadError,
  mapApiUserAgentToOwnedAgent,
  parseImportedOpenClawBundle,
} from "@/app/authenticated-helpers/profile-settings-mapping";

type SettingsOwnedAgentsMessages = AgentRegistrationMessages & {
  agentRegisteredToast: string;
  completeAgentRegistrationError: string;
  createPairingError: string;
  importRegistrationError: string;
  missingRegistrationUrlError: string;
  registrationIncompleteError: string;
};

type UseSettingsOwnedAgentsOptions = {
  api: ApiClient;
  canRegisterByVerification: boolean;
  enabled: boolean;
  messages: SettingsOwnedAgentsMessages;
  onStartVerification?: () => void;
};

function getAgentRegistrationBlockReason(input: {
  activeAgentCount: number;
  canRegisterByVerification: boolean;
  enabled: boolean;
  loading: boolean;
}): "tab_disabled" | "loading" | "unique_human_unverified" | "active_agent_exists" | "ready" {
  if (!input.enabled) return "tab_disabled";
  if (input.loading) return "loading";
  if (!input.canRegisterByVerification) return "unique_human_unverified";
  if (input.activeAgentCount > 0) return "active_agent_exists";
  return "ready";
}

function unixToIso(value: number | null | undefined): string | null {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

export function useSettingsOwnedAgents({
  api,
  canRegisterByVerification,
  enabled,
  messages,
  onStartVerification,
}: UseSettingsOwnedAgentsOptions): SettingsPageProps["agents"] {
  const [ownedAgents, setOwnedAgents] = React.useState<SettingsPageProps["agents"]["items"]>([]);
  const [agentsLoading, setAgentsLoading] = React.useState(false);
  const [agentsState, setAgentsState] = React.useState<SettingsPageProps["agents"]["registrationState"]>({ kind: "idle" });
  const [agentImportValue, setAgentImportValue] = React.useState("");
  const pendingAgentRegistrationRef = React.useRef<PendingAgentRegistration | null>(null);
  const pendingPairingHandleRef = React.useRef<string | null>(null);

  const loadOwnedAgents = React.useCallback(async (input?: { cancelled?: () => boolean }) => {
    logger.debug("[settings:agents] loading owned agents");
    setAgentsLoading(true);
    try {
      const result = await api.agents.list();
      if (input?.cancelled?.()) return;
      const items = result.items.map(mapApiUserAgentToOwnedAgent);
      const statuses = items.map((agent) => agent.status).join(",") || "none";
      logger.info(`[settings:agents] loaded count=${items.length} active=${items.filter((agent) => agent.status === "active").length} statuses=${statuses}`);
      setOwnedAgents(items);
      return items;
    } finally {
      if (!input?.cancelled?.()) {
        setAgentsLoading(false);
      }
    }
  }, [api.agents]);

  React.useEffect(() => {
    if (!enabled) {
      logger.debug("[settings:agents] hook disabled", { enabled });
      return;
    }

    let cancelled = false;
    setOwnedAgents([]);
    setAgentsState({ kind: "idle" });

    void loadOwnedAgents({ cancelled: () => cancelled })
      .catch((error: unknown) => {
        if (cancelled) return;
        logger.warn("[settings] owned agents load failed", error);
        setAgentsState({
          kind: "error",
          message: formatOwnedAgentsLoadError(error, messages),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, loadOwnedAgents, messages]);

  const activeAgentCount = ownedAgents.filter((agent) => agent.status === "active").length;
  const canRegister = !agentsLoading
    && canRegisterByVerification
    && activeAgentCount === 0;
  const registrationUnavailableReason: SettingsPageProps["agents"]["registrationUnavailableReason"] =
    canRegister || agentsLoading
      ? undefined
      : !canRegisterByVerification
        ? "verification_required"
        : activeAgentCount > 0
          ? "active_agent_exists"
          : undefined;
  const registrationBlockReason = getAgentRegistrationBlockReason({
    activeAgentCount,
    canRegisterByVerification,
    enabled,
    loading: agentsLoading,
  });

  React.useEffect(() => {
    logger.info(`[settings:agents] gate reason=${registrationBlockReason} canRegister=${canRegister} verification=${canRegisterByVerification} loading=${agentsLoading} active=${activeAgentCount} total=${ownedAgents.length} state=${agentsState.kind}`);
  }, [
    activeAgentCount,
    agentsLoading,
    agentsState.kind,
    canRegister,
    canRegisterByVerification,
    enabled,
    ownedAgents.length,
    registrationBlockReason,
  ]);

  const completePendingAgentRegistration = React.useCallback(async (input?: { silent?: boolean }) => {
    const pendingRegistration = pendingAgentRegistrationRef.current;
    if (!pendingRegistration) {
      return;
    }

    try {
      const completedSession = await api.agents.completeOwnershipSession(pendingRegistration.sessionId, {});

      if (completedSession.status === "verified" && completedSession.agent) {
        await api.agents.claimHandle(completedSession.agent, {
          desired_label: pendingRegistration.handleLabel,
        });
        const now = new Date().toISOString();
        await saveStoredOwnedAgentKey({
          agentId: completedSession.agent,
          displayName: pendingRegistration.displayName,
          ownershipProvider: "clawkey",
          publicKeyPem: pendingRegistration.publicKeyPem,
          privateKeyPem: pendingRegistration.privateKeyPem,
          createdAt: now,
          updatedAt: now,
        });
        pendingAgentRegistrationRef.current = null;
        await loadOwnedAgents();
        setAgentsState({ kind: "idle" });
        toast.success(messages.agentRegisteredToast);
        return;
      }

      if (completedSession.status === "failed" || completedSession.status === "expired" || completedSession.status === "cancelled") {
        pendingAgentRegistrationRef.current = null;
        setAgentsState({
          kind: "error",
          message: messages.registrationIncompleteError,
        });
      }
    } catch (error: unknown) {
      if (input?.silent) {
        return;
      }
      setAgentsState({
        kind: "error",
        message: getErrorMessage(error, messages.completeAgentRegistrationError),
      });
    }
  }, [api.agents, loadOwnedAgents, messages]);

  const handleUpdateAgentName = React.useCallback(async (agentId: string, nextDisplayName: string) => {
    const updatedAgent = await api.agents.update(agentId, {
      display_name: nextDisplayName.trim(),
    });

    setOwnedAgents((current) => current.map((agent) => (
      agent.agentId === updatedAgent.id ? mapApiUserAgentToOwnedAgent(updatedAgent) : agent
    )));

    const storedKey = await findStoredOwnedAgentKey(agentId);
    if (storedKey) {
      await saveStoredOwnedAgentKey({
        ...storedKey,
        displayName: updatedAgent.display_name,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [api.agents]);

  const handleUpdateAgentHandle = React.useCallback(async (agentId: string, nextHandleLabel: string) => {
    await api.agents.claimHandle(agentId, {
      desired_label: nextHandleLabel.trim(),
    });
    await loadOwnedAgents();
  }, [api.agents, loadOwnedAgents]);

  React.useEffect(() => {
    if (agentsState.kind !== "awaiting_owner" && agentsState.kind !== "pairing_code") {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (agentsState.kind === "awaiting_owner") {
        void completePendingAgentRegistration({ silent: true });
      }
      void loadOwnedAgents()
        .then(async (items) => {
          const activeAgent = items?.find((agent) => agent.status === "active");
          if (activeAgent && pendingPairingHandleRef.current?.trim()) {
            const pendingHandle = pendingPairingHandleRef.current.trim();
            await handleUpdateAgentHandle(activeAgent.agentId, pendingHandle);
            const pendingDisplayName = displayNameFromAgentHandle(pendingHandle);
            if (activeAgent.displayName !== pendingDisplayName) {
              await handleUpdateAgentName(activeAgent.agentId, pendingDisplayName);
            }
            await loadOwnedAgents();
            pendingPairingHandleRef.current = null;
          }

          if (activeAgent) {
            pendingAgentRegistrationRef.current = null;
            setAgentsState({ kind: "idle" });
          }
        })
        .catch((error: unknown) => {
          logger.warn("[settings] agent pairing poll failed", error);
        });
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [agentsState, completePendingAgentRegistration, handleUpdateAgentHandle, handleUpdateAgentName, loadOwnedAgents]);

  const handleStartAgentPairing = React.useCallback(async (handleLabel: string) => {
    logger.info(`[settings:agents] pairing create handle=${handleLabel.trim()}`);
    setAgentsState({ kind: "verifying" });
    pendingPairingHandleRef.current = handleLabel.trim();
    try {
      const pairing = await api.agents.createPairing();
      logger.info(`[settings:agents] pairing created code=${pairing.pairing_code} expiresAt=${pairing.expires_at}`);
      setAgentsState({
        kind: "pairing_code",
        pairingCode: pairing.pairing_code,
        expiresAt: unixToIso(pairing.expires_at) ?? "",
      });
    } catch (error: unknown) {
      logger.warn("[settings:agents] pairing code creation failed", error);
      pendingPairingHandleRef.current = null;
      setAgentsState({
        kind: "error",
        message: getErrorMessage(error, messages.createPairingError),
      });
    }
  }, [api.agents, messages.createPairingError]);

  const startAgentRegistration = React.useCallback(async (input: {
    agentChallenge: ImportedOpenClawBundle["agent_challenge"];
    handleLabel: string;
    privateKeyPem: string;
    publicKeyPem: string;
  }) => {
    const displayName = displayNameFromAgentHandle(input.handleLabel);
    const sessionResult = await api.agents.startOwnershipSession({
      session_kind: "register",
      ownership_provider: "clawkey",
      display_name: displayName,
      agent_challenge: {
        device: input.agentChallenge.device_id,
        public_key: input.agentChallenge.public_key,
        message: input.agentChallenge.message,
        signature: input.agentChallenge.signature,
        timestamp: input.agentChallenge.timestamp,
      },
    });

    const launch = sessionResult.launch?.clawkey_registration;
    if (!launch) {
      throw new Error(messages.missingRegistrationUrlError);
    }

    pendingAgentRegistrationRef.current = {
      sessionId: sessionResult.id,
      handleLabel: input.handleLabel,
      displayName,
      publicKeyPem: input.publicKeyPem,
      privateKeyPem: input.privateKeyPem,
    };

    setAgentsState({
      kind: "awaiting_owner",
      registrationUrl: launch.registration_url,
      sessionId: launch.session,
      expiresAt: unixToIso(launch.expires_at),
    });
  }, [api.agents, messages.missingRegistrationUrlError]);

  const handleImportAgentRegistration = React.useCallback(async (handleLabel: string) => {
    setAgentsState({ kind: "verifying" });

    try {
      const importedBundle = parseImportedOpenClawBundle(agentImportValue, messages);

      await startAgentRegistration({
        agentChallenge: importedBundle.agent_challenge,
        handleLabel,
        publicKeyPem: importedBundle.public_key_pem,
        privateKeyPem: importedBundle.private_key_pem,
      });
    } catch (error: unknown) {
      setAgentsState({
        kind: "error",
        message: getErrorMessage(error, messages.importRegistrationError),
      });
      pendingAgentRegistrationRef.current = null;
    }
  }, [agentImportValue, messages, startAgentRegistration]);

  return {
    items: ownedAgents,
    canRegister,
    importValue: agentImportValue,
    loading: agentsLoading,
    registrationUnavailableReason,
    registrationState: agentsState,
    onStartPairing: (nextHandleLabel) => {
      void handleStartAgentPairing(nextHandleLabel);
    },
    onImportRegistration: (nextHandleLabel) => {
      void handleImportAgentRegistration(nextHandleLabel);
    },
    onImportValueChange: setAgentImportValue,
    onCheckRegistration: () => {
      void completePendingAgentRegistration();
    },
    onStartVerification,
    onUpdateHandle: handleUpdateAgentHandle,
    onUpdateName: handleUpdateAgentName,
  };
}
