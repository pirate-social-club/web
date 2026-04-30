import type {
  NotificationFeedItem,
  RoyaltyActivityItem,
  UserTask,
} from "@pirate/api-contracts";

const now = Date.now();

function unix(minutesAgo: number): number {
  return Math.floor((now - minutesAgo * 60_000) / 1000);
}

export const namespaceVerificationTask: UserTask = {
  id: "tsk_namespace_infinity",
  object: "user_task",
  user: "usr_owner_1",
  type: "namespace_verification_required",
  subject_type: "community",
  subject: "gld_community_1",
  status: "open",
  priority: 10,
  payload: {
    community_display_name: "Infinity Mirror",
    target_path: "/c/gld_community_1/mod/namespace",
  },
  resolved_at: null,
  dismissed_at: null,
  created: unix(240),
};

export const uniqueHumanVerificationTask: UserTask = {
  id: "synth:unique_human:usr_owner_1",
  object: "user_task",
  user: "usr_owner_1",
  type: "unique_human_verification_required",
  subject_type: "user",
  subject: "usr_owner_1",
  status: "open",
  priority: 100,
  payload: {
    target_path: "/onboarding?verify=human",
    verification_provider: "very",
  },
  resolved_at: null,
  dismissed_at: null,
  created: unix(15),
};

export const profileCompletionTask: UserTask = {
  id: "tsk_profile_completion",
  object: "user_task",
  user: "usr_owner_1",
  type: "profile_completion_suggested",
  subject_type: "profile",
  subject: "usr_owner_1",
  status: "open",
  priority: 1,
  payload: {
    target_path: "/settings/profile",
  },
  resolved_at: null,
  dismissed_at: null,
  created: unix(180),
};

export const globalHandleCleanupTask: UserTask = {
  id: "tsk_global_handle_cleanup",
  object: "user_task",
  user: "usr_owner_1",
  type: "global_handle_cleanup_suggested",
  subject_type: "profile",
  subject: "usr_owner_1",
  status: "open",
  priority: 2,
  payload: {
    target_path: "/settings/profile",
  },
  resolved_at: null,
  dismissed_at: null,
  created: unix(90),
};

export const membershipReviewTask: UserTask = {
  id: "tsk_membership_review",
  object: "user_task",
  user: "usr_owner_1",
  type: "membership_review",
  subject_type: "community",
  subject: "gld_community_3",
  status: "open",
  priority: 8,
  payload: {
    community_display_name: "Signal Room",
    applicant_user: "usr_applicant_1",
    applicant_handle: "signalhunter",
    id: "mreq_signal_1",
    request_count: 2,
    target_path: "/c/gld_community_3/mod/requests",
  },
  resolved_at: null,
  dismissed_at: null,
  created: unix(45),
};

export const royaltyActivityItems: RoyaltyActivityItem[] = [
  {
    id: "nev_royalty_1",
    object: "royalty_activity_item",
    community: "gld_community_1",
    asset: "ast_midnight_waves",
    title: "Midnight Waves",
    story_ip: "0x1111111111111111111111111111111111111111",
    amount_wip_wei: "6200000000000000000",
    buyer_wallet_address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    tx_hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    purchase: "pur_midnight_waves",
    created: unix(6),
    read_at: null,
  },
  {
    id: "nev_royalty_2",
    object: "royalty_activity_item",
    community: "gld_community_2",
    asset: "ast_basement_session",
    title: "Basement Session",
    story_ip: "0x2222222222222222222222222222222222222222",
    amount_wip_wei: "4000000000000000000",
    buyer_wallet_address: "0x8f3a35Cc6634C0532925a3b844Bc454e4438b12c",
    tx_hash: "0xabcdef7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    purchase: "pur_basement_session",
    created: unix(48),
    read_at: unix(45),
  },
];

export const commentReplyUnread: NotificationFeedItem = {
  event: {
    id: "nev_reply_1",
    object: "notification_event",
    type: "comment_reply",
    actor_user: "usr_actor_1",
    subject_type: "comment",
    subject: "cmt_parent_1",
    object_type: "comment",
    payload: {
      community: "gld_community_1",
      community_display_name: "Infinity Mirror",
      actor_display_name: "modmatrix",
      actor_avatar_url: "https://i.pravatar.cc/100?img=11",
      comment_excerpt: "This remix finally clicked once the drums stopped fighting the vocal.",
      post_title: "late night edits that actually worked",
      target_path: "/p/pst_root_1",
      thread_root_post_id: "pst_root_1",
    },
    created: unix(15),
  },
  receipt: {
    id: "nev_reply_1",
    object: "notification_receipt",
    recipient_user: "usr_owner_1",
    seen_at: null,
    read_at: null,
    created: unix(15),
  },
};

export const postCommentedUnread: NotificationFeedItem = {
  event: {
    id: "nev_post_comment_1",
    object: "notification_event",
    type: "post_commented",
    actor_user: "usr_actor_2",
    subject_type: "post",
    subject: "pst_root_2",
    object_type: "comment",
    payload: {
      community: "gld_community_2",
      community_display_name: "Night Signal",
      actor_display_name: "echoghost",
      actor_avatar_url: "https://i.pravatar.cc/100?img=23",
      comment_excerpt: "This belongs on the front page. The hook is absurd.",
      post_title: "first take from the basement session",
      target_path: "/p/pst_root_2",
    },
    created: unix(55),
  },
  receipt: {
    id: "nev_post_comment_1",
    object: "notification_receipt",
    recipient_user: "usr_owner_1",
    seen_at: null,
    read_at: null,
    created: unix(55),
  },
};

export const commentReplyRead: NotificationFeedItem = {
  event: {
    id: "nev_reply_2",
    object: "notification_event",
    type: "comment_reply",
    actor_user: "usr_actor_3",
    subject_type: "comment",
    subject: "cmt_parent_2",
    object_type: "comment",
    payload: {
      community: "gld_community_1",
      community_display_name: "Infinity Mirror",
      actor_display_name: "phaseangel",
      actor_avatar_url: "https://i.pravatar.cc/100?img=15",
      comment_excerpt: "Kept the original version linked below in case anyone wants the raw mix.",
      post_title: "draft stems for tomorrow's drop",
      target_path: "/p/pst_root_3",
      thread_root_post_id: "pst_root_3",
    },
    created: unix(180),
  },
  receipt: {
    id: "nev_reply_2",
    object: "notification_receipt",
    recipient_user: "usr_owner_1",
    seen_at: unix(170),
    read_at: unix(170),
    created: unix(180),
  },
};
