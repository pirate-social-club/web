import type {
  NotificationEventType,
  NotificationFeedItem,
  UserTask,
  UserTaskType,
} from "@pirate/api-contracts";

const now = Date.parse("2026-04-19T12:00:00.000Z");

function iso(minutesAgo: number): string {
  return new Date(now - minutesAgo * 60_000).toISOString();
}

function task(input: {
  id: string;
  minutesAgo: number;
  payload?: Record<string, unknown>;
  priority?: number;
  subjectId?: string;
  subjectType?: string;
  type: UserTaskType;
}): UserTask {
  return {
    task_id: input.id,
    user_id: "usr_owner_1",
    type: input.type,
    subject_type: input.subjectType ?? "community",
    subject_id: input.subjectId ?? "gld_community_1",
    status: "open",
    priority: input.priority ?? 10,
    payload: input.payload ?? {},
    resolved_at: null,
    dismissed_at: null,
    created_at: iso(input.minutesAgo),
    updated_at: iso(input.minutesAgo),
  };
}

function activity(input: {
  actor?: string | null;
  eventId: string;
  minutesAgo: number;
  objectId?: string | null;
  objectType?: string | null;
  payload?: Record<string, unknown>;
  read?: boolean;
  subjectId: string;
  subjectType: string;
  type: NotificationEventType;
}): NotificationFeedItem {
  return {
    event: {
      event_id: input.eventId,
      type: input.type,
      actor_user_id: input.actor ? `usr_${input.actor}` : null,
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      object_type: input.objectType ?? null,
      object_id: input.objectId ?? null,
      payload: input.payload ?? {},
      created_at: iso(input.minutesAgo),
    },
    receipt: {
      event_id: input.eventId,
      recipient_user_id: "usr_owner_1",
      seen_at: input.read ? iso(input.minutesAgo - 5) : null,
      read_at: input.read ? iso(input.minutesAgo - 5) : null,
      created_at: iso(input.minutesAgo),
    },
  };
}

export const namespaceVerificationTask = task({
  id: "tsk_namespace_infinity",
  type: "namespace_verification_required",
  minutesAgo: 240,
  payload: {
    community_display_name: "Infinity Mirror",
    target_path: "/c/gld_community_1/mod/namespace",
  },
});

export const membershipReviewTask = task({
  id: "tsk_membership_review",
  type: "membership_review",
  minutesAgo: 45,
  priority: 20,
  subjectId: "gld_community_3",
  payload: {
    community_display_name: "Signal Room",
    membership_request_id: "mreq_1",
    request_count: 2,
    target_path: "/c/gld_community_3/mod/requests",
  },
});

export const uniqueHumanTask = task({
  id: "synth:unique_human:usr_owner_1",
  type: "unique_human_verification_required",
  minutesAgo: 20,
  subjectType: "user",
  subjectId: "usr_owner_1",
  payload: {
    target_path: "/onboarding?verify=human",
    verification_provider: "very",
  },
});

export const profileCompletionTask = task({
  id: "tsk_profile_completion",
  type: "profile_completion_suggested",
  minutesAgo: 180,
  priority: 1,
  subjectType: "profile",
  subjectId: "usr_owner_1",
  payload: { target_path: "/settings/profile" },
});

export const globalHandleCleanupTask = task({
  id: "tsk_global_handle_cleanup",
  type: "global_handle_cleanup_suggested",
  minutesAgo: 360,
  priority: 2,
  subjectType: "profile",
  subjectId: "usr_owner_1",
  payload: { target_path: "/settings/profile" },
});

export const namespacePendingTask = task({
  id: "tsk_namespace_pending",
  type: "namespace_verification_pending",
  minutesAgo: 720,
  payload: {
    community_display_name: "Tape Archive",
    target_path: "/c/gld_community_4/mod/namespace",
  },
});

export const payoutSetupTask = task({
  id: "tsk_payout_setup",
  type: "payout_setup_required",
  minutesAgo: 600,
  subjectId: "gld_community_2",
  payload: {
    community_display_name: "Night Signal",
    target_path: "/settings/payouts",
  },
});

export const royaltyClaimTask = task({
  id: "tsk_royalty_claim",
  type: "royalty_claim_available",
  minutesAgo: 90,
  subjectId: "gld_community_5",
  payload: {
    community_display_name: "Sample Market",
    target_path: "/inbox?tab=royalties",
  },
});

export const allLiveTaskFixtures = [
  uniqueHumanTask,
  namespaceVerificationTask,
  membershipReviewTask,
  profileCompletionTask,
  globalHandleCleanupTask,
];

