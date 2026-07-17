"use client";
import type {
  JoinEligibility,
  MembershipGateSummary,
} from "@pirate/api-contracts";
import { ArrowSquareOut } from "@phosphor-icons/react";

import { ActionCalloutPanel } from "@/components/compositions/community/action-callout-panel/action-callout-panel";
import {
  VerificationIconBadge,
  type VerificationModalIconKind,
} from "@/components/compositions/verification/verification-modal-header/verification-modal-header";
import { Button } from "@/components/primitives/button";
import { VerificationAppDownloadLinks } from "@/components/compositions/verification/verification-app-download-links/verification-app-download-links";
import { FormNote } from "@/components/primitives/form-layout";
import { Spinner } from "@/components/primitives/spinner";
import {
  formatGateRequirement,
  getGateFailureMessage,
  getJoinCtaLabel,
  hasOnlyWalletGateRequirements,
  isJoinSurfaceGate,
  isJoinCtaActionable,
  resolveSuggestedVerificationProvider,
} from "@/lib/identity-gates";
import { Type } from "@/components/primitives/type";
import { getLocaleMessages } from "@/locales";
import { isUiLocaleCode } from "@/lib/ui-locale-core";
import { interpolateMessage } from "@/lib/route-messages";
import type { CommunityGateRequirementGroup } from "@/components/compositions/community/gate-requirements.types";

type VerificationPrompt = {
  title: string;
  description: string;
  actionLabel: string;
  href?: string | null;
};

export interface CommunityMembershipGatePanelProps {
  gates: MembershipGateSummary[];
  eligibility?: JoinEligibility | null;
  joinLoading?: boolean;
  joinDisabled?: boolean;
  joinRequested?: boolean;
  joinError?: string | null;
  mode?: "all" | "any" | null;
  requirementGroups?: CommunityGateRequirementGroup[];
  verificationPrompt?: VerificationPrompt | null;
  verificationLoading?: boolean;
  verificationError?: string | null;
  locale?: string | null;
  onJoin?: () => void;
  onCancelVerification?: () => void;
}

export type RequirementGroupSummary = {
  mode: "all" | "any";
  text: string;
};

function formatRequirementGroupSummaries(input: {
  groups?: CommunityGateRequirementGroup[];
  listFormatLocale: Intl.LocalesArgument;
  locale: string;
}): RequirementGroupSummary[] {
  return (input.groups ?? []).flatMap((group) => {
    const labels = Array.from(new Set(
      group.requirements.filter(isJoinSurfaceGate).flatMap((gate) => {
        const label = formatGateRequirement(gate, { locale: input.locale });
        return label ? [label] : [];
      }),
    ));
    if (labels.length === 0) return [];
    return [{
      mode: group.mode,
      text: labels.length === 1
        ? labels[0]
        : new Intl.ListFormat(input.listFormatLocale, {
            style: "long",
            type: group.mode === "any" ? "disjunction" : "conjunction",
          }).format(labels),
    }];
  });
}

export function formatRequirementSummarySentence(
  groups: RequirementGroupSummary[],
  listFormatLocale: Intl.LocalesArgument,
  copy: ReturnType<typeof getLocaleMessages<"gates">>["panel"],
): string | null {
  if (groups.length === 0) return null;
  const formatGroupList = (items: string[]) => items.length > 1
    ? new Intl.ListFormat(listFormatLocale, { style: "long", type: "conjunction" }).format(items)
    : items[0] ?? "";
  const requiredTexts = groups.filter((group) => group.mode === "all").map((group) => group.text);
  const alternativeTexts = groups.filter((group) => group.mode === "any").map((group) => group.text);
  const requiredText = formatGroupList(requiredTexts);
  const alternativeText = formatGroupList(alternativeTexts);

  if (requiredText && alternativeText) {
    return interpolateMessage(copy.requirementSummaryMixed, {
      alternativeRequirements: alternativeText,
      requiredRequirements: requiredText,
    });
  }
  if (alternativeTexts.length === 1) {
    return interpolateMessage(copy.requirementSummaryAny, { requirements: alternativeText });
  }
  if (alternativeTexts.length > 1) {
    return interpolateMessage(copy.requirementSummaryAnyGroups, { requirements: alternativeText });
  }
  return requiredText
    ? interpolateMessage(copy.requirementSummaryAll, { requirements: requiredText })
    : null;
}

function formatRequirementLabel(
  gate: MembershipGateSummary,
  locale: string,
): string {
  return formatGateRequirement(gate, { locale });
}

