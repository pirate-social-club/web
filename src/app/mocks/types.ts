import type { CreateCommunityComposerProps } from "@/components/compositions/community/create-composer/create-community-composer.types";
import type { OnboardingRedditBootstrapProps } from "@/components/compositions/onboarding/reddit-bootstrap/onboarding-reddit-bootstrap.types";
import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import type {
  ProfileCommentItem,
  ProfileScrobbleItem,
} from "@/components/compositions/profiles/profile-page/profile-page.types";
import type {
  CommunitySidebarFlairPolicy,
  CommunitySidebarRoleHolder,
  CommunitySidebarReferenceLink,
  CommunitySidebarRule,
} from "@/components/compositions/community/sidebar/community-sidebar.types";
import type { CommunityMembershipMode } from "@/components/compositions/community/create-composer/create-community-composer.types";

export type RoutePost = PostCardProps & {
  postId: string;
};

export interface CommunitySummary {
  id: string;
  label: string;
  displayName: string;
  description: string;
  createdAt: string;
  memberCount: number;
  membershipMode: CommunityMembershipMode;
  owner?: CommunitySidebarRoleHolder | null;
  moderators: CommunitySidebarRoleHolder[];
  referenceLinks: CommunitySidebarReferenceLink[];
  rules: CommunitySidebarRule[];
  flairPolicy: CommunitySidebarFlairPolicy;
  posts: RoutePost[];
}

export interface ProfileSummary {
  userId: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarSrc?: string;
  joinedLabel: string;
  stats: Array<{ label: string; value: string }>;
  posts: RoutePost[];
  comments: ProfileCommentItem[];
  scrobbles: ProfileScrobbleItem[];
}

export type OnboardingSample = OnboardingRedditBootstrapProps;
export type CreateCommunitySample = CreateCommunityComposerProps;

export const CURRENT_USER_ID = "usr_01_suspicious_code";

export const COMMUNITY_IDS = {
  builders: "gld_01_builders",
  producersOnly: "gld_01_producers_only",
  tameImpala: "gld_01_tame_impala",
} as const;

export const USER_IDS = {
  current: CURRENT_USER_ID,
  innerspeaker: "usr_01_innerspeaker",
  kevin: "usr_01_kevin_parker",
  modmatrix: "usr_01_modmatrix",
  roomcontrol: "usr_01_roomcontrol",
  shipit: "usr_01_shipit",
} as const;
