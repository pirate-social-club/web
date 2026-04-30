import type { CommunityPreview, JoinEligibility } from "@pirate/api-contracts";

import type {
  CommunityInteractionGateAction,
  CommunityInteractionGateModalProps,
  CommunityInteractionGateRequirementStatus,
} from "@/components/compositions/community/interaction-gate-modal/community-interaction-gate-modal";
import {
  getJoinCtaLabel,
  getGateFailureMessage,
  getPassportPromptCapabilities,
  getMissingCapabilitiesFromGateEvaluation,
  getVerificationCapabilitiesForProvider,
  getVerificationPromptCopy,
  resolveSuggestedVerificationProvider,
} from "@/lib/identity-gates";
import { interpolateMessage } from "@/lib/route-messages";
import { getLocaleMessages } from "@/locales";

export type RouteKind = "community" | "home" | "post" | "public-community";
export type InteractionAction =
  | "vote_post"
  | "vote_comment"
  | "reply_post"
  | "reply_comment";
export type InteractionResult = "allowed" | "blocked";

export type CommunityGateData = {
  eligibility: JoinEligibility;
  preview: Pick<
    CommunityPreview,
    "id" | "display_name" | "membership_gate_summaries"
  >;
};

export type CommunityGateCacheEntry = {
  expiresAt: number;
  value: CommunityGateData;
};

export type InteractionGateCopy = ReturnType<
  typeof getLocaleMessages<"routes">
>["interactionGate"] & {
  locale: string;
  taskVerify: string;
};

export type ModalState = {
  description: string;
  hideCloseButtonOnMobile?: boolean;
  hideSecondaryActionOnMobile?: boolean;
  icon?: CommunityInteractionGateModalProps["icon"];
  primaryAction?: CommunityInteractionGateAction | null;
  requirements: CommunityGateData["preview"]["membership_gate_summaries"];
  requirementStatuses?: CommunityInteractionGateRequirementStatus[];
  secondaryAction?: CommunityInteractionGateAction | null;
  title: string;
};

export type BuildBlockedModalStateArgs = {
  action: InteractionAction;
  closeModal: () => void;
  gate: CommunityGateData;
  invalidateCommunityGate: (communityId: string) => void;
  interactionCopy: InteractionGateCopy;
  openCommunity: () => void;
  defaultVerificationLoadingProvider?: "self" | "very" | "passport" | null;
  startDefaultVerification?: (input: {
    gate: CommunityGateData;
    provider: "self" | "very" | "passport";
  }) => Promise<{ started: boolean }>;
};

export type PendingInteraction = {
  action: InteractionAction;
  communityId: string;
  gate: CommunityGateData;
  onAllowed: () => Promise<void> | void;
  postId?: string;
};

export type RunGatedCommunityActionParams = {
  action: InteractionAction;
  buildBlockedModalState?: (
    args: BuildBlockedModalStateArgs,
  ) => ModalState | null | undefined;
  communityId: string;
  gateData?: CommunityGateData;
  onAllowed: () => Promise<void> | void;
  postId?: string;
  resolveGateData?: () => Promise<CommunityGateData>;
};

export const COMMUNITY_GATE_CACHE_TTL_MS = 60_000;
export const SELF_INTERACTION_GATE_STORAGE_KEY =
  "pirate_pending_self_interaction_gate_session";
export const communityGateCache = new Map<string, CommunityGateCacheEntry>();
export const communityGateRequests = new Map<
  string,
  Promise<CommunityGateData>
>();

function getInteractionTaskLabel(
  action: InteractionAction,
  options: { locale: string },
): string {
  const normalized = options.locale.toLowerCase();
  if (action === "vote_post" || action === "vote_comment") {
    if (normalized.startsWith("ar")) return "التصويت";
    if (normalized.startsWith("zh")) return "投票";
    return "vote";
  }
  if (normalized.startsWith("ar")) return "الرد";
  if (normalized.startsWith("zh")) return "回复";
  return "reply";
}

export function getReadyAfterJoinDescription(
  gate: CommunityGateData,
  action: InteractionAction,
  options: { locale: string },
): string {
  const taskLabel = getInteractionTaskLabel(action, options);
  const normalized = options.locale.toLowerCase();
  if (normalized.startsWith("ar")) {
    return `يمكنك الآن ${taskLabel} في ${gate.preview.display_name}.`;
  }
  if (normalized.startsWith("zh")) {
    return `你现在可以在 ${gate.preview.display_name} ${taskLabel}。`;
  }
  return `You can now ${taskLabel} in ${gate.preview.display_name}.`;
}

