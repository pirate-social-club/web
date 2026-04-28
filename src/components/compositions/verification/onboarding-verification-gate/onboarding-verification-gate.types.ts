export interface OnboardingVerificationGateProps {
  verificationState: "not_started" | "pending";
  verificationLoading: boolean;
  verificationError?: string | null;
  onVerify: () => void;
}
