import type { CommunityPreview, JoinEligibility, LocalizedPostResponse } from "@pirate/api-contracts";
import type * as React from "react";

import type {
  CommunityInteractionGateAction,
  CommunityInteractionGateModalProps,
} from "@/components/compositions/community/interaction-gate-modal/community-interaction-gate-modal";
import type {
  CommunityGateRequirementGroup,
  CommunityGateRequirementStatus,
} from "@/components/compositions/community/gate-requirements.types";
import type { AltchaScope } from "@/lib/api/client-groups-core";
import {
  getJoinCtaLabel,
  getGateFailureMessage,
  getPassportPromptCapabilities,
  hasAltchaProofAction,
  getVerificationCapabilitiesForProvider,
  getVerificationPromptCopy,
  resolveSuggestedVerificationProvider,
} from "@/lib/identity-gates";
import { deriveGateStatuses } from "@/lib/community-gate-statuses";
import { interpolateMessage } from "@/lib/route-messages";
import { getLocaleMessages } from "@/locales";
import { openExternalHref } from "@/lib/open-external-href";
import { type UiLocaleCode } from "@/lib/ui-locale-core";

export type RouteKind = "community" | "home" | "post" | "public-community";
export type InteractionAction =
  | "vote_post"
  | "vote_comment"
  | "reply_post"
  | "reply_comment";
export type InteractionResult = "allowed" | "blocked";
export type InteractionAllowedContext = {
  altchaPayload?: string | null;
};

export type CommunityGateData = {
  eligibility: JoinEligibility;
  gateMatchMode?: "all" | "any" | null;
  preview: Pick<
    CommunityPreview,
    "id" | "display_name" | "membership_gate_summaries" | "viewer_community_role"
  > & { viewer_following?: CommunityPreview["viewer_following"] };
};

type PostViewerGateState = {
  community_id: string;
  community_display_name: string;
  viewer_community_role: "owner" | "admin" | "moderator" | null;
  viewer_membership_status: "member" | "not_member" | "banned" | null;
  membership_gate_summaries: CommunityPreview["membership_gate_summaries"];
  gate_match_mode?: "all" | "any" | null;
};

type LocalizedPostResponseWithViewerGateState = LocalizedPostResponse & {
  viewer_gate_state?: PostViewerGateState | null;
};

export type InteractionGateCopy = ReturnType<
  typeof getLocaleMessages<"routes">
>["interactionGate"] & {
  locale: string;
  taskVerify: string;
};

export type ModalState = {
  body?: React.ReactNode;
  description: string;
  hideCloseButtonOnMobile?: boolean;
  hideSecondaryActionOnMobile?: boolean;
  icon?: CommunityInteractionGateModalProps["icon"];
  primaryAction?: CommunityInteractionGateAction | null;
  requirementGroups?: CommunityGateRequirementGroup[];
  requirements: CommunityGateData["preview"]["membership_gate_summaries"];
  requirementsMode?: "all" | "any";
  requirementStatuses?: CommunityGateRequirementStatus[];
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
  defaultVerificationLoadingProvider?: "self" | "very" | "passport" | "zkpassport" | null;
  startDefaultVerification?: (input: {
    gate: CommunityGateData;
    provider: "self" | "very" | "passport" | "zkpassport";
  }) => Promise<{ started: boolean }>;
  startWalletConnection?: (input: {
    gate: CommunityGateData;
  }) => Promise<{ started: boolean }>;
  walletConnectionLoading?: boolean;
};

export type PendingInteraction = {
  action: InteractionAction;
  altchaAction?: string;
  altchaScope?: AltchaScope;
  commentId?: string;
  communityId: string;
  gate: CommunityGateData;
  onAllowed: (context?: InteractionAllowedContext) => Promise<void> | void;
  postId?: string;
  /** Whether this specific write must create/retain community membership. */
  requireMembership?: boolean;
  resumeActionAfterJoin?: boolean;
  voteValue?: -1 | 1 | "clear";
};

