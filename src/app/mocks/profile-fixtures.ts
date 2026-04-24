import { COMMUNITY_RECORDS } from "./community-fixtures";
import { createProfileComment, createProfileScrobble, createTextPost } from "./post-factories";
import type { ProfileSummary } from "./types";
import { COMMUNITY_IDS, USER_IDS } from "./types";

export const PROFILES: Record<string, ProfileSummary> = {
  [USER_IDS.current]: {
    userId: USER_IDS.current,
    handle: "u/suspicious-code-7234.pirate",
    displayName: "Suspicious Code",
    bio: "Building the first route shell for Pirate while keeping the product contract clean.",
    avatarSrc: "https://i.pravatar.cc/128?img=47",
    joinedLabel: "Joined Apr 2026",
    stats: [
      { label: "Posts", value: "14" },
      { label: "Communities", value: "8" },
      { label: "Saved", value: "23" },
    ],
    posts: [
      createTextPost({
        authorLabel: "u/suspicious-code-7234.pirate",
        authorUserId: USER_IDS.current,
        avatarSeed: 47,
        body: "Route trees are cheap to rename until real resolution contracts exist. Slugs and handles can come later.",
        comments: 12,
        communityId: COMMUNITY_IDS.builders,
        communityLabel: "c/builders",
        postId: "pst_01_profile_thought",
        score: 88,
        timestampLabel: "1h",
        title: "Scaffold first, lock vanity routes later",
        viewContext: "profile",
      }),
    ],
    comments: [
      createProfileComment({
        commentId: "cmt_01_profile_route_shell",
        authorLabel: "u/suspicious-code-7234.pirate",
        body: "The self profile should earn its own layout decisions. Reusing the public follow rail was fast, but it was wrong.",
        communityLabel: "c/builders",
        communityHref: `/c/${COMMUNITY_IDS.builders}`,
        postTitle: "What should /me optimize for first?",
        postHref: "/p/pst_01_profile_thought",
        scoreLabel: "31 score",
        timestampLabel: "34m",
      }),
      createProfileComment({
        commentId: "cmt_01_profile_storybook",
        authorLabel: "u/suspicious-code-7234.pirate",
        body: "Storybook should carry both the composition and the route shell. Otherwise mobile chrome regressions slip through.",
        communityLabel: "c/producers-only",
        communityHref: `/c/${COMMUNITY_IDS.producersOnly}`,
        postTitle: "Should page routes live in Storybook?",
        postHref: "/p/pst_01_interface_audit",
        scoreLabel: "19 score",
        timestampLabel: "3h",
      }),
    ],
    scrobbles: [
      createProfileScrobble({
        scrobbleId: "scr_01_suspicious_code_1",
        title: "Windowlicker",
        artistName: "Aphex Twin",
        artworkSrc: "https://picsum.photos/seed/scrobble-windowlicker/400/400",
        metaItems: [
          { label: "Scrobbled 12m ago" },
          { label: "c/builders", href: `/c/${COMMUNITY_IDS.builders}` },
          { label: "214 plays" },
        ],
      }),
      createProfileScrobble({
        scrobbleId: "scr_01_suspicious_code_2",
        title: "Midnight in a Perfect World",
        artistName: "DJ Shadow",
        artworkSrc: "https://picsum.photos/seed/scrobble-dj-shadow/400/400",
        metaItems: [
          { label: "Scrobbled yesterday" },
          { label: "c/producers-only", href: `/c/${COMMUNITY_IDS.producersOnly}` },
          { label: "97 plays" },
        ],
      }),
    ],
  },
  [USER_IDS.kevin]: {
    userId: USER_IDS.kevin,
    handle: "u/kevinparker.pirate",
    displayName: "Kevin Parker",
    bio: "Synths, tape, and too many alternate mixes.",
    avatarSrc: "https://i.pravatar.cc/128?img=12",
    joinedLabel: "Joined Jun 2024",
    stats: [
      { label: "Posts", value: "128" },
      { label: "Communities", value: "3" },
      { label: "Followers", value: "41.2K" },
    ],
    posts: COMMUNITY_RECORDS[COMMUNITY_IDS.tameImpala].posts,
    comments: [
      createProfileComment({
        commentId: "cmt_01_kevin_mix",
        authorLabel: "u/kevinparker.pirate",
        body: "If the rough mix is doing the emotional work already, the final version should protect that instead of polishing it flat.",
        communityLabel: "c/tameimpala",
        communityHref: `/c/${COMMUNITY_IDS.tameImpala}`,
        postTitle: "When do you stop touching the mix?",
        postHref: "/p/pst_01_kevin_mix",
        scoreLabel: "2.4K score",
        timestampLabel: "5h",
      }),
    ],
    scrobbles: [
      createProfileScrobble({
        scrobbleId: "scr_01_kevin_1",
        title: "Music To Walk Home By",
        artistName: "Tame Impala",
        artworkSrc: "https://picsum.photos/seed/scrobble-tame-1/400/400",
        metaItems: [
          { label: "Scrobbled 48m ago" },
          { label: "c/tameimpala", href: `/c/${COMMUNITY_IDS.tameImpala}` },
          { label: "8.1K plays" },
        ],
      }),
      createProfileScrobble({
        scrobbleId: "scr_01_kevin_2",
        title: "Open Eye Signal",
        artistName: "Jon Hopkins",
        artworkSrc: "https://picsum.photos/seed/scrobble-hopkins/400/400",
        metaItems: [
          { label: "Scrobbled 9h ago" },
          { label: "c/producers-only", href: `/c/${COMMUNITY_IDS.producersOnly}` },
          { label: "1.3K plays" },
        ],
      }),
    ],
  },
  [USER_IDS.shipit]: {
    userId: USER_IDS.shipit,
    handle: "u/shipit.pirate",
    displayName: "Ship It",
    bio: "Control plane, not hand-waving.",
    avatarSrc: "https://i.pravatar.cc/128?img=21",
    joinedLabel: "Joined Aug 2025",
    stats: [
      { label: "Posts", value: "42" },
      { label: "Communities", value: "5" },
      { label: "Followers", value: "2.1K" },
    ],
    posts: COMMUNITY_RECORDS[COMMUNITY_IDS.builders].posts,
    comments: [
      createProfileComment({
        commentId: "cmt_01_shipit_contracts",
        authorLabel: "u/shipit.pirate",
        body: "If the route contract is still speculative, keep the UI honest and ship the smallest shape that won’t need to be undone.",
        communityLabel: "c/builders",
        communityHref: `/c/${COMMUNITY_IDS.builders}`,
        postTitle: "Where should placeholder routes stop?",
        postHref: "/p/pst_01_route_contracts",
        scoreLabel: "88 score",
        timestampLabel: "1d",
      }),
    ],
    scrobbles: [
      createProfileScrobble({
        scrobbleId: "scr_01_shipit_1",
        title: "The Robots",
        artistName: "Kraftwerk",
        artworkSrc: "https://picsum.photos/seed/scrobble-kraftwerk/400/400",
        metaItems: [
          { label: "Scrobbled 2h ago" },
          { label: "c/builders", href: `/c/${COMMUNITY_IDS.builders}` },
          { label: "640 plays" },
        ],
      }),
    ],
  },
};
