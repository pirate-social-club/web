import type { JoinEligibility } from "@pirate/api-contracts";

import {
  getHumanVerificationRequestForProvider,
  getVerificationPromptCopy,
} from "@/lib/identity-gates";

export function telegramVerifySelfReadyMessage(
  eligibility: Pick<JoinEligibility, "membership_gate_summaries" | "missing_capabilities" | "gate_evaluation">,
  locale: string,
): string {
  const request = getHumanVerificationRequestForProvider(eligibility, "self");
  const plannedCapabilities = Array.from(new Set([
    ...request.requestedCapabilities,
    ...request.verificationRequirements.map((requirement) => requirement.proof_type),
  ]));
  const prompt = getVerificationPromptCopy("self", plannedCapabilities, {
    locale,
    membershipGateSummaries: eligibility.membership_gate_summaries,
  });
  const requirement = prompt.description.match(/requires you to prove (.+?) before joining\./u)?.[1];
  return requirement
    ? `Prove ${requirement} anonymously with Self.xyz.`
    : "Verify anonymously with Self.xyz.";
}

type TelegramSelfVerificationOptions = {
  deeplinkCallbackBaseHref?: string | null;
  showToastOnError?: boolean;
  skipModal?: boolean;
  verificationPlanningInput?: JoinEligibility | null;
};

type TelegramZkPassportVerificationOptions = {
  deferOpen?: boolean;
  showToastOnError?: boolean;
  verificationPlanningInput?: JoinEligibility | null;
};

export function launchTelegramSelfVerification<TResult>(input: {
  callbackBaseHref: string | null;
  eligibility: JoinEligibility;
  startVerification: (options: TelegramSelfVerificationOptions) => Promise<TResult>;
}): Promise<TResult> {
  return input.startVerification({
    deeplinkCallbackBaseHref: input.callbackBaseHref,
    showToastOnError: false,
    skipModal: true,
    verificationPlanningInput: input.eligibility,
  });
}

export function launchTelegramZkPassportVerification<TResult>(input: {
  eligibility: JoinEligibility;
  startVerification: (options: TelegramZkPassportVerificationOptions) => Promise<TResult>;
}): Promise<TResult> {
  return input.startVerification({
    deferOpen: true,
    showToastOnError: false,
    verificationPlanningInput: input.eligibility,
  });
}
