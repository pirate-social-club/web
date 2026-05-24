export interface OnboardingVerificationGateProps {
  verificationState: "not_started" | "pending";
  verificationHref?: string | null;
  verificationLoading: boolean;
  verificationError?: string | null;
  onVerify: () => void;
}