export function getReadyActionLabel(
  action: InteractionAction,
  options: { locale: string },
): string {
  const normalized = options.locale.toLowerCase();
  if (action === "vote_post" || action === "vote_comment") {
    if (normalized.startsWith("ar")) return "صوّت الآن";
    if (normalized.startsWith("zh")) return "立即投票";
    return "Vote now";
  }
  if (normalized.startsWith("ar")) return "رد الآن";
  if (normalized.startsWith("zh")) return "立即回复";
  return "Reply now";
}

function getJoinActionLabel(
  eligibility: JoinEligibility,
  options: { locale: string },
): string {
  const normalized = options.locale.toLowerCase();
  const isRequestable = eligibility.status === "requestable";

  if (normalized.startsWith("ar"))
    return isRequestable ? "اطلب الانضمام" : "انضمام";
  if (normalized.startsWith("zh")) return isRequestable ? "申请加入" : "加入";
  return isRequestable ? "Request to Join" : "Join";
}

function getFailedGateRequirements(
  gate: CommunityGateData,
): CommunityGateData["preview"]["membership_gate_summaries"] {
  switch (gate.eligibility.failure_reason) {
    case "nationality_mismatch":
      return gate.preview.membership_gate_summaries.filter(
        (summary) => summary.gate_type === "nationality",
      );
    case "gender_mismatch":
      return gate.preview.membership_gate_summaries.filter(
        (summary) => summary.gate_type === "gender",
      );
    case "minimum_age_mismatch":
      return gate.preview.membership_gate_summaries.filter(
        (summary) =>
          summary.gate_type === "minimum_age" ||
          summary.gate_type === "age_over_18",
      );
    case "wallet_score_too_low":
      return gate.preview.membership_gate_summaries.filter(
        (summary) => summary.gate_type === "wallet_score",
      );
    case "erc721_holding_required":
      return gate.preview.membership_gate_summaries.filter(
        (summary) => summary.gate_type === "erc721_holding",
      );
    case "erc721_inventory_match_required":
      return gate.preview.membership_gate_summaries.filter(
        (summary) => summary.gate_type === "erc721_inventory_match",
      );
    default:
      return gate.preview.membership_gate_summaries;
  }
}

function getPassportPromptDescription(
  gate: CommunityGateData,
  fallback: string,
  options: { locale: string },
): string {
  const normalized = options.locale.toLowerCase();
  if (normalized.startsWith("ar") || normalized.startsWith("zh"))
    return fallback;

  return "Are you human? Improve your wallet score and try again.";
}

function getJoinGateTitle(
  action: InteractionAction,
  options: { locale: string },
): string | null {
  const normalized = options.locale.toLowerCase();
  if (normalized.startsWith("ar") || normalized.startsWith("zh")) return null;
  return action === "vote_post" || action === "vote_comment"
    ? "Join to Vote"
    : "Join to Reply";
}

function getRequestableDescription(
  gate: CommunityGateData,
  action: InteractionAction,
  fallback: string,
  options: { locale: string },
): string {
  const normalized = options.locale.toLowerCase();
  if (normalized.startsWith("ar") || normalized.startsWith("zh"))
    return fallback;

  const taskLabel = getInteractionTaskLabel(action, options);
  return `Request to join ${gate.preview.display_name} before you ${taskLabel}.`;
}

function gateMatchesMissingCapability(
  gate: CommunityGateData["preview"]["membership_gate_summaries"][number],
  eligibility: JoinEligibility,
): boolean {
  const missing = getMissingCapabilitiesFromGateEvaluation(eligibility);

  switch (gate.gate_type) {
    case "age_over_18":
    case "minimum_age":
      return missing.includes("age_over_18") || missing.includes("minimum_age");
    case "nationality":
      return missing.includes("nationality");
    case "gender":
      return missing.includes("gender");
    case "unique_human":
      return missing.includes("unique_human");
    case "wallet_score":
      return missing.includes("wallet_score");
    default:
      return false;
  }
}

export function getRequirementStatuses(
  gate: CommunityGateData,
  requirements = gate.preview.membership_gate_summaries,
): CommunityInteractionGateRequirementStatus[] {
  switch (gate.eligibility.status) {
    case "already_joined":
    case "joinable":
    case "requestable":
      return requirements.map(() => "met");
    case "gate_failed":
      return requirements.map(() => "unmet");
    case "verification_required":
      return requirements.map((requirement) =>
        gateMatchesMissingCapability(requirement, gate.eligibility)
          ? "unmet"
          : "met",
      );
    default:
      return requirements.map(() => "unknown");
  }
}

function getJoinableDescription(
  gate: CommunityGateData,
  action: InteractionAction,
  fallback: string,
  options: { locale: string },
): string {
  const normalized = options.locale.toLowerCase();
  if (normalized.startsWith("ar") || normalized.startsWith("zh"))
    return fallback;

  const taskLabel = getInteractionTaskLabel(action, options);
  if (gate.preview.membership_gate_summaries.length > 0) {
    return `You meet this community's requirements. Join to ${taskLabel}.`;
  }

  return fallback;
}

