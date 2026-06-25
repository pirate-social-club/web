import type { ScorableKaraokeLine, ScorableKaraokeWord } from "@pirate/karaoke-runtime";

import type { KaraokeStageLine, KaraokeStageToken } from "./karaoke-lyric-stage";

function stageTokensToScorableWords(
  tokens: readonly KaraokeStageToken[] | undefined,
  fallbackText: string,
  lineStartMs: number,
  lineEndMs: number,
): ScorableKaraokeWord[] {
  if (!tokens || tokens.length === 0) {
    return [
      {
        endMs: lineEndMs,
        startMs: lineStartMs,
        text: fallbackText,
      },
    ];
  }
  return tokens.map((token) => ({
    endMs: token.endMs,
    startMs: token.startMs,
    text: token.text,
  }));
}

export function toScorableKaraokeLines(stageLines: readonly KaraokeStageLine[]): ScorableKaraokeLine[] {
  return stageLines
    .filter((line) => line.startMs < line.endMs)
    .map((line, index) => {
      const id = line.id ?? `line-${index}-${line.startMs}`;
      return {
        endMs: line.endMs,
        lineId: id,
        lineIndex: index,
        scoredLineIndex: index,
        startMs: line.startMs,
        text: line.text,
        words: stageTokensToScorableWords(line.tokens, line.text, line.startMs, line.endMs),
      } satisfies ScorableKaraokeLine;
    });
}
