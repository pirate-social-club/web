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
import { Type, typeVariants } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
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

function resolveCommunityRouteLabel(
  communityHandle: string,
  communityRouteLabel: string | null | undefined,
): string {
  const normalized = communityRouteLabel?.trim().replace(/^\/+/u, "");
  if (normalized) {
    return normalized.toLowerCase().startsWith("c/")
      ? `/${normalized}`
      : `/c/${normalized}`;
  }
  return `/c/${communityHandle}`;
}

function SearchResultFeedback({
  phase,
  result,
}: {
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
  phase,
  searchValue,
  onSearchChange,
  searchResult,
  confirmedDiscountPercent,
  selfVerificationSavingsPercent,
  onSelfVerificationClick,
  onClaim,
  onNotNow,
  processing = false,
  error,
  claimedLabel,
  forceMobile,
  benefits = ["Accessible in Freedom Browser", "Share for payments", "Sell it"],
  walletBalanceCents,
  onAddFunds,
}: HandleClaimModalProps) {
  const { dir } = useUiLocale();
  const isSuccess = phase === "success";
  const isProcessing = phase === "processing";
  const showInput = !isSuccess;
  const showNotNow = !isSuccess && !isProcessing;
  const successCommunityLabel = resolveCommunityRouteLabel(
    communityHandle,
    communityRouteLabel,
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

  const displayValue = searchValue.endsWith(`@${communityHandle}`)
    ? searchValue.slice(0, -communityHandle.length - 1)
    : searchValue;

  const handleInputChange = (value: string) => {
    const base = value.replace(new RegExp(`@${communityHandle}$`, "i"), "");
    onSearchChange(base);
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
              ? `Claimed! Your name is ready to use in ${successCommunityLabel}.`
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
                  {claimedLabel ?? searchValue}
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
                    @{communityHandle}
                  </span>
                </div>

                <SearchResultFeedback phase={phase} result={searchResult} />
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
