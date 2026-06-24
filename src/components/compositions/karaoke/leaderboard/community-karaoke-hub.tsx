import * as React from "react";
import { MicrophoneStage, MusicNote, Trophy } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import { bpsToPercent, type CommunityKaraokeSongStanding } from "./karaoke-leaderboard.types";

export interface CommunityKaraokeHubProps {
  communityName?: string;
  status?: "ready" | "loading" | "error";
  songs?: CommunityKaraokeSongStanding[];
  onSing: (postId: string) => void;
  onViewRankings: (postId: string) => void;
  onRetry?: () => void;
  className?: string;
}

function SongCard({
  onSing,
  onViewRankings,
  song,
}: {
  song: CommunityKaraokeSongStanding;
  onSing: (postId: string) => void;
  onViewRankings: (postId: string) => void;
}) {
  const hasBoard = song.participantCount > 0;
  const sung = song.currentUserBestScoreBps != null;
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-border-soft p-4">
      <div className="flex items-center gap-3">
        {song.artworkUrl ? (
          <img alt="" aria-hidden="true" className="size-12 shrink-0 rounded-[var(--radius-lg)] object-cover" src={song.artworkUrl} />
        ) : (
          <div aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-lg)] bg-muted text-muted-foreground">
            <MusicNote className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Type as="p" className="truncate font-semibold" variant="body-strong">
            {song.title}
          </Type>
          {song.artistName ? (
            <Type as="p" className="truncate text-muted-foreground" variant="caption">
              {song.artistName}
            </Type>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {hasBoard ? (
          <>
            <Type as="span" className="inline-flex items-center gap-1 text-muted-foreground" variant="caption">
              <Trophy className="size-4" weight="fill" />
              {song.leadingScoreBps != null ? `Top ${bpsToPercent(song.leadingScoreBps)}` : "—"}
            </Type>
            <Type as="span" className="text-muted-foreground" variant="caption">
              {song.participantCount} {song.participantCount === 1 ? "singer" : "singers"}
            </Type>
          </>
        ) : (
          <Type as="span" className="text-muted-foreground" variant="caption">
            No scores yet — be the first
          </Type>
        )}
        {sung ? (
          <Type as="span" className="tabular-nums" variant="caption">
            Your best {bpsToPercent(song.currentUserBestScoreBps as number)}
            {song.currentUserRank != null ? ` · #${song.currentUserRank}` : ""}
          </Type>
        ) : (
          <Type as="span" className="text-muted-foreground" variant="caption">
            Not sung yet
          </Type>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          leadingIcon={<MicrophoneStage className="size-4" weight="fill" />}
          onClick={() => onSing(song.postId)}
          size="sm"
        >
          {sung ? "Sing again" : "Sing"}
        </Button>
        <Button
          className="flex-1"
          disabled={!hasBoard}
          onClick={() => onViewRankings(song.postId)}
          size="sm"
          variant="secondary"
        >
          View rankings
        </Button>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-48 place-items-center px-6 text-center">{children}</div>;
}

/**
 * Community karaoke hub — a discovery/index of the community's karaoke-enabled
 * songs and the viewer's standing on each. NOT one combined leaderboard and NOT a
 * cross-song ranking of people (that needs a separate points system; see spec §10).
 */
export function CommunityKaraokeHub({
  className,
  communityName,
  onRetry,
  onSing,
  onViewRankings,
  songs,
  status = "ready",
}: CommunityKaraokeHubProps) {
  return (
    <section
      aria-label="Community karaoke"
      className={cn("mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6 sm:px-6", className)}
    >
      <div className="flex items-center gap-2">
        <MicrophoneStage className="size-6" weight="fill" />
        <Type as="h1" variant="h3">
          Karaoke{communityName ? ` · ${communityName}` : ""}
        </Type>
      </div>

      {status === "loading" ? (
        <Centered><Spinner className="size-8 text-muted-foreground" /></Centered>
      ) : status === "error" ? (
        <Centered>
          <div className="flex flex-col items-center gap-3">
            <Type as="p" className="text-muted-foreground" variant="body">
              Couldn’t load karaoke songs.
            </Type>
            <Button disabled={!onRetry} onClick={onRetry} size="sm" variant="secondary">
              Try again
            </Button>
          </div>
        </Centered>
      ) : songs && songs.length > 0 ? (
        <div className="flex flex-col gap-3">
          {songs.map((song) => (
            <SongCard key={song.postId} onSing={onSing} onViewRankings={onViewRankings} song={song} />
          ))}
        </div>
      ) : (
        <Centered>
          <Type as="p" className="text-muted-foreground" variant="body">
            No karaoke songs in this community yet.
          </Type>
        </Centered>
      )}
    </section>
  );
}
