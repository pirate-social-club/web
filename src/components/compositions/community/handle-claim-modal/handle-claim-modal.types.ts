export type HandleClaimPhase =
  | "intro"
  | "search"
  | "quoting"
  | "confirm"
  | "processing"
  | "success";

export type HandleAvailability =
  | "available"
  | "taken"
  | "reserved"
  | "already_claimed_by_viewer"
  | "viewer_has_claim"
  | "namespace_unavailable"
  | "unavailable";

export interface HandlePaymentInstructions {
  chainId: number;
  chainDisplayName: string;
  tokenAddress: string;
  recipientAddress: string;
  amountAtomic: string;
  amountDisplay: string;
}

export interface HandleSearchResult {
  availability: HandleAvailability;
  priceCents: number | null;
  pricingTier?: string;
  reason?: string;
  paymentInstructions?: HandlePaymentInstructions | null;
  /** False when a claim gate applies to this name and the viewer does not satisfy it. */
  claimGateSatisfied?: boolean;
  /** Human-readable requirement labels for an unsatisfied claim gate. */
  claimGateRequirements?: string[];
  /** Available completion actions derived from the unsatisfied gate summaries. */
  claimGateActions?: Array<"self" | "wallet">;
}

export interface HandleClaimNamespaceOption {
  namespaceVerification: string;
  label: string;
  routeLabel: string;
  disabled?: boolean;
}

export interface HandleClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityName: string;
  communityHandle: string;
  communityRouteLabel?: string | null;
  namespaceOptions?: HandleClaimNamespaceOption[];
  selectedNamespaceVerification?: string | null;
  onNamespaceChange?: (namespaceVerification: string) => void;
  phase: HandleClaimPhase;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchResult?: HandleSearchResult;
  confirmedDiscountPercent?: number | null;
  selfVerificationSavingsPercent?: number | null;
  onSelfVerificationClick?: () => void;
  onWalletConnectionClick?: () => void;
  onClaimGateRecheck?: () => void;
  onClaim: () => void;
  onNotNow: () => void;
  processing?: boolean;
  error?: string | null;
  claimedLabel?: string | null;
  forceMobile?: boolean;
  benefits?: string[];
  walletBalanceCents?: number | null;
  onAddFunds?: () => void;
}