export function createDefaultBlockedModalState({
  action,
  closeModal,
  gate,
  interactionCopy,
  openCommunity,
  defaultVerificationLoadingProvider,
  startDefaultVerification,
}: BuildBlockedModalStateArgs): ModalState {
  const isVoteAction = action === "vote_post" || action === "vote_comment";

  switch (gate.eligibility.status) {
    case "verification_required": {
      const provider = resolveSuggestedVerificationProvider(gate.eligibility);
      if (provider === "passport") {
        const passportPrompt = getVerificationPromptCopy(
          "passport",
          getPassportPromptCapabilities(gate.eligibility),
          { locale: interactionCopy.locale },
        );
        return {
          description: getPassportPromptDescription(
            gate,
            passportPrompt.description,
            { locale: interactionCopy.locale },
          ),
          icon: "passport",
          primaryAction: {
            href: "https://app.passport.xyz/",
            label: "Visit Passport.xyz",
            rel: "noopener noreferrer",
            target: "_blank",
          },
          secondaryAction: null,
          requirements: gate.preview.membership_gate_summaries,
          requirementStatuses: getRequirementStatuses(gate),
          title: "Higher Score Required",
        };
      }
      const verificationPrompt = getVerificationPromptCopy(
        provider,
        getVerificationCapabilitiesForProvider(gate.eligibility, provider),
        { locale: interactionCopy.locale },
      );
      return {
        description: verificationPrompt.description,
        icon: provider,
        primaryAction: {
          label: verificationPrompt.actionLabel || interactionCopy.taskVerify,
          loading: defaultVerificationLoadingProvider === provider,
          onClick: async () => {
            if (startDefaultVerification) {
              await startDefaultVerification({ gate, provider });
              return;
            }
            closeModal();
            openCommunity();
          },
        },
        requirements: gate.preview.membership_gate_summaries,
        requirementStatuses: getRequirementStatuses(gate),
        title: isVoteAction
          ? interactionCopy.verifyToVoteTitle
          : interactionCopy.verifyToReplyTitle,
      };
    }
    case "joinable":
    case "requestable": {
      const ctaLabel = getJoinCtaLabel(gate.eligibility, {
        locale: interactionCopy.locale,
      });
      const defaultDescription = interpolateMessage(
        isVoteAction
          ? interactionCopy.joinToVoteDescription
          : interactionCopy.joinToReplyDescription,
        {
          communityName: gate.preview.display_name,
          joinLabel: ctaLabel,
        },
      );
      return {
        description:
          gate.eligibility.status === "joinable"
            ? getJoinableDescription(gate, action, defaultDescription, {
                locale: interactionCopy.locale,
              })
            : getRequestableDescription(gate, action, defaultDescription, {
                locale: interactionCopy.locale,
              }),
        icon: "join",
        primaryAction: {
          label: getJoinActionLabel(gate.eligibility, {
            locale: interactionCopy.locale,
          }),
          onClick: () => {
            closeModal();
            openCommunity();
          },
        },
        requirements: gate.preview.membership_gate_summaries,
        requirementStatuses: getRequirementStatuses(gate),
        title:
          getJoinGateTitle(action, { locale: interactionCopy.locale }) ??
          interpolateMessage(
            isVoteAction
              ? interactionCopy.joinToVoteTitle
              : interactionCopy.joinToReplyTitle,
            { joinLabel: ctaLabel },
          ),
      };
    }
    case "pending_request":
      return {
        description: "The moderators will review your request.",
        icon: "pending",
        requirements: gate.preview.membership_gate_summaries,
        requirementStatuses: getRequirementStatuses(gate),
        title: "Request pending",
      };
    case "gate_failed":
    case "banned":
      return {
        description:
          gate.eligibility.status === "banned"
            ? interactionCopy.bannedDescription
            : gate.eligibility.failure_reason
              ? (getGateFailureMessage(gate.eligibility, {
                  locale: interactionCopy.locale,
                }) ??
                (isVoteAction
                  ? interactionCopy.blockedVoteDescription
                  : interactionCopy.blockedReplyDescription))
              : isVoteAction
                ? interactionCopy.blockedVoteDescription
                : interactionCopy.blockedReplyDescription,
        requirements:
          gate.eligibility.status === "gate_failed"
            ? getFailedGateRequirements(gate)
            : gate.preview.membership_gate_summaries,
        requirementStatuses: getRequirementStatuses(
          gate,
          gate.eligibility.status === "gate_failed"
            ? getFailedGateRequirements(gate)
            : gate.preview.membership_gate_summaries,
        ),
        icon: "blocked",
        title: isVoteAction
          ? interactionCopy.cantVoteHereTitle
          : interactionCopy.cantReplyHereTitle,
      };
    case "already_joined":
      return {
        description: interactionCopy.readyDescription,
        icon: "ready",
        requirements: gate.preview.membership_gate_summaries,
        requirementStatuses: getRequirementStatuses(gate),
        title: interactionCopy.readyTitle,
      };
  }
}

