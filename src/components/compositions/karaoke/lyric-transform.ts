import type { KaraokeStageLine, KaraokeStageToken } from "./karaoke-lyric-stage";

export type RawKaraokeLine = Record<string, unknown> & {
  words?: unknown;
};

const lineTextFields = [
  "original_text",
  "text",
  "en_text",
  "zh_text",
  "ja_text",
  "ko_text",
  "vi_text",
  "id_text",
] as const;
const wordTextFields = ["text", "word"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value).replace(/\s+/g, " ").trim();
}

function readFirstText(record: Record<string, unknown>, fields: readonly string[]): string {
  for (const field of fields) {
    const text = normalizeText(record[field]);

    if (text) {
      return text;
    }
  }

  return "";
}

function readFirstRawText(record: Record<string, unknown>, fields: readonly string[]): string {
  for (const field of fields) {
    const value = record[field];

    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const numberValue = Number(trimmed);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function coerceMs(value: unknown, mode: "milliseconds" | "seconds-or-milliseconds"): number | undefined {
  const numberValue = readNumber(value);

  if (numberValue === undefined) {
    return undefined;
  }

  if (mode === "milliseconds") {
    return Math.round(numberValue);
  }

  return Math.round(Math.abs(numberValue) < 10000 ? numberValue * 1000 : numberValue);
}

function readMs(record: Record<string, unknown>, msKeys: readonly string[], secondKeys: readonly string[]): number | undefined {
  for (const key of msKeys) {
    const value = coerceMs(record[key], "milliseconds");

    if (value !== undefined) {
      return value;
    }
  }

  for (const key of secondKeys) {
    const value = coerceMs(record[key], "seconds-or-milliseconds");

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function readStartMs(record: Record<string, unknown>): number | undefined {
  return readMs(record, ["start_ms", "startMs"], ["start"]);
}

function readEndMs(record: Record<string, unknown>): number | undefined {
  return readMs(record, ["end_ms", "endMs"], ["end"]);
}

function isValidRange(startMs: number, endMs: number): boolean {
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;
}

function readValidRange(record: Record<string, unknown>): { endMs: number; startMs: number } | null {
  const startMs = readStartMs(record);
  const endMs = readEndMs(record);

  if (startMs === undefined || endMs === undefined || !isValidRange(startMs, endMs)) {
    return null;
  }

  return { endMs, startMs };
}

function shouldUseWordSpacing(lineText: string): boolean {
  return /\s/.test(lineText);
}

function shouldJoinToPrevious(text: string): boolean {
  return /^[!"'),.:;?\]}’”]/u.test(text);
}

const LATIN_LOOKALIKE_FOLD: Readonly<Record<string, string>> = {
  "А": "A",
  "В": "B",
  "Е": "E",
  "К": "K",
  "М": "M",
  "Н": "H",
  "О": "O",
  "Р": "P",
  "С": "C",
  "Т": "T",
  "Х": "X",
  "а": "a",
  "е": "e",
  "о": "o",
  "р": "p",
  "с": "c",
  "х": "x",
  "у": "y",
};

function foldLatinLookalikes(text: string): string {
  return [...text]
    .map((character) => LATIN_LOOKALIKE_FOLD[character] ?? character)
    .join("");
}

function findCanonicalTokenStart(lineText: string, tokenText: string, fromIndex: number): number {
  const exactIndex = lineText.indexOf(tokenText, fromIndex);
  if (exactIndex >= 0) {
    return exactIndex;
  }

  const foldedToken = foldLatinLookalikes(tokenText);
  for (let index = fromIndex; index + tokenText.length <= lineText.length; index += 1) {
    const candidate = lineText.slice(index, index + tokenText.length);
    if (foldLatinLookalikes(candidate) === foldedToken) {
      return index;
    }
  }

  return -1;
}

function alignTokensToCanonicalLine(
  lineText: string,
  tokens: readonly KaraokeStageToken[],
): KaraokeStageToken[] | null {
  const spans: Array<{ end: number; start: number }> = [];
  let cursor = 0;

  for (const token of tokens) {
    const start = findCanonicalTokenStart(lineText, token.text, cursor);
    if (start < 0) {
      return null;
    }
    const end = start + token.text.length;
    spans.push({ end, start });
    cursor = end;
  }

  return tokens.map((token, index) => {
    const span = spans[index];
    const nextSpan = spans[index + 1];
    if (!span) {
      return token;
    }

    return {
      ...token,
      // The source lyric is canonical for visible/scorable text. Alignment
      // providers contribute timing only; this also removes mixed-script
      // lookalikes without changing legitimate non-Latin lyrics.
      text: lineText.slice(span.start, span.end),
      trailing: nextSpan ? lineText.slice(span.end, nextSpan.start) : "",
    };
  });
}

function isSectionMarker(text: string): boolean {
  return /^\[[^\]]+\]$/u.test(normalizeText(text));
}

function isAdlibLine(text: string): boolean {
  return /^(?:\([^()]*\)[\s,]*)+$/u.test(text.trim());
}

function getTokenTrailing(
  lineText: string,
  tokens: readonly Pick<KaraokeStageToken, "text">[],
  index: number,
): string {
  if (index >= tokens.length - 1 || !shouldUseWordSpacing(lineText)) {
    return "";
  }

  return shouldJoinToPrevious(tokens[index + 1].text) ? "" : " ";
}

function normalizeWords(
  line: Record<string, unknown>,
  lineText: string,
): KaraokeStageToken[] {
  if (!Array.isArray(line.words)) {
    return [];
  }

  const tokens = line.words
    .filter(isRecord)
    .map((word) => {
      const text = readFirstText(word, wordTextFields);
      const range = readValidRange(word);

      if (!text || !range) {
        return null;
      }

      return {
        endMs: range.endMs,
        startMs: range.startMs,
        text,
      } satisfies KaraokeStageToken;
    })
    .filter((token): token is KaraokeStageToken => token !== null)
    .sort((a, b) => a.startMs - b.startMs);

  if (tokens.length === 0) {
    return [];
  }

  const canonicalTokens = alignTokensToCanonicalLine(lineText, tokens);
  if (canonicalTokens) {
    return canonicalTokens;
  }

  return tokens.map((token, index) => ({
    ...token,
    trailing: getTokenTrailing(lineText, tokens, index),
  }));
}

function looksLikeTokenStream(rawLines: readonly RawKaraokeLine[]): boolean {
  const records = rawLines.filter(isRecord);

  if (records.length < 2 || records.some((line) => Array.isArray(line.words))) {
    return false;
  }

  return records.some((line) => /[\r\n]/u.test(readFirstRawText(line, lineTextFields)));
}

function lineTextFromTokens(tokens: readonly KaraokeStageToken[]): string {
  return tokens
    .map((token) => `${token.text}${token.trailing ?? ""}`)
    .join("")
    .replace(/\s+/gu, " ")
    .trim();
}

function groupTokenStreamLines(rawLines: readonly RawKaraokeLine[]): KaraokeStageLine[] {
  const lines: KaraokeStageLine[] = [];
  let tokens: KaraokeStageToken[] = [];

  const flushLine = () => {
    if (tokens.length === 0) {
      return;
    }

    const text = lineTextFromTokens(tokens);
    if (!text || isAdlibLine(text)) {
      tokens = [];
      return;
    }

    const firstToken = tokens[0];
    const lastToken = tokens[tokens.length - 1];
    if (!firstToken || !lastToken) {
      tokens = [];
      return;
    }

    lines.push({
      endMs: lastToken.endMs,
      id: `token-stream-line-${lines.length}-${firstToken.startMs}`,
      startMs: firstToken.startMs,
      text,
      tokens,
    });
    tokens = [];
  };

  for (const rawLine of rawLines) {
    if (!isRecord(rawLine)) {
      continue;
    }

    const rawText = readFirstRawText(rawLine, lineTextFields);
    const text = normalizeText(rawText);

    if (/[\r\n]/u.test(rawText)) {
      flushLine();
      continue;
    }

    if (!text) {
      if (/\s/u.test(rawText) && tokens.length > 0) {
        tokens[tokens.length - 1] = {
          ...tokens[tokens.length - 1],
          trailing: " ",
        };
      }
      continue;
    }

    if (isSectionMarker(text)) {
      flushLine();
      continue;
    }

    const range = readValidRange(rawLine);
    if (!range) {
      continue;
    }

    tokens.push({
      endMs: range.endMs,
      startMs: range.startMs,
      text,
      trailing: "",
    });
  }

  flushLine();

  return lines.sort((a, b) => a.startMs - b.startMs);
}

export function toKaraokeStageLines(rawLines: readonly RawKaraokeLine[] | undefined | null): KaraokeStageLine[] {
  if (!rawLines || rawLines.length === 0) {
    return [];
  }

  if (looksLikeTokenStream(rawLines)) {
    return groupTokenStreamLines(rawLines);
  }

  const lines: KaraokeStageLine[] = [];
  const seenIds = new Map<string, number>();

  const createLineId = (baseId: string) => {
    const duplicateIndex = seenIds.get(baseId) ?? 0;
    seenIds.set(baseId, duplicateIndex + 1);

    return duplicateIndex === 0 ? baseId : `${baseId}-${duplicateIndex}`;
  };

  for (const [index, rawLine] of rawLines.entries()) {
    if (!isRecord(rawLine)) {
      continue;
    }
    if (rawLine.kind === "section" || rawLine.kind === "adlib") {
      continue;
    }

    const text = readFirstText(rawLine, lineTextFields);
    const range = readValidRange(rawLine);

    if (!text || !range) {
      continue;
    }

    const wordTokens = normalizeWords(rawLine, text);
    const idValue = rawLine.id;
    const baseId = typeof idValue === "string" || typeof idValue === "number"
      ? String(idValue)
      : `line-${index}-${range.startMs}`;

    lines.push({
      endMs: range.endMs,
      id: createLineId(baseId),
      startMs: range.startMs,
      text,
      tokens: wordTokens.length > 0
        ? wordTokens
        : [{
            endMs: range.endMs,
            startMs: range.startMs,
            text,
            trailing: "",
          }],
    });
  }

  return lines.sort((a, b) => a.startMs - b.startMs);
}
