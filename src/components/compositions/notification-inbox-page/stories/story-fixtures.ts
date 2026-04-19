import type {
  NotificationFeedItem,
  UserTask,
} from "@pirate/api-contracts";

const now = Date.parse("2026-04-19T12:00:00.000Z");

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
  },
  resolved_at: null,
  dismissed_at: null,
  created_at: iso(240),
  updated_at: iso(240),
};

export const payoutSetupTask: UserTask = {
  task_id: "tsk_payout_stub",
  user_id: "usr_owner_1",
  type: "payout_setup_required",
  subject_type: "community",
  subject_id: "gld_community_2",
  status: "open",
  priority: 3,
  payload: {
    community_display_name: "Night Signal",
  },
  resolved_at: null,
  dismissed_at: null,
  created_at: iso(600),
  updated_at: iso(120),
};

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