function getEligibilityText(
  eligibility: JoinEligibility | null | undefined,
  gates: MembershipGateSummary[],
  locale: string,
  copy: ReturnType<typeof getLocaleMessages<"gates">>["panel"],
): {
  description: string | null;
  title: string;
} {
  if (eligibility && hasOnlyWalletGateRequirements(eligibility)) {
    const failureReason = gates.some((gate) => gate.gate_type === "erc721_inventory_match")
      ? "erc721_inventory_match_required"
      : "erc721_holding_required";
    return {
      title: copy.gateFailedTitle,
      description: getGateFailureMessage({ failure_reason: failureReason }, { locale }) ?? copy.gateFailedDescription,
    };
  }

  switch (eligibility?.status) {
    case "joinable":
      return {
        title: copy.joinableTitle,
        description: copy.joinableDescription,
      };
    case "requestable":
      return {
        title: copy.requestableTitle,
        description: copy.requestableDescription,
      };
    case "pending_request":
      return {
        title: copy.pendingRequestTitle,
        description: copy.pendingRequestDescription,
      };
    case "verification_required":
      return {
        title: copy.verificationRequiredTitle,
        description: copy.verificationRequiredDescription,
      };
    case "gate_failed":
      return {
        title: copy.gateFailedTitle,
        description: copy.gateFailedDescription,
      };
    case "already_joined":
      return { title: copy.alreadyJoinedTitle, description: null };
    case "banned":
      return {
        title: copy.bannedTitle,
        description: copy.bannedDescription,
      };
    default:
      return {
        title: copy.defaultTitle,
        description: copy.defaultDescription,
      };
  }
}

function getPassportPrompt(
  eligibility: JoinEligibility | null | undefined,
  copy: ReturnType<typeof getLocaleMessages<"gates">>["panel"],
): VerificationPrompt | null {
  if (!eligibility) return null;
  const shouldShowPassportPrompt =
    (eligibility.status === "verification_required" &&
      resolveSuggestedVerificationProvider(eligibility) === "passport") ||
    (eligibility.status === "gate_failed" &&
      eligibility.failure_reason === "wallet_score_too_low");
  if (!shouldShowPassportPrompt) return null;

  return {
    title: copy.passportPromptTitle,
    description: copy.passportPromptDescription,
    actionLabel: copy.passportPromptActionLabel,
    href: "https://app.passport.xyz/",
  };
}

function getPanelIcon(input: {
  eligibility: JoinEligibility | null | undefined;
  isInlineVerificationRequired: boolean;
  isProofOfWorkRequired: boolean;
  isVeryVerificationRequired: boolean;
  passportPrompt: VerificationPrompt | null;
}): VerificationModalIconKind | null {
  if (input.passportPrompt) return "passport";
  if (input.isProofOfWorkRequired) return "blocked";
  if (input.isVeryVerificationRequired) return "very";
  if (input.isInlineVerificationRequired) return "self";

  switch (input.eligibility?.status) {
    case "joinable":
    case "requestable":
      return "join";
    case "pending_request":
      return "pending";
    case "already_joined":
      return "ready";
    case "gate_failed":
    case "banned":
      return "blocked";
    default:
      return null;
  }
}