export type RunGatedCommunityActionParams = {
  action: InteractionAction;
  /**
   * Optional route-owned modal override.
   * Return `undefined` to let the default gate modal render, `null` when the
   * route handled the blocked state itself, or a `ModalState` to show it here.
   */
  buildBlockedModalState?: (
    args: BuildBlockedModalStateArgs,
  ) => ModalState | null | undefined;
  communityId: string;
  commentId?: string;
  gateData?: CommunityGateData;
  onAllowed: (context?: InteractionAllowedContext) => Promise<void> | void;
  postId?: string;
  /** Force the membership flow after the API identifies a members-only thread. */
  requireMembership?: boolean;
  resolveGateData?: () => Promise<CommunityGateData>;
  resumeActionAfterJoin?: boolean;
  voteValue?: -1 | 1 | "clear";
};

function buildPrewarmedJoinEligibility(
  post: LocalizedPostResponse,
  status: Extract<JoinEligibility["status"], "already_joined" | "banned">,
): JoinEligibility {
  const gateState = (post as LocalizedPostResponseWithViewerGateState).viewer_gate_state;
  const community = post.community;
  return {
    community: gateState?.community_id ?? community?.id ?? post.post.community,
    membership_mode: community?.membership_mode ?? "gated",
    human_verification_lane: community?.human_verification_lane ?? "self",
    joinable_now: false,
    status,
    membership_gate_summaries: [],
    missing_capabilities: [],
    suggested_verification_provider: null,
    suggested_verification_intent: null,
    failure_reason: status === "banned" ? "banned" : null,
    gate_evaluation: null,
  } as JoinEligibility;
}

export function selectPostVoteGateData(
  post: LocalizedPostResponse,
): CommunityGateData | null {
  const gateState = (post as LocalizedPostResponseWithViewerGateState).viewer_gate_state;
  if (gateState) {
    const status =
      gateState.viewer_community_role != null || gateState.viewer_membership_status === "member"
        ? "already_joined"
        : gateState.viewer_membership_status === "banned"
          ? "banned"
          : null;

    if (!status) {
      return null;
    }

    return {
      eligibility: buildPrewarmedJoinEligibility(post, status),
      gateMatchMode: gateState.gate_match_mode ?? null,
      preview: {
        id: gateState.community_id,
        display_name: gateState.community_display_name,
        membership_gate_summaries: gateState.membership_gate_summaries,
        viewer_community_role: gateState.viewer_community_role,
      },
    };
  }

  const community = post.community;
  if (!community) {
    return null;
  }

  const status =
    community.viewer_community_role != null || community.viewer_membership_status === "member"
      ? "already_joined"
      : community.viewer_membership_status === "banned"
        ? "banned"
        : null;

  if (!status) {
    return null;
  }

  return {
    eligibility: buildPrewarmedJoinEligibility(post, status),
    gateMatchMode: community.gate_match_mode ?? null,
    preview: {
      id: community.id,
      display_name: community.display_name,
      membership_gate_summaries: community.membership_gate_summaries,
      viewer_community_role: community.viewer_community_role ?? null,
    },
  };
}

export const SELF_INTERACTION_GATE_STORAGE_KEY =
  "pirate_pending_self_interaction_gate_session";

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
  _gate: CommunityGateData,
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

type RequiredActionNode = Omit<NonNullable<NonNullable<JoinEligibility["gate_evaluation"]>["required_action_set"]>["items"][number], "items"> & {
  items?: RequiredActionNode[];
};

function gateMatchesRequiredAction(
  gate: CommunityGateData["preview"]["membership_gate_summaries"][number],
  action: RequiredActionNode,
): boolean {
  if (action.kind !== "action") return false;
  if (action.gate_id && gate.gate_id) return action.gate_id === gate.gate_id;
  switch (action.capability) {
    case "minimum_age":
      return gate.gate_type === "minimum_age" || gate.gate_type === "age_over_18";
    case "nationality":
      return gate.gate_type === "nationality";
    case "gender":
      return gate.gate_type === "gender";
    case "unique_human":
      return gate.gate_type === "unique_human";
    case "wallet_score":
      return gate.gate_type === "wallet_score";
    case "altcha_pow":
      return gate.gate_type === "altcha_pow";
    case "erc721_holding":
      return gate.gate_type === "erc721_holding";
    case "erc721_inventory_match":
      return gate.gate_type === "erc721_inventory_match";
    case "asset_balance":
      return gate.gate_type === "asset_balance";
    default:
      return false;
  }
}

function findGateForRequiredAction(
  requirements: CommunityGateData["preview"]["membership_gate_summaries"],
  action: RequiredActionNode,
): CommunityGateData["preview"]["membership_gate_summaries"][number] | null {
  return requirements.find((gate) => gateMatchesRequiredAction(gate, action)) ?? null;
}