export const allContractTaskFixtures = [
  ...allLiveTaskFixtures,
  namespacePendingTask,
  payoutSetupTask,
  royaltyClaimTask,
];

export const commentReplyUnread = activity({
  eventId: "nev_reply_1",
  type: "comment_reply",
  actor: "modmatrix",
  subjectType: "comment",
  subjectId: "cmt_parent_1",
  objectType: "comment",
  objectId: "cmt_reply_1",
  minutesAgo: 15,
  payload: {
    community_id: "gld_community_1",
    community_display_name: "Infinity Mirror",
    actor_display_name: "modmatrix",
    comment_excerpt: "This remix finally clicked once the drums stopped fighting the vocal.",
    post_title: "late night edits that actually worked",
    target_path: "/p/pst_root_1",
    thread_root_post_id: "pst_root_1",
  },
});

export const postCommentedUnread = activity({
  eventId: "nev_post_comment_1",
  type: "post_commented",
  actor: "echoghost",
  subjectType: "post",
  subjectId: "pst_root_2",
  objectType: "comment",
  objectId: "cmt_reply_2",
  minutesAgo: 55,
  payload: {
    community_id: "gld_community_2",
    community_display_name: "Night Signal",
    actor_display_name: "echoghost",
    comment_excerpt: "This belongs on the front page. The hook is absurd.",
    post_title: "first take from the basement session",
    target_path: "/p/pst_root_2",
  },
});

export const commentReplyRead = activity({
  eventId: "nev_reply_2",
  type: "comment_reply",
  actor: "phaseangel",
  subjectType: "comment",
  subjectId: "cmt_parent_2",
  objectType: "comment",
  objectId: "cmt_reply_3",
  minutesAgo: 180,
  read: true,
  payload: {
    community_id: "gld_community_1",
    community_display_name: "Infinity Mirror",
    actor_display_name: "phaseangel",
    comment_excerpt: "Kept the original version linked below in case anyone wants the raw mix.",
    post_title: "draft stems for tomorrow's drop",
    target_path: "/p/pst_root_3",
    thread_root_post_id: "pst_root_3",
  },
});

export const royaltyEarnedUnread = activity({
  eventId: "nev_royalty_1",
  type: "royalty_earned",
  actor: null,
  subjectType: "asset",
  subjectId: "ast_hook_1",
  objectType: "purchase",
  objectId: "pur_1",
  minutesAgo: 75,
  payload: {
    community_id: "gld_community_5",
    title: "Basement Hook Pack",
    amount_wip_wei: "1250000000000000000",
    buyer_wallet_address: "0x000000000000000000000000000000000000dEaD",
    target_path: "/inbox?tab=royalties",
  },
});

export const xmtpMessageUnread = activity({
  eventId: "nev_xmtp_1",
  type: "xmtp_message",
  actor: "directwave",
  subjectType: "conversation",
  subjectId: "conv_directwave",
  minutesAgo: 8,
  payload: {
    actor_display_name: "directwave",
    message_preview: "Can you send the stems before the room opens?",
    target_path: "/chat/c/conv_directwave",
  },
});

export const mentionUnread = activity({
  eventId: "nev_mention_1",
  type: "mention",
  actor: "analogkid",
  subjectType: "post",
  subjectId: "pst_mention_1",
  objectType: "comment",
  objectId: "cmt_mention_1",
  minutesAgo: 35,
  payload: {
    actor_display_name: "analogkid",
    comment_excerpt: "Looping in @owner because they had the cleanest version.",
    target_path: "/p/pst_mention_1",
  },
});

export const modEventUnread = activity({
  eventId: "nev_mod_1",
  type: "mod_event",
  actor: null,
  subjectType: "community",
  subjectId: "gld_community_3",
  minutesAgo: 140,
  payload: {
    community_display_name: "Signal Room",
    context_label: "A membership request was approved by another moderator.",
    target_path: "/c/gld_community_3/mod/requests",
  },
});

export const communityUpdateUnread = activity({
  eventId: "nev_community_update_1",
  type: "community_update",
  actor: null,
  subjectType: "community",
  subjectId: "gld_community_6",
  minutesAgo: 260,
  payload: {
    title: "Community settings updated",
    body: "Posting gates changed for Sample Market.",
    target_path: "/c/gld_community_6",
  },
});

export const allLiveActivityFixtures = [
  commentReplyUnread,
  postCommentedUnread,
  royaltyEarnedUnread,
  commentReplyRead,
];

export const allContractActivityFixtures = [
  xmtpMessageUnread,
  ...allLiveActivityFixtures,
  mentionUnread,
  modEventUnread,
  communityUpdateUnread,
];
