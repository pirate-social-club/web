"use client";

import * as React from "react";

import { useApi } from "@/lib/api";
import { normalizeHandleLabel, isValidHandleSyntax, formatHandle } from "@/lib/global-handle";
import type { ApiError } from "@/lib/api/client";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

export type HandleRenameState =
  | { kind: "idle" }
  | { kind: "available"; freeRenameRemaining: boolean }
  | { kind: "unavailable"; reason: string }
  | { kind: "invalid"; reason: string }
  | { kind: "checking" }
  | { kind: "saving" }
  | { kind: "error"; message: string }
  | { kind: "success"; newHandle: string };

export type UseGlobalHandleFlowOptions = {
  currentHandleLabel: string;
  onRenamed?: (newLabel: string) => void | Promise<void>;
};

export type UseGlobalHandleFlowReturn = {
  draft: string;
  normalized: string;
  preview: string;
  state: HandleRenameState;
  clearDraft: () => void;
  checkAvailability: () => void;
  resetState: () => void;
  submitRename: () => Promise<void>;
  setDraft: (value: string) => void;
};

export function useGlobalHandleFlow({
  currentHandleLabel,
  onRenamed,
}: UseGlobalHandleFlowOptions): UseGlobalHandleFlowReturn {
  const api = useApi();
  const { locale } = useUiLocale();
  const copy = React.useMemo(() => getLocaleMessages(locale, "routes").settings, [locale]);
  const [draft, setDraft] = React.useState("");
  const [state, setState] = React.useState<HandleRenameState>({ kind: "idle" });
  const checkRequestIdRef = React.useRef(0);

  const currentStem = currentHandleLabel
    ? normalizeHandleLabel(currentHandleLabel)
    : "";

  const normalized = normalizeHandleLabel(draft);
  const preview = formatHandle(normalized);
  const isNoop = normalized === currentStem || !normalized;
  const isValidSyntax = isValidHandleSyntax(normalized);

  React.useEffect(() => {
    setDraft("");
    setState({ kind: "idle" });
  }, [currentStem]);

  const checkAvailability = React.useCallback(() => {
    if (isNoop || !isValidSyntax) {
      if (!normalized) {
        setState({ kind: "idle" });
      } else {
        setState({ kind: "invalid", reason: copy.handleInvalidMessage });
      }
      return;
    }

    const requestId = checkRequestIdRef.current + 1;
    checkRequestIdRef.current = requestId;
    setState({ kind: "checking" });

    api.profiles
      .quoteHandleUpgrade(normalized)
      .then((quote) => {
        if (requestId !== checkRequestIdRef.current) return;
        if (!quote.eligible) {
          setState({
            kind: "unavailable",
            reason: quote.reason ?? copy.handleUnavailableMessage,
          });
        } else {
          setState({
            kind: "available",
            freeRenameRemaining: quote.price_cents === 0,
          });
        }
      })
      .catch(() => {
        if (requestId !== checkRequestIdRef.current) return;
        setState({ kind: "error", message: copy.handleCheckFailed });
      });
  }, [api, copy.handleCheckFailed, copy.handleInvalidMessage, copy.handleUnavailableMessage, isNoop, isValidSyntax, normalized]);

  const submitRename = React.useCallback(async () => {
    if (isNoop || !isValidSyntax || state.kind !== "available" || !state.freeRenameRemaining) return;

    setState({ kind: "saving" });
    try {
      const result = await api.profiles.renameHandle(normalized);
      setState({ kind: "success", newHandle: result.label });
      await onRenamed?.(result.label);
    } catch (e: unknown) {
      const apiErr = e as ApiError;
      const status = apiErr?.status;
      if (status === 409) {
        setState({ kind: "unavailable", reason: copy.handleTakenMessage });
      } else if (status === 429) {
        setState({ kind: "unavailable", reason: copy.handleRetryLaterMessage });
      } else if (status === 403) {
        setState({ kind: "unavailable", reason: copy.handleRenameUnavailableMessage });
      } else {
        setState({ kind: "error", message: apiErr?.message ?? copy.handleRenameFailed });
      }
    }
  }, [
    api,
    copy.handleRenameFailed,
    copy.handleRenameUnavailableMessage,
    copy.handleRetryLaterMessage,
    copy.handleTakenMessage,
    isNoop,
    isValidSyntax,
    normalized,
    onRenamed,
    state.kind,
  ]);

  const resetState = React.useCallback(() => {
    checkRequestIdRef.current += 1;
    setState({ kind: "idle" });
  }, []);

  const clearDraft = React.useCallback(() => {
    checkRequestIdRef.current += 1;
    setDraft("");
    setState({ kind: "idle" });
  }, []);

  return {
    draft,
    normalized,
    preview,
    state,
    clearDraft,
    checkAvailability,
    resetState,
    submitRename,
    setDraft,
  };
}