export function CommunityMembershipGatePanel({
  gates,
  eligibility,
  joinLoading,
  joinDisabled,
  joinRequested,
  joinError,
  mode,
  requirementGroups,
  verificationPrompt,
  verificationLoading,
  verificationError,
  locale,
  onJoin,
  onCancelVerification,
}: CommunityMembershipGatePanelProps) {
  const resolvedLocale = locale && isUiLocaleCode(locale) ? locale : "en";
  const gatesCopy = getLocaleMessages(resolvedLocale, "gates");
  const panelCopy = gatesCopy.panel;
  const joinSurfaceGates = gates.filter(isJoinSurfaceGate);
  const requirementLabels = Array.from(new Set(
    joinSurfaceGates.map((gate) => formatRequirementLabel(gate, resolvedLocale)),
  ));
  const listFormatLocale = resolvedLocale === "pseudo" ? "en" : resolvedLocale;
  const groupedRequirementSummaries = formatRequirementGroupSummaries({
    groups: requirementGroups,
    listFormatLocale,
    locale: resolvedLocale,
  });
  const groupedRequirementSentence = formatRequirementSummarySentence(
    groupedRequirementSummaries,
    listFormatLocale,
    panelCopy,
  );
  const requirementSummary = requirementLabels.length > 1 && requirementLabels.length <= 3
    ? new Intl.ListFormat(listFormatLocale, {
        style: "long",
        type: mode === "any" ? "disjunction" : "conjunction",
      }).format(requirementLabels)
    : null;
  const passportPrompt: VerificationPrompt | null = !verificationPrompt
    ? getPassportPrompt(eligibility, panelCopy)
    : null;
  const activePrompt = verificationPrompt ?? passportPrompt;
  const isVeryVerificationRequired =
    !activePrompt &&
    eligibility?.status === "verification_required" &&
    resolveSuggestedVerificationProvider(eligibility) === "very";
  const eligibilityText = getEligibilityText(eligibility, joinSurfaceGates, resolvedLocale, panelCopy);
  const isInlineVerificationRequired =
    !activePrompt &&
    eligibility?.status === "verification_required" &&
    !isVeryVerificationRequired;
  const title = isVeryVerificationRequired
    ? panelCopy.veryTitle
    : isInlineVerificationRequired
      ? panelCopy.selfTitle
      : (activePrompt?.title ??
        (joinRequested ? panelCopy.pendingRequestTitle : eligibilityText.title));
  const description = isVeryVerificationRequired
    ? null
    : isInlineVerificationRequired
      ? panelCopy.selfDescription
      : (activePrompt?.description ??
        (joinRequested
          ? panelCopy.requestSubmittedDescription
          : (joinError ?? eligibilityText.description)));
  const showEligibilityAction =
    eligibility &&
    !activePrompt &&
    isJoinCtaActionable(eligibility) &&
    eligibility.status !== "gate_failed" &&
    eligibility.status !== "already_joined" &&
    eligibility.status !== "banned";
  const showPromptAction = activePrompt?.href;
  const panelIcon = getPanelIcon({
    eligibility,
    isInlineVerificationRequired,
    isProofOfWorkRequired: false,
    isVeryVerificationRequired,
    passportPrompt,
  });
  const action = showPromptAction ? (
    <Button
      asChild
      className="h-14 w-full shrink-0 px-9 text-lg shadow-sm md:w-auto md:min-w-44"
      size="lg"
      variant="secondary"
    >
      <a
        className="gap-2"
        href={activePrompt.href ?? undefined}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span>{activePrompt.actionLabel}</span>
        <ArrowSquareOut className="size-5" />
      </a>
    </Button>
  ) : showEligibilityAction ? (
    <Button
      className="h-14 w-full shrink-0 px-9 text-lg shadow-sm md:w-auto md:min-w-44"
      loading={joinLoading}
      disabled={joinDisabled}
      onClick={onJoin}
      size="lg"
    >
      {getJoinCtaLabel(eligibility, { locale })}
    </Button>
  ) : null;

  return (
    <ActionCalloutPanel
      action={action}
      description={description}
      icon={panelIcon ? <VerificationIconBadge icon={panelIcon} /> : null}
      title={title}
    >
      {isVeryVerificationRequired ? (
        <VerificationAppDownloadLinks
          app="very"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-muted-foreground"
          variant="inline"
        />
      ) : null}

      {groupedRequirementSentence ? (
        <Type
          as="p"
          className="mt-4 text-muted-foreground"
          variant="caption"
        >
          {groupedRequirementSentence}
        </Type>
      ) : requirementSummary ? (
        <Type
          as="p"
          className="mt-4 text-muted-foreground"
          variant="caption"
        >
          {requirementSummary}
        </Type>
      ) : requirementLabels.length > 0 ? (
        <ul aria-label="Membership requirements" className="mt-4 space-y-2">
          {requirementLabels.map((label) => (
            <Type
              as="li"
              className="flex items-start gap-2 text-muted-foreground"
              key={label}
              variant="caption"
            >
              <span aria-hidden="true">-</span>
              <span>{label}</span>
            </Type>
          ))}
        </ul>
      ) : null}

      {verificationLoading || onCancelVerification || verificationError ? (
        <div className="mt-4 flex flex-col gap-3">
          {verificationLoading ? (
            <Type
              as="div"
              variant="caption"
              className="flex items-center gap-2 "
            >
              <Spinner className="size-4" />
              <span>{panelCopy.processingVerification}</span>
            </Type>
          ) : null}
          {onCancelVerification ? (
            <Button
              className="w-fit"
              variant="ghost"
              onClick={onCancelVerification}
            >
              {panelCopy.cancel}
            </Button>
          ) : null}
          {verificationError ? (
            <FormNote tone="warning">{verificationError}</FormNote>
          ) : null}
        </div>
      ) : null}
    </ActionCalloutPanel>
  );
}
