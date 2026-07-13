import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunitySidebar } from "@/components/compositions/community/sidebar/community-sidebar";
import { PostCard } from "@/components/compositions/posts/post-card/post-card";

const noop = () => undefined;

const communityAvatar = "/pitch-deck/swmg-community.png";
const gandalfAvatar = "/pitch-deck/gandalf-swmg.png";
const merlinAvatar = "/pitch-deck/merlin-swmg.png";
const shadowAnthemArtwork = "/pitch-deck/shadow-treasury.png";
const punkWizardArtwork = "/pitch-deck/punk-wizard-song.png";

function MusicCommercePitch() {
  return (
    <main className="min-h-svh bg-background p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 md:flex-row">
        <section className="min-w-0 flex-1 overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card shadow-xl">
          <PostCard
            byline={{
              author: {
                avatarSeed: "gandalf-shadow-wizard-money-gang",
                avatarSrc: gandalfAvatar,
                kind: "user",
                label: "gandalf.swmg",
              },
              timestampLabel: "3m ago",
            }}
            className="bg-card"
            content={{
              accessMode: "locked",
              artworkSrc: shadowAnthemArtwork,
              durationLabel: "3:33",
              durationMs: 213000,
              listingMode: "listed",
              listingStatus: "active",
              onBuy: noop,
              onPlay: noop,
              onSeek: noop,
              playbackState: "idle",
              previewDurationMs: 30000,
              priceLabel: "$.33",
              rightsBasis: "derivative",
              songMode: "remix",
              title: "Shadow Treasury (Remix)",
              type: "song",
              upstreamAttributions: [{
                artist: "morgana.swmg",
                assetId: "ast_dark_arts_dividend",
                href: "#dark-arts-dividend",
                relationshipType: "remix_of",
                title: "Dark Arts Dividend",
              }],
            }}
            engagement={{ commentCount: 2, score: 6, viewerVote: "up" }}
            identityPresentation="author_primary"
            menuItems={[{ key: "copy-link", label: "Copy link" }]}
            onComment={noop}
            onMenuAction={noop}
            onShare={noop}
            onVote={noop}
            title="First 100 buyers get access to the livestream tomorrow!!"
            viewContext="community"
          />

          <PostCard
            byline={{
              author: {
                avatarSeed: "merlin-shadow-wizard-money-gang",
                avatarSrc: merlinAvatar,
                kind: "user",
                label: "merlin.swmg",
              },
              timestampLabel: "6h ago",
            }}
            className="bg-card last:border-b-0"
            content={{
              accessMode: "public",
              artworkSrc: punkWizardArtwork,
              durationLabel: "2:41",
              durationMs: 161000,
              karaoke: { rewardLabel: "$.10", status: "ready" },
              onKaraoke: noop,
              onPlay: noop,
              onSeek: noop,
              onStreaks: noop,
              onStudy: noop,
              playbackState: "idle",
              streakSummary: {
                entries: [{
                  best_streak: 32,
                  current_streak: 30,
                  identity: {
                    avatar_ref: "/pitch-deck/dumbledore-swmg.png",
                    display_name: "dumbledore.swmg",
                    handle: "dumbledore.swmg",
                    user_id: "usr_dumbledore_swmg",
                  },
                  is_viewer: false,
                  last_qualified_date: "2026-07-13",
                  rank: 1,
                  streak_started_date: "2026-06-14",
                  total_qualified_days: 35,
                }],
                totalActiveStreaks: 69,
                viewer: null,
              },
              study: { exerciseCount: 13, rewardLabel: "$.10", status: "ready" },
              title: "Punk Wizard",
              type: "song",
            }}
            engagement={{ commentCount: 4, score: 10, viewerVote: "up" }}
            identityPresentation="author_primary"
            menuItems={[{ key: "copy-link", label: "Copy link" }]}
            onComment={noop}
            onMenuAction={noop}
            onShare={noop}
            onVote={noop}
            title="Merlin went punk. Play it before it gets banned."
            viewContext="community"
          />
        </section>

        <div className="min-w-0 w-full md:w-80 md:shrink-0">
          <CommunitySidebar
            avatarSrc={communityAvatar}
            communityId="cmt_shadow_wizard_money_gang"
            createdAt="2026-07-13T00:00:00Z"
            description="Rap music collective. We love casting spells"
            displayName="Shadow Wizard Money Gang"
            followerCount={154}
            gates={[
              { gateType: "unique_human", label: "Palm scan", provider: "very", status: "unknown" },
              { gateType: "unique_human", label: "ID check (ZKPassport)", provider: "self", status: "unknown" },
              { gateType: "erc721_holding", label: "CryptoPunk NFT holder", status: "unknown" },
              { gateType: "wallet_score", label: "Wallet score 20+", provider: "passport", status: "unknown" },
            ]}
            memberCount={69}
            membershipMode="gated"
            moderators={[]}
            requirementsMode="any"
          />
        </div>
      </div>
    </main>
  );
}

const meta = {
  title: "Pitch Deck/Shadow Wizard Money Gang",
  component: MusicCommercePitch,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof MusicCommercePitch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};
