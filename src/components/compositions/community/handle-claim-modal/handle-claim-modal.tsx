"use client";

import {
  At,
  Check,
  CheckCircle,
  Prohibit,
  X,
} from "@phosphor-icons/react";

import { Spinner } from "@/components/primitives/spinner";
import * as React from "react";

import { Modal } from "@/components/compositions/system/modal/modal";
import {
  StandardModalContent,
  StandardModalHeader,
  StandardModalIconBadge,
} from "@/components/compositions/system/modal/standard-modal-layout";
import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Type, typeVariants } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";

import type {
  HandleClaimModalProps,
  HandleClaimPhase,
  HandleSearchResult,
} from "./handle-claim-modal.types";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function isActionEnabled(
  phase: HandleClaimPhase,
  result: HandleSearchResult | undefined,
): boolean {
  if (phase === "success") return true;
  if (phase === "processing") return false;
  if (!result) return false;
  if (result.availability !== "available") return false;
  return true;
}

function resolvePrimaryLabel(
  phase: HandleClaimPhase,
  result: HandleSearchResult | undefined,
): string {
  if (phase === "success") return "Done";
  if (phase === "processing") return "Claiming…";
  if (!result || result.availability !== "available") return "Claim";
  if (result.priceCents === null || result.priceCents === 0) return "Claim for free";
  return `Claim for ${formatCents(result.priceCents)}`;
}

export function resolveCommunityHandleSuffix(
  communityHandle: string,
  communityRouteLabel: string | null | undefined,
): string {
  const normalizedRoute = communityRouteLabel?.trim().replace(/^\/+|\/+$/gu, "");
  const routeRoot = normalizedRoute?.toLowerCase().startsWith("c/")
    ? normalizedRoute.slice(2)
    : normalizedRoute;
  const rawRoot = routeRoot || communityHandle;
  const isSpaces = rawRoot.startsWith("@");
  const root = rawRoot.replace(/^@/u, "") || communityHandle.replace(/^@/u, "");
  return `${isSpaces ? "@" : "."}${root}`;
}

function stripCommunityHandleSuffix(value: string, suffix: string): string {
  return value.toLowerCase().endsWith(suffix.toLowerCase())
    ? value.slice(0, -suffix.length)
    : value;
}

export function resolveQualifiedCommunityHandle(value: string, suffix: string): string {
  const label = stripCommunityHandleSuffix(value.trim(), suffix);
  return label ? `${label}${suffix}` : suffix;
}

