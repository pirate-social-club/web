export interface BoostCampaignControllerInput {
  activeCampaignId: string | null;
  authenticated: boolean;
  communityId: string | null;
  onCampaignActivated?: () => void;
  postId: string;
  requestAuth: () => void;
  song: boolean;
  viewerIsAuthor: boolean;
}