function buildRequirementGroupsFromActionSet(
  requirements: CommunityGateData["preview"]["membership_gate_summaries"],
  set: RequiredActionNode,
): CommunityGateRequirementGroup[] {
  if (set.kind !== "set") return [];
  const nestedGroups: CommunityGateRequirementGroup[] = [];
  const directRequirements: CommunityGateData["preview"]["membership_gate_summaries"] = [];

  for (const item of set.items ?? []) {
    if (item.kind === "set") {
      if (item.mode === "any") {
        const alternatives = (item.items ?? [])
          .flatMap((nested) => nested.kind === "action" ? [findGateForRequiredAction(requirements, nested)] : [])
          .filter((gate): gate is CommunityGateData["preview"]["membership_gate_summaries"][number] => gate != null);
        if (alternatives.length > 0) {
          nestedGroups.push({
            mode: "any",
            requirements: alternatives,
          });
        }
      } else {
        nestedGroups.push(...buildRequirementGroupsFromActionSet(requirements, item));
      }
      continue;
    }

    const gate = findGateForRequiredAction(requirements, item);
    if (gate) {
      directRequirements.push(gate);
    }
  }

  if (set.mode === "any") {
    const alternatives = [
      ...directRequirements,
      ...nestedGroups.flatMap((group) => group.requirements),
    ];
    return alternatives.length > 0
      ? [{
          mode: "any",
          requirements: alternatives,
        }]
      : [];
  }

  const groups = [...nestedGroups];
  if (directRequirements.length > 0) {
    groups.unshift({
      mode: "all",
      requirements: directRequirements,
    });
  }
  return groups;
}

function getGroupRequirementStatuses(
  gate: CommunityGateData,
  group: CommunityGateRequirementGroup,
): CommunityGateRequirementStatus[] {
  return deriveGateStatuses({
    eligibility: gate.eligibility,
    gateMatchMode: group.mode,
    requirements: group.requirements,
  });
}

function withGroupRequirementStatuses(
  gate: CommunityGateData,
  groups: CommunityGateRequirementGroup[],
): CommunityGateRequirementGroup[] {
  return groups.map((group) => ({
    ...group,
    requirementStatuses: getGroupRequirementStatuses(gate, group),
  }));
}

export function getRequirementGroups(
  gate: CommunityGateData,
  requirements = gate.preview.membership_gate_summaries,
): CommunityGateRequirementGroup[] | undefined {
  const actionSet = gate.eligibility.gate_evaluation?.required_action_set as RequiredActionNode | null | undefined;
  if (actionSet?.kind === "set") {
    const groups = buildRequirementGroupsFromActionSet(requirements, actionSet);
    if (groups.length > 0) {
      return withGroupRequirementStatuses(gate, groups);
    }
  }

  if (gate.gateMatchMode === "any" && requirements.length > 1) {
    return withGroupRequirementStatuses(gate, [{
      mode: "any",
      requirements,
    }]);
  }

  return undefined;
}

export function getRequirementStatuses(
  gate: CommunityGateData,
  requirements = gate.preview.membership_gate_summaries,
): CommunityGateRequirementStatus[] {
  return deriveGateStatuses({
    eligibility: gate.eligibility,
    gateMatchMode: gate.gateMatchMode,
    requirements,
  });
}

