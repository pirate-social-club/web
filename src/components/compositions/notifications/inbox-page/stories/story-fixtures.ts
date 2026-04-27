import type {
  NotificationFeedItem,
  RoyaltyActivityItem,
  UserTask,
} from "@pirate/api-contracts";

const now = Date.now();

function iso(minutesAgo: number): string {
  return new Date(now - minutesAgo * 60_000).toISOString();
}

export const namespaceVerificationTask: UserTask = {
  task_id: "tsk_namespace_infinity",
  user_id: "usr_owner_1",
  type: "namespace_verification_required",
  subject_type: "community",
  subject_id: "gld_community_1",
  status: "open",
  priority: 10,
  payload: {
    community_display_name: "Infinity Mirror",
    target_path: "/c/gld_community_1/mod/namespace",
  },
  resolved_at: null,
  dismissed_at: null,
  created_at: iso(240),
  updated_at: iso(240),
};

export const uniqueHumanVerificationTask: UserTask = {
  task_id: "synth:unique_human:usr_owner_1",
  user_id: "usr_owner_1",
  type: "unique_human_verification_required",
  subject_type: "user",
  subject_id: "usr_owner_1",
  status: "open",
  priority: 100,
  payload: {
    target_path: "/onboarding?verify=human",
    verification_provider: "very",
  },
  resolved_at: null,
  dismissed_at: null,
  created_at: iso(15),
  updated_at: iso(15),
};

export const profileCompletionTask: UserTask = {
  task_id: "tsk_profile_completion",
  user_id: "usr_owner_1",
  type: "profile_completion_suggested",
  subject_type: "profile",
  subject_id: "usr_owner_1",
  status: "open",
  priority: 1,
  payload: {
    target_path: "/settings/profile",
  },
  resolved_at: null,
  dismissed_at: null,
  created_at: iso(180),
  updated_at: iso(180),
};

export const globalHandleCleanupTask: UserTask = {
  task_id: "tsk_global_handle_cleanup",
  user_id: "usr_owner_1",
  type: "global_handle_cleanup_suggested",
  subject_type: "profile",
  subject_id: "usr_owner_1",
  status: "open",
  priority: 2,
  payload: {
    target_path: "/settings/profile",
  },
  resolved_at: null,
  dismissed_at: null,
  created_at: iso(90),
  updated_at: iso(90),
};

export const membershipReviewTask: UserTask = {
  task_id: "tsk_membership_review",
  user_id: "usr_owner_1",
  type: "membership_review",
  subject_type: "community",
  subject_id: "gld_community_3",
  status: "open",
  priority: 8,
  payload: {
    community_display_name: "Signal Room",
    applicant_user_id: "usr_applicant_1",
    applicant_handle: "signalhunter",
    membership_request_id: "mreq_signal_1",
    request_count: 2,
    target_path: "/c/gld_community_3/mod/requests",
  },
  resolved_at: null,
  dismissed_at: null,
  created_at: iso(45),
  updated_at: iso(10),
};

export const royaltyActivityItems: RoyaltyActivityItem[] = [
  {
    event_id: "nev_royalty_1",
    community_id: "gld_community_1",
    asset_id: "ast_midnight_waves",
    title: "Midnight Waves",
    story_ip_id: "0x1111111111111111111111111111111111111111",
    amount_wip_wei: "6200000000000000000",
    buyer_wallet_address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    tx_hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    purchase_id: "pur_midnight_waves",
    created_at: iso(6),
    read_at: null,
  },
  {
    event_id: "nev_royalty_2",
    community_id: "gld_community_2",
    asset_id: "ast_basement_session",
    title: "Basement Session",
    story_ip_id: "0x2222222222222222222222222222222222222222",
    amount_wip_wei: "4000000000000000000",
    buyer_wallet_address: "0x8f3a35Cc6634C0532925a3b844Bc454e4438b12c",
    tx_hash: "0xabcdef7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    purchase_id: "pur_basement_session",
    created_at: iso(48),
    read_at: iso(45),
  },
];

export const commentReplyUnread: NotificationFeedItem = {
  event: {
    event_id: "nev_reply_1",
    type: "comment_reply",
    actor_user_id: "usr_actor_1",
    subject_type: "comment",
    subject_id: "cmt_parent_1",
    object_type: "comment",
    object_id: "cmt_reply_1",
    payload: {
      community_id: "gld_community_1",
      community_display_name: "Infinity Mirror",
      actor_display_name: "modmatrix",
      actor_avatar_url: "https://i.pravatar.cc/100?img=11",
      comment_excerpt: "This remix finally clicked once the drums stopped fighting the vocal.",
      post_title: "late night edits that actually worked",
      target_path: "/p/pst_root_1",
      thread_root_post_id: "pst_root_1",
    },
    created_at: iso(15),
  },
  receipt: {
    event_id: "nev_reply_1",
    recipient_user_id: "usr_owner_1",
    seen_at: null,
    read_at: null,
    created_at: iso(15),
  },
};

export const postCommentedUnread: NotificationFeedItem = {
  event: {
    event_id: "nev_post_comment_1",
    type: "post_commented",
    actor_user_id: "usr_actor_2",
    subject_type: "post",
    subject_id: "pst_root_2",
    object_type: "comment",
    object_id: "cmt_reply_2",
    payload: {
      community_id: "gld_community_2",
      community_display_name: "Night Signal",
      actor_display_name: "echoghost",
      actor_avatar_url: "https://i.pravatar.cc/100?img=23",
      comment_excerpt: "This belongs on the front page. The hook is absurd.",
      post_title: "first take from the basement session",
      target_path: "/p/pst_root_2",
    },
    created_at: iso(55),
  },
  receipt: {
    event_id: "nev_post_comment_1",
    recipient_user_id: "usr_owner_1",
    seen_at: null,
    read_at: null,
    created_at: iso(55),
  },
};

export const commentReplyRead: NotificationFeedItem = {
  event: {
    event_id: "nev_reply_2",
    type: "comment_reply",
    actor_user_id: "usr_actor_3",
    subject_type: "comment",
    subject_id: "cmt_parent_2",
    object_type: "comment",
    object_id: "cmt_reply_3",
    payload: {
      community_id: "gld_community_1",
      community_display_name: "Infinity Mirror",
      actor_display_name: "phaseangel",
      actor_avatar_url: "https://i.pravatar.cc/100?img=15",
      comment_excerpt: "Kept the original version linked below in case anyone wants the raw mix.",
      post_title: "draft stems for tomorrow's drop",
      target_path: "/p/pst_root_3",
      thread_root_post_id: "pst_root_3",
    },
    created_at: iso(180),
  },
  receipt: {
    event_id: "nev_reply_2",
    recipient_user_id: "usr_owner_1",
    seen_at: iso(170),
    read_at: iso(170),
    created_at: iso(180),
  },
};