export function getGateCacheKey(
  sessionKey: string | null,
  communityId: string,
): string {
  return `${sessionKey ?? "anon"}:${communityId}`;
}

export function resolveCommunityInteractionState(input: {
  eligibility: JoinEligibility | null | undefined;
  hasSession: boolean;
}): "allowed" | "auth" | Exclude<JoinEligibility["status"], "already_joined"> {
  if (!input.hasSession) {
    return "auth";
  }

  if (!input.eligibility) {
    return "gate_failed";
  }

  if (input.eligibility.status === "already_joined") {
    return "allowed";
  }

  return input.eligibility.status;
}


export function createCommunityBlockedModalStateFactory(options: {
  interactionCopy: InteractionGateCopy;
  joinLoading?: boolean;
  veryLoading: boolean;
  selfLoading: boolean;
  onJoin?: (gate: CommunityGateData) => Promise<void>;
  onStartVeryVerification?: () => Promise<{ started: boolean }>;
  onStartSelfVerification?: (gate: CommunityGateData) => Promise<{
    started: boolean;
    openedModal?: boolean;
    href?: string | null;
  }>;
  onRequestable?: (gate: CommunityGateData) => void;
  invalidateCommunityGate?: (communityId: string) => void;
  includeVerificationCloseAction?: boolean;
}) {
  return function buildBlockedModalState({
    action,
    closeModal,
    gate,
  }: BuildBlockedModalStateArgs): ModalState | null | undefined {
    const isVoteAction =
      action === "vote_post" || action === "vote_comment";

    if (gate.eligibility.status === "verification_required") {
      const provider = resolveSuggestedVerificationProvider(gate.eligibility);
      if (provider === "passport") {
        return undefined;
      }

      const verificationPrompt = getVerificationPromptCopy(
        provider,
        getVerificationCapabilitiesForProvider(gate.eligibility, provider),
        { locale: options.interactionCopy.locale },
      );

      return {
        description: verificationPrompt.description,
        icon: provider,
        primaryAction: {
          label:
            verificationPrompt.actionLabel || options.interactionCopy.taskVerify,
          loading:
            provider === "very"
              ? options.veryLoading
              : provider === "self"
                ? options.selfLoading
                : false,
          onClick: async () => {
            if (provider === "very") {
              if (!options.onStartVeryVerification) return;
              const result = await options.onStartVeryVerification();
              if (result.started) {
                closeModal();
              }
            } else {
              if (!options.onStartSelfVerification) return;
              const result = await options.onStartSelfVerification(gate);
              if (result.started) {
                closeModal();
                if (!result.openedModal && result.href) {
                  window.location.href = result.href;
                }
              }
            }
          },
        },
        ...(options.includeVerificationCloseAction
          ? {
              secondaryAction: {
                label: options.interactionCopy.close,
                onClick: closeModal,
              },
            }
          : {}),
        requirements: gate.preview.membership_gate_summaries,
        requirementStatuses: getRequirementStatuses(gate),
        title: isVoteAction
          ? options.interactionCopy.verifyToVoteTitle
          : options.interactionCopy.verifyToReplyTitle,
      };
    }

    if (gate.eligibility.status === "requestable") {
      if (options.onRequestable) {
        options.onRequestable(gate);
        return null;
      }
      return undefined;
    }

    if (gate.eligibility.status === "joinable") {
      if (!options.onJoin || !options.invalidateCommunityGate) {
        return undefined;
      }
      const ctaLabel = getJoinCtaLabel(gate.eligibility, {
        locale: options.interactionCopy.locale,
      });
      return {
        description: (isVoteAction
          ? options.interactionCopy.joinToVoteDescription
          : options.interactionCopy.joinToReplyDescription
        )
          .replace("{joinLabel}", ctaLabel)
          .replace("{communityName}", gate.preview.display_name),
        icon: "join",
        primaryAction: {
          label: ctaLabel,
          loading: options.joinLoading ?? false,
          onClick: async () => {
            await options.onJoin!(gate);
            options.invalidateCommunityGate!(gate.preview.id);
            closeModal();
          },
        },
        requirements: gate.preview.membership_gate_summaries,
        requirementStatuses: getRequirementStatuses(gate),
        title: (isVoteAction
          ? options.interactionCopy.joinToVoteTitle
          : options.interactionCopy.joinToReplyTitle
        ).replace("{joinLabel}", ctaLabel),
      };
    }

    return undefined;
  };
}