export function getRequirementDisplayState(
  gate: CommunityGateData,
  requirements = gate.preview.membership_gate_summaries,
): Pick<ModalState, "requirementGroups" | "requirements" | "requirementsMode" | "requirementStatuses"> {
  return {
    requirementGroups: getRequirementGroups(gate, requirements),
    requirements,
    requirementsMode: gate.gateMatchMode ?? undefined,
    requirementStatuses: getRequirementStatuses(gate, requirements),
  };
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

function isNftGateFailure(gate: CommunityGateData): boolean {
  return gate.eligibility.status === "gate_failed"
    && (
      gate.eligibility.failure_reason === "erc721_holding_required"
      || gate.eligibility.failure_reason === "erc721_inventory_match_required"
    );
}

export function createDefaultBlockedModalState({
  action,
  closeModal,
  gate,
  interactionCopy,
  openCommunity,
  defaultVerificationLoadingProvider,
  startDefaultVerification,
  startWalletConnection,
  walletConnectionLoading,
}: BuildBlockedModalStateArgs): ModalState {
  const isVoteAction = action === "vote_post" || action === "vote_comment";
  const resolvedLocale: UiLocaleCode =
    interactionCopy.locale === "pseudo"
      ? "pseudo"
      : interactionCopy.locale === "ar"
        ? "ar"
        : interactionCopy.locale === "zh"
          ? "zh"
          : "en";
  const gatesPanel = getLocaleMessages(resolvedLocale, "gates").panel;

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
            label: gatesPanel.passportPromptActionLabel,
            rel: "noopener noreferrer",
            target: "_blank",
          },
          secondaryAction: null,
          ...getRequirementDisplayState(gate),
          title: gatesPanel.passportPromptTitle,
        };
      }
      const verificationPrompt = getVerificationPromptCopy(
        provider,
        getVerificationCapabilitiesForProvider(gate.eligibility, provider),
        { locale: interactionCopy.locale },
      );
      const verificationIcon = provider === "zkpassport" ? "passport" : provider;
      return {
        description: verificationPrompt.description,
        icon: verificationIcon,
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
        ...getRequirementDisplayState(gate),
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
        ...getRequirementDisplayState(gate),
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
        description: gatesPanel.pendingRequestDescription,
        icon: "pending",
        ...getRequirementDisplayState(gate),
        title: gatesPanel.pendingRequestTitle,
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
        ...getRequirementDisplayState(
          gate,
          gate.eligibility.status === "gate_failed"
            ? getFailedGateRequirements(gate)
            : gate.preview.membership_gate_summaries,
        ),
        icon: "blocked",
        ...(isNftGateFailure(gate) && startWalletConnection
          ? {
              primaryAction: {
                label: "Connect wallet",
                loading: walletConnectionLoading,
                onClick: async () => {
                  await startWalletConnection({ gate });
                },
              },
            }
          : {}),
        title: isVoteAction
          ? interactionCopy.cantVoteHereTitle
          : interactionCopy.cantReplyHereTitle,
      };
    case "already_joined":
      return {
        description: interactionCopy.readyDescription,
        icon: "ready",
        ...getRequirementDisplayState(gate),
        title: interactionCopy.readyTitle,
      };
  }
}

export function resolveCommunityInteractionState(input: {
  action: InteractionAction;
  eligibility: JoinEligibility | null | undefined;
  hasSession: boolean;
  requireMembership?: boolean;
}): "allowed" | "auth" | Exclude<JoinEligibility["status"], "already_joined"> {
  if (!input.hasSession) {
    return "auth";
  }

  const isReplyAction = input.action === "reply_post" || input.action === "reply_comment";
  if (isReplyAction && !input.requireMembership) {
    return "allowed";
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
  zkPassportLoading?: boolean;
  onJoin?: (gate: CommunityGateData) => Promise<void>;
  onStartVeryVerification?: () => Promise<{ started: boolean }>;
  onStartSelfVerification?: (gate: CommunityGateData) => Promise<{
    started: boolean;
    openedModal?: boolean;
    href?: string | null;
  }>;
  onStartZkPassportVerification?: (gate: CommunityGateData) => Promise<{
    started: boolean;
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
      if (hasAltchaProofAction(gate.eligibility)) {
        return undefined;
      }
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
                : provider === "zkpassport"
                  ? options.zkPassportLoading ?? false
                  : false,
          onClick: async () => {
            if (provider === "very") {
              if (!options.onStartVeryVerification) return;
              const result = await options.onStartVeryVerification();
              if (result.started) {
                closeModal();
              }
            } else if (provider === "zkpassport") {
              if (!options.onStartZkPassportVerification) return;
              const result = await options.onStartZkPassportVerification(gate);
              if (result.started) {
                closeModal();
              }
            } else {
              if (!options.onStartSelfVerification) return;
              const result = await options.onStartSelfVerification(gate);
              if (result.started) {
                closeModal();
                if (!result.openedModal && result.href) {
                  openExternalHref(result.href);
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
        ...getRequirementDisplayState(gate),
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
        ...getRequirementDisplayState(gate),
        title: (isVoteAction
          ? options.interactionCopy.joinToVoteTitle
          : options.interactionCopy.joinToReplyTitle
        ).replace("{joinLabel}", ctaLabel),
      };
    }

    return undefined;
  };
}
