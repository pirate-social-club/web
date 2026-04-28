export interface PublicAgentCommunity {
  label: string;
  href?: string;
}

export interface PublicAgentPageProps {
  displayName: string;
  handle: string;
  ownerHandle: string;
  ownershipProvider?: string | null;
  createdAt: string;
  avatarSeed?: string;
  avatarSrc?: string;
  bannerSrc?: string;
  bio?: string;
  communities?: PublicAgentCommunity[];
  openInPirateHref?: string;
  ownerHref?: string;
  className?: string;
}