function SearchResultFeedback({
  copy,
  onClaimGateAction,
  onClaimGateRecheck,
  phase,
  result,
}: {
  copy: ReturnType<typeof getLocaleMessages<"gates">>["handleClaims"];
  onClaimGateAction?: (action: "self" | "wallet") => void;
  onClaimGateRecheck?: () => void;
  phase: HandleClaimPhase;
  result: HandleSearchResult | undefined;
}) {
  if (phase === "quoting") {
    return (
      <FormNote className="inline-flex items-center gap-2">
        <Spinner className="size-4" />
        Checking availability…
      </FormNote>
    );
  }

  if (!result) return null;

  if (result.availability === "available") {
    return (
      <FormNote className="inline-flex items-center gap-2">
        <Check className="size-4" weight="bold" />
        Available
      </FormNote>
    );
  }

  if (result.availability === "taken") {
    return (
      <FormNote className="inline-flex items-center gap-2" tone="warning">
        <X className="size-4" weight="bold" />
        {result.reason ?? "This name is already taken"}
      </FormNote>
    );
  }

  if (result.availability === "reserved") {
    return (
      <FormNote className="inline-flex items-center gap-2" tone="warning">
        <Prohibit className="size-4" weight="bold" />
        {result.reason ?? "This name is reserved"}
      </FormNote>
    );
  }

  if (result.availability === "already_claimed_by_viewer") {
    return (
      <FormNote className="inline-flex items-center gap-2">
        <Check className="size-4" weight="bold" />
        {result.reason ?? "You already claimed this name"}
      </FormNote>
    );
  }

  if (result.availability === "viewer_has_claim") {
    return (
      <FormNote className="inline-flex items-center gap-2" tone="warning">
        <Prohibit className="size-4" weight="bold" />
        {result.reason ?? "You already have a name in this community"}
      </FormNote>
    );
  }

  if (result.availability === "namespace_unavailable") {
    return (
      <FormNote className="inline-flex items-center gap-2" tone="warning">
        <X className="size-4" weight="bold" />
        {result.reason ?? "Names are not available for this community"}
      </FormNote>
    );
  }

  if (result.claimGateSatisfied === false && (result.claimGateRequirements?.length ?? 0) > 0) {
    return (
      <div className="space-y-1">
        <FormNote className="inline-flex items-center gap-2" tone="warning">
          <Prohibit className="size-4" weight="bold" />
          {copy.requires}
        </FormNote>
        <ul className="ms-6 list-disc space-y-0.5">
          {result.claimGateRequirements?.map((requirement) => (
            <li className={cn(typeVariants({ variant: "caption" }))} key={requirement}>
              {requirement}
            </li>
          ))}
        </ul>
        {(result.claimGateActions?.length ?? 0) > 0 || onClaimGateRecheck ? (
          <div className="ms-6 flex flex-wrap gap-2 pt-2">
            {result.claimGateActions?.map((action) => (
              <Button
                key={action}
                onClick={() => onClaimGateAction?.(action)}
                size="sm"
                variant="outline"
              >
                {action === "self" ? copy.verifyWithSelf : copy.connectWallet}
              </Button>
            ))}
            {onClaimGateRecheck ? (
              <Button onClick={onClaimGateRecheck} size="sm" variant="secondary">
                {copy.checkAgain}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <FormNote className="inline-flex items-center gap-2" tone="warning">
      <X className="size-4" weight="bold" />
      {result.reason ?? "Unavailable"}
    </FormNote>
  );
}

export function HandleClaimModal({
  open,
  onOpenChange,
  communityHandle,
  communityRouteLabel,
  namespaceOptions = [],
  selectedNamespaceVerification,
  onNamespaceChange,
  phase,
  searchValue,
  onSearchChange,
  searchResult,
  confirmedDiscountPercent,
  selfVerificationSavingsPercent,
  onSelfVerificationClick,
  onWalletConnectionClick,
  onClaimGateRecheck,
  onClaim,
  onNotNow,
  processing = false,
  error,
  claimedLabel,
  forceMobile,
  benefits = [],
  walletBalanceCents,
  onAddFunds,
}: HandleClaimModalProps) {
  const { dir, locale } = useUiLocale();
  const claimGateCopy = React.useMemo(
    () => getLocaleMessages(locale, "gates").handleClaims,
    [locale],
  );
  const isSuccess = phase === "success";
  const isProcessing = phase === "processing";
  const showInput = !isSuccess;
  const showNotNow = !isSuccess && !isProcessing;
  const selectedNamespace = namespaceOptions.find(
    (option) => option.namespaceVerification === selectedNamespaceVerification,
  );
  const effectiveRouteLabel = selectedNamespace?.routeLabel ?? communityRouteLabel;
  const communityHandleSuffix = resolveCommunityHandleSuffix(
    communityHandle,
    effectiveRouteLabel,
  );
  const qualifiedClaimedLabel = resolveQualifiedCommunityHandle(
    claimedLabel ?? searchValue,
    communityHandleSuffix,
  );

  const priceCents = searchResult?.priceCents ?? 0;
  const needsFunds = priceCents > 0;
  const hasBalance = typeof walletBalanceCents === "number";
  const shortfallCents = hasBalance ? Math.max(0, priceCents - walletBalanceCents) : 0;
  const isInsufficientFunds = needsFunds && hasBalance && shortfallCents > 0;

  const actionEnabled = isInsufficientFunds
    ? Boolean(onAddFunds)
    : isActionEnabled(phase, searchResult);

  const primaryLabel = isInsufficientFunds
    ? `Add ${formatCents(shortfallCents)}`
    : resolvePrimaryLabel(phase, searchResult);

  const hasSelfVerificationNudge =
    typeof selfVerificationSavingsPercent === "number" &&
    selfVerificationSavingsPercent > 0;
  const selfVerificationLabel = hasSelfVerificationNudge
    ? `Save up to ${selfVerificationSavingsPercent}% with Self.xyz`
    : null;

  const displayValue = stripCommunityHandleSuffix(searchValue, communityHandleSuffix);

  const handleInputChange = (value: string) => {
    onSearchChange(stripCommunityHandleSuffix(value, communityHandleSuffix));
  };

  const handlePrimaryClick = () => {
    if (!actionEnabled || isProcessing) return;
    if (isInsufficientFunds && onAddFunds) {
      onAddFunds();
      return;
    }
    onClaim();
  };

  return (
    <Modal forceMobile={forceMobile} onOpenChange={onOpenChange} open={open}>
      <StandardModalContent>
        <StandardModalHeader
          description={
            isSuccess
              ? `Claim recorded for ${qualifiedClaimedLabel}.`
              : `Choose a name in this community.`
          }
          icon={
            <StandardModalIconBadge>
              {isSuccess ? (
                <CheckCircle className="size-8" weight="duotone" />
              ) : (
                <At className="size-8" weight="duotone" />
              )}
            </StandardModalIconBadge>
          }
          title={isSuccess ? "Name claimed" : `Claim a name`}
        />

        {!isSuccess && benefits.length > 0 ? (
          <div className="mt-5 space-y-2">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-muted-foreground" weight="bold" />
                <Type as="span" variant="body">
                  {benefit}
                </Type>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-5 space-y-5">
          {isSuccess ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border-soft bg-muted/30 p-4">
                <Check className="size-5 shrink-0 text-foreground" weight="bold" />
                <Type as="p" className="min-w-0 font-mono text-lg" variant="body-strong">
                  {qualifiedClaimedLabel}
                </Type>
              </div>

              <Button
                className="h-14 w-full"
                onClick={() => onOpenChange(false)}
              >
                {primaryLabel}
              </Button>
            </div>
          ) : (
            <>
              {namespaceOptions.length > 1 && selectedNamespaceVerification && onNamespaceChange ? (
                <Select
                  disabled={isProcessing}
                  onValueChange={onNamespaceChange}
                  value={selectedNamespaceVerification}
                >
                  <SelectTrigger aria-label="Name namespace" className="h-12 rounded-[var(--radius-lg)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {namespaceOptions.map((option) => (
                      <SelectItem
                        disabled={option.disabled}
                        key={option.namespaceVerification}
                        value={option.namespaceVerification}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              <div className="space-y-3">
                <div
                  className="flex h-16 items-center gap-2 rounded-full border border-input bg-background px-5 shadow-sm focus-within:border-border focus-within:ring-1 focus-within:ring-border-soft"
                  dir="ltr"
                >
                  <Input
                    className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-start shadow-none focus-visible:border-transparent focus-visible:ring-0 disabled:opacity-80"
                    dir="ltr"
                    disabled={isProcessing}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="yourname"
                    size="lg"
                    value={displayValue}
                  />
                  <span className="shrink-0 font-mono text-lg text-muted-foreground">
                    {communityHandleSuffix}
                  </span>
                </div>

                <SearchResultFeedback
                  copy={claimGateCopy}
                  onClaimGateAction={(action) => {
                    if (action === "self") onSelfVerificationClick?.();
                    if (action === "wallet") onWalletConnectionClick?.();
                  }}
                  onClaimGateRecheck={onClaimGateRecheck}
                  phase={phase}
                  result={searchResult}
                />
              </div>

              {searchResult && searchResult.availability === "available" && selfVerificationLabel && onSelfVerificationClick ? (
                <div className="flex flex-col gap-3 rounded-lg border border-border-soft bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <Type as="p" className="min-w-0" variant="body-strong">
                    {selfVerificationLabel}
                  </Type>
                  <Button
                    className="w-full sm:w-auto"
                    onClick={onSelfVerificationClick}
                    size="sm"
                    variant="outline"
                  >
                    Verify
                  </Button>
                </div>
              ) : null}

              {isInsufficientFunds ? (
                <FormNote tone="warning">
                  You need {formatCents(shortfallCents)} more to claim this name.
                </FormNote>
              ) : null}

              {error ? <FormNote tone="warning">{error}</FormNote> : null}

              <div className={showNotNow ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
                {showNotNow ? (
                  <Button
                    className="h-14 w-full"
                    disabled={isProcessing}
                    onClick={onNotNow}
                    variant="outline"
                  >
                    Not now
                  </Button>
                ) : null}
                <Button
                  className="h-14 w-full"
                  disabled={!actionEnabled}
                  loading={isProcessing}
                  onClick={handlePrimaryClick}
                >
                  {primaryLabel}
                </Button>
              </div>
            </>
          )}
        </div>
      </StandardModalContent>
    </Modal>
  );
}
