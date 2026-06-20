export const KARAOKE_LINE_WINDOW_LEAD_MS = 300;
export const KARAOKE_LINE_WINDOW_TRAIL_MS = 800;

export type KaraokeTimingTrend = "early" | "late" | "mixed" | "on_time";

export interface ScorableKaraokeWord {
  text: string;
  startMs: number;
  endMs: number;
}

export interface ScorableKaraokeLine {
  lineId: string;
  lineIndex: number;
  scoredLineIndex: number;
  text: string;
  startMs: number;
  endMs: number;
  words: ScorableKaraokeWord[];
}

export interface KaraokeRecognizedWord {
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number | null;
  final?: boolean;
  source?: "stt" | "reference" | "manual";
}

export interface KaraokeLineBucket {
  lineId: string;
  lineIndex: number;
  scoredLineIndex: number;
  expectedLine: ScorableKaraokeLine;
  windowStartMs: number;
  windowEndMs: number;
  recognizedWords: KaraokeRecognizedWord[];
  transcript: string;
  confidenceMean: number | null;
  finalizedReason: "line_end" | "asr_final" | "timeout" | "seek" | "session_end" | "provider_failed";
}

export interface KaraokeTextScore {
  score: number;
  wer: number;
  keywordCoverage: number;
  phoneticQuality: number;
  phoneticCoverage: number;
  phoneticAvailable: boolean;
  confidenceMean: number | null;
  missedWords: string[];
}

export interface KaraokeTimingScore {
  score: number;
  meanAbsDeltaMs: number;
  signedMeanDeltaMs: number;
  matchedWordCount: number;
  timingTrend: KaraokeTimingTrend;
}

export interface KaraokeLineScore {
  lineId: string;
  lineIndex: number;
  scoredLineIndex: number;
  transcript: string;
  recognizedWords: KaraokeRecognizedWord[];
  textScore: KaraokeTextScore;
  timingScore: KaraokeTimingScore | null;
  confidenceScore: number | null;
  score: number;
  finalizedReason: KaraokeLineBucket["finalizedReason"];
  /**
   * The line could not be reliably measured (provider/stream failure), as
   * opposed to being sung poorly. Uncertain lines are excluded from the
   * performance averages so an infrastructure failure never penalizes the singer.
   */
  uncertain: boolean;
}

export interface KaraokeSessionSummary {
  finalScore: number;
  lyricsScore: number;
  timingScore: number | null;
  confidenceMean: number | null;
  lineCount: number;
  scoredLineCount: number;
  noRecognitionLineCount: number;
  phoneticUnavailableLineCount: number;
  lowConfidenceLineCount: number;
  timingTrend: KaraokeTimingTrend;
  strongestLines: KaraokeLineScore[];
  weakestLines: KaraokeLineScore[];
  missedWords: string[];
}

const SIMILARITY_COVERAGE_THRESHOLD = 0.72;
// Word-matching tolerance (which recognized word pairs with which expected word).
// Deliberately wide so matching is robust to STT timing noise — do NOT tighten
// this for scoring, or words stop pairing.
const TIMING_SCORE_MAX_DELTA_MS = 750;
// Line-timing *score* window — tighter than the matching tolerance so the timing
// component differentiates good-vs-great singing (a leaderboard amplifies score
// dynamic range; 750ms made timing nearly flat across competent singers).
const TIMING_SCORE_WINDOW_MS = 400;
const TIMING_ON_TIME_MS = 90;
const TIMING_MIXED_SIGN_MS = 120;
const LOW_CONFIDENCE_THRESHOLD = 0.5;
// Keeps unrelated words from jumping to a nearby overlapping line solely because the timing is close.
const BUCKETIZER_TEXT_MISMATCH_PENALTY_MS = 250;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function midpointMs(value: { startMs: number; endMs: number }): number {
  return (value.startMs + value.endMs) / 2;
}

function normalizeKaraokeText(value: string): string {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/\bwon['’]?t\b/gu, "will not")
    .replace(/\bcan['’]?t\b/gu, "can not")
    .replace(/\bain['’]?t\b/gu, "is not")
    .replace(/\blet['’]?s\b/gu, "let us")
    .replace(/\b(i|you|we|they)['’]?ve\b/gu, "$1 have")
    .replace(/\b(i|you|we|they)['’]?ll\b/gu, "$1 will")
    .replace(/\b(i|you|we|they)['’]?re\b/gu, "$1 are")
    .replace(/\b(i)['’]?m\b/gu, "$1 am")
    .replace(/\b(i|you|he|she|it|we|they)['’]?d\b/gu, "$1 would")
    .replace(/\b(it|that|there|here|what|who|how|where|when|why)['’]?s\b/gu, "$1 is")
    .replace(/\b([a-z]{3,})in['’](?=\s|$)/gu, "$1ing")
    .replace(/\b['’]?til\b/gu, "till")
    .replace(/\b(?:ima|i['’]?ma|imma)\b/gu, "i am going to")
    .replace(/\btryna\b/gu, "trying to")
    .replace(/\b['’]?(?:cause|cuz|coz)\b/gu, "because")
    .replace(/\bya\b/gu, "you")
    .replace(/\by['’]?all\b/gu, "you all")
    .replace(/\bgonna\b/gu, "going to")
    .replace(/\bwanna\b/gu, "want to")
    .replace(/\bgotta\b/gu, "got to")
    .replace(/\bkinda\b/gu, "kind of")
    .replace(/['’]/gu, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function tokenizeKaraokeText(value: string): string[] {
  const normalized = normalizeKaraokeText(value);

  if (!normalized) {
    return [];
  }

  return normalized.split(" ").filter((token) => token.length > 0);
}

function levenshteinDistance<T>(left: T[], right: T[]): number {
  if (left.length === 0) {
    return right.length;
  }
  if (right.length === 0) {
    return left.length;
  }

  const prev = new Array<number>(right.length + 1);
  const curr = new Array<number>(right.length + 1);
  for (let j = 0; j <= right.length; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= left.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= right.length; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[right.length];
}

function keywordCoverage(expectedTokens: string[], transcriptTokens: string[]): number {
  if (expectedTokens.length === 0) {
    return transcriptTokens.length === 0 ? 1 : 0;
  }

  const stop = new Set(["the", "a", "an", "and", "or", "to", "of", "in", "on", "at", "is", "are", "it"]);
  const expectedKeywords = expectedTokens.filter((token) => token.length >= 3 && !stop.has(token));
  const target = expectedKeywords.length > 0 ? expectedKeywords : expectedTokens;
  const transcriptSet = new Set(transcriptTokens);
  let hits = 0;

  for (const token of target) {
    if (transcriptSet.has(token)) {
      hits += 1;
    }
  }

  return hits / target.length;
}

function latinLettersOnly(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z]/gu, "");
}

const SIMILAR_PHONEME_PAIRS: Array<[string, string]> = [
  ["AA", "AH"], ["AE", "EH"], ["IH", "IY"], ["UH", "UW"], ["AO", "OW"],
  ["P", "B"], ["T", "D"], ["K", "G"], ["F", "V"], ["S", "Z"],
  ["TH", "DH"], ["SH", "ZH"], ["CH", "JH"], ["M", "N"], ["L", "R"],
  ["W", "Y"], ["ER", "R"],
];

const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

const SIMILAR_PHONEME_MAP: Map<string, Set<string>> = (() => {
  const map = new Map<string, Set<string>>();

  for (const [left, right] of SIMILAR_PHONEME_PAIRS) {
    if (!map.has(left)) {
      map.set(left, new Set());
    }
    if (!map.has(right)) {
      map.set(right, new Set());
    }
    map.get(left)?.add(right);
    map.get(right)?.add(left);
  }

  return map;
})();

const IRREGULAR_ARPABET: Record<string, string[]> = {
  are: ["AA", "R"],
  be: ["B", "IY"],
  been: ["B", "IH", "N"],
  could: ["K", "UH", "D"],
  do: ["D", "UW"],
  does: ["D", "AH", "Z"],
  done: ["D", "AH", "N"],
  dont: ["D", "OW", "N", "T"],
  from: ["F", "R", "AH", "M"],
  going: ["G", "OW", "IH", "NG"],
  have: ["HH", "AE", "V"],
  hello: ["HH", "AH", "L", "OW"],
  i: ["AY"],
  im: ["AY", "M"],
  ive: ["AY", "V"],
  know: ["N", "OW"],
  one: ["W", "AH", "N"],
  said: ["S", "EH", "D"],
  says: ["S", "EH", "Z"],
  some: ["S", "AH", "M"],
  the: ["DH", "AH"],
  their: ["DH", "EH", "R"],
  there: ["DH", "EH", "R"],
  they: ["DH", "EY"],
  though: ["DH", "OW"],
  thought: ["TH", "AO", "T"],
  through: ["TH", "R", "UW"],
  to: ["T", "UW"],
  two: ["T", "UW"],
  want: ["W", "AA", "N", "T"],
  was: ["W", "AA", "Z"],
  we: ["W", "IY"],
  were: ["W", "ER"],
  what: ["W", "AH", "T"],
  who: ["HH", "UW"],
  why: ["W", "AY"],
  you: ["Y", "UW"],
  your: ["Y", "AO", "R"],
  bought: ["B", "AO", "T"],
  brought: ["B", "R", "AO", "T"],
  cough: ["K", "AO", "F"],
  dough: ["D", "OW"],
  enough: ["IH", "N", "AH", "F"],
  fought: ["F", "AO", "T"],
  rough: ["R", "AH", "F"],
  tough: ["T", "AH", "F"],
};

const COMMON_WORD_ARPABET: Record<string, string[]> = {
  about: ["AH", "B", "AW", "T"],
  after: ["AE", "F", "T", "ER"],
  again: ["AH", "G", "EH", "N"],
  all: ["AO", "L"],
  also: ["AO", "L", "S", "OW"],
  and: ["AE", "N", "D"],
  any: ["EH", "N", "IY"],
  back: ["B", "AE", "K"],
  because: ["B", "IH", "K", "AO", "Z"],
  before: ["B", "IH", "F", "AO", "R"],
  being: ["B", "IY", "IH", "NG"],
  between: ["B", "IH", "T", "W", "IY", "N"],
  but: ["B", "AH", "T"],
  by: ["B", "AY"],
  can: ["K", "AE", "N"],
  cant: ["K", "AE", "N", "T"],
  come: ["K", "AH", "M"],
  day: ["D", "EY"],
  even: ["IY", "V", "AH", "N"],
  every: ["EH", "V", "R", "IY"],
  first: ["F", "ER", "S", "T"],
  for: ["F", "AO", "R"],
  get: ["G", "EH", "T"],
  give: ["G", "IH", "V"],
  good: ["G", "UH", "D"],
  had: ["HH", "AE", "D"],
  has: ["HH", "AE", "Z"],
  her: ["HH", "ER"],
  here: ["HH", "IH", "R"],
  him: ["HH", "IH", "M"],
  his: ["HH", "IH", "Z"],
  how: ["HH", "AW"],
  if: ["IH", "F"],
  into: ["IH", "N", "T", "UW"],
  its: ["IH", "T", "S"],
  just: ["JH", "AH", "S"],
  like: ["L", "AY", "K"],
  look: ["L", "UH", "K"],
  make: ["M", "EY", "K"],
  man: ["M", "AE", "N"],
  many: ["M", "EH", "N", "IY"],
  me: ["M", "IY"],
  more: ["M", "AO", "R"],
  most: ["M", "OW", "S", "T"],
  much: ["M", "AH", "CH"],
  must: ["M", "AH", "S", "T"],
  my: ["M", "AY"],
  new: ["N", "UW"],
  no: ["N", "OW"],
  not: ["N", "AA", "T"],
  now: ["N", "AW"],
  of: ["AH", "V"],
  on: ["AA", "N"],
  only: ["OW", "N", "L", "IY"],
  or: ["AO", "R"],
  other: ["AH", "DH", "ER"],
  our: ["AW", "ER"],
  out: ["AW", "T"],
  over: ["OW", "V", "ER"],
  people: ["P", "IY", "P", "AH", "L"],
  right: ["R", "AY", "T"],
  see: ["S", "IY"],
  she: ["SH", "IY"],
  should: ["SH", "UH", "D"],
  so: ["S", "OW"],
  take: ["T", "EY", "K"],
  than: ["DH", "AE", "N"],
  that: ["DH", "AE", "T"],
  them: ["DH", "EH", "M"],
  then: ["DH", "EH", "N"],
  these: ["DH", "IY", "Z"],
  thing: ["TH", "IH", "NG"],
  think: ["TH", "IH", "NG", "K"],
  this: ["DH", "IH", "S"],
  time: ["T", "AY", "M"],
  too: ["T", "UW"],
  use: ["Y", "UW", "Z"],
  very: ["V", "EH", "R", "IY"],
  way: ["W", "EY"],
  well: ["W", "EH", "L"],
  when: ["W", "EH", "N"],
  which: ["W", "IH", "CH"],
  while: ["W", "AY", "L"],
  will: ["W", "IH", "L"],
  with: ["W", "IH", "TH"],
  word: ["W", "ER", "D"],
  work: ["W", "ER", "K"],
  world: ["W", "ER", "L", "D"],
  would: ["W", "UH", "D"],
  yeah: ["Y", "EH"],
  yes: ["Y", "EH", "S"],
};

const CMU_FALLBACK_ARPABET: Record<string, string[]> = {
  ...COMMON_WORD_ARPABET,
  ...IRREGULAR_ARPABET,
};

const STEM_SUFFIXES = [
  "ingly", "edly", "tion", "sion", "ness", "ment", "able", "ible",
  "ing", "ied", "ies", "ers", "est", "ful", "ous", "ive",
  "ed", "er", "es", "ly", "s",
];

const MULTI_CHAR_PHONEMES_RAW: Array<{ seq: string; phones: string[] }> = [
  { seq: "through", phones: ["TH", "R", "UW"] },
  { seq: "ought", phones: ["AO", "T"] },
  { seq: "ough", phones: ["AH", "F"] },
  { seq: "ight", phones: ["AY", "T"] },
  { seq: "ould", phones: ["UH", "D"] },
  { seq: "tion", phones: ["SH", "AH", "N"] },
  { seq: "sion", phones: ["ZH", "AH", "N"] },
  { seq: "ture", phones: ["CH", "ER"] },
  { seq: "eigh", phones: ["EY"] },
  { seq: "ei", phones: ["EY"] },
  { seq: "igh", phones: ["AY"] },
  { seq: "dge", phones: ["JH"] },
  { seq: "tch", phones: ["CH"] },
  { seq: "ph", phones: ["F"] },
  { seq: "sh", phones: ["SH"] },
  { seq: "ch", phones: ["CH"] },
  { seq: "th", phones: ["TH"] },
  { seq: "ng", phones: ["NG"] },
  { seq: "ck", phones: ["K"] },
  { seq: "qu", phones: ["K", "W"] },
  { seq: "wr", phones: ["R"] },
  { seq: "kn", phones: ["N"] },
  { seq: "gn", phones: ["N"] },
  { seq: "wh", phones: ["W"] },
  { seq: "ee", phones: ["IY"] },
  { seq: "ea", phones: ["IY"] },
  { seq: "oo", phones: ["UW"] },
  { seq: "ou", phones: ["AW"] },
  { seq: "ow", phones: ["AW"] },
  { seq: "oi", phones: ["OY"] },
  { seq: "oy", phones: ["OY"] },
  { seq: "ai", phones: ["EY"] },
  { seq: "ay", phones: ["EY"] },
  { seq: "au", phones: ["AO"] },
  { seq: "aw", phones: ["AO"] },
  { seq: "er", phones: ["ER"] },
  { seq: "ir", phones: ["ER"] },
  { seq: "ur", phones: ["ER"] },
];

const MULTI_CHAR_PHONEMES = [...MULTI_CHAR_PHONEMES_RAW].sort((a, b) => b.seq.length - a.seq.length);

function phoneticKey(raw: string): string {
  let value = latinLettersOnly(raw);
  if (!value) {
    return "";
  }

  value = value
    .replace(/^kn/u, "n")
    .replace(/^gn/u, "n")
    .replace(/^wr/u, "r")
    .replace(/^wh/u, "w")
    .replace(/^x/u, "s")
    .replace(/mb$/u, "m")
    .replace(/tch/gu, "ch")
    .replace(/dge/gu, "j")
    .replace(/ph/gu, "f")
    .replace(/qu/gu, "k")
    .replace(/ck/gu, "k")
    .replace(/sch/gu, "sk")
    .replace(/sh/gu, "x")
    .replace(/ch/gu, "x")
    .replace(/th/gu, "th")
    .replace(/dg/gu, "j")
    .replace(/c(?=[eiy])/gu, "s")
    .replace(/c/gu, "k")
    .replace(/g(?=[eiy])/gu, "j")
    .replace(/x/gu, "ks")
    .replace(/z/gu, "s")
    .replace(/(.)\1+/gu, "$1");

  if (value.length <= 1) {
    return value;
  }

  return `${value[0]}${value.slice(1).replace(/[aeiouy]/gu, "")}`;
}

function normalizedStringSimilarity(leftRaw: string, rightRaw: string): number {
  const left = leftRaw.trim();
  const right = rightRaw.trim();
  if (!left && !right) {
    return 1;
  }
  if (!left || !right) {
    return 0;
  }

  const dist = levenshteinDistance(left.split(""), right.split(""));
  const maxLen = Math.max(left.length, right.length);
  if (maxLen <= 0) {
    return 1;
  }

  return Math.max(0, 1 - (dist / maxLen));
}

function stemCandidateWords(word: string): string[] {
  if (!word) {
    return [];
  }

  const out: string[] = [word];
  for (const suffix of STEM_SUFFIXES) {
    if (!word.endsWith(suffix) || word.length <= suffix.length + 2) {
      continue;
    }

    const base = word.slice(0, -suffix.length);
    out.push(base);
    if (!base.endsWith("e")) {
      out.push(`${base}e`);
    }
  }

  return [...new Set(out.filter((value) => value.length > 0))];
}

function charToPhones(ch: string, next: string, isLast: boolean, wordLength: number): string[] {
  switch (ch) {
    case "a":
      return isLast ? ["AH"] : ["AE"];
    case "b":
      return ["B"];
    case "c":
      return ["K"];
    case "d":
      return ["D"];
    case "e":
      return isLast ? ["IY"] : ["EH"];
    case "f":
      return ["F"];
    case "g":
      return ["G"];
    case "h":
      return ["HH"];
    case "i":
      return ["IH"];
    case "j":
      return ["JH"];
    case "k":
      return ["K"];
    case "l":
      return ["L"];
    case "m":
      return ["M"];
    case "n":
      return ["N"];
    case "o":
      return isLast ? ["OW"] : ["AA"];
    case "p":
      return ["P"];
    case "q":
      return ["K"];
    case "r":
      return ["R"];
    case "s":
      return ["S"];
    case "t":
      return ["T"];
    case "u":
      return ["AH"];
    case "v":
      return ["V"];
    case "w":
      return ["W"];
    case "x":
      return ["K", "S"];
    case "y":
      if (isLast) {
        return wordLength <= 3 ? ["AY"] : ["IY"];
      }
      if (!next || !VOWELS.has(next)) {
        return ["IH"];
      }
      return ["Y"];
    case "z":
      return ["Z"];
    default:
      return [];
  }
}

function wordToApproxArpabet(raw: string): string[] {
  const word = latinLettersOnly(raw);
  if (!word) {
    return [];
  }

  for (const candidate of stemCandidateWords(word)) {
    const lookup = CMU_FALLBACK_ARPABET[candidate];
    if (lookup) {
      return lookup;
    }
  }

  const phones: string[] = [];
  const trailingOwAwWords = new Set([
    "how", "now", "cow", "wow", "brow", "brown", "crown", "down", "town", "frown", "gown",
  ]);
  let i = 0;

  while (i < word.length) {
    const ch = word[i];
    const isLast = i === word.length - 1;
    const prev = i > 0 ? word[i - 1] : "";
    const next = i + 1 < word.length ? word[i + 1] : "";

    if (!isLast && next === "r" && /[aeiou]/u.test(ch)) {
      if (ch === "a") {
        phones.push("AA", "R");
      } else if (ch === "e" || ch === "i" || ch === "u") {
        phones.push("ER");
      } else if (ch === "o") {
        phones.push("AO", "R");
      } else {
        phones.push("ER");
      }
      i += 2;
      continue;
    }

    if (ch === "o" && next === "w" && i === word.length - 2) {
      phones.push(trailingOwAwWords.has(word) ? "AW" : "OW");
      i += 2;
      continue;
    }

    let matched = false;
    for (const candidate of MULTI_CHAR_PHONEMES) {
      if (word.startsWith(candidate.seq, i)) {
        phones.push(...candidate.phones);
        i += candidate.seq.length;
        matched = true;
        break;
      }
    }
    if (matched) {
      continue;
    }

    if (
      ch === "e"
      && isLast
      && word.length > 3
      && !word.endsWith("le")
      && !word.endsWith("ue")
      && !VOWELS.has(prev)
      && /[aeiou]/u.test(word.slice(0, -1))
    ) {
      i += 1;
      continue;
    }
    if (ch === "c" && i + 1 < word.length && /[eiy]/u.test(word[i + 1])) {
      phones.push("S");
      i += 1;
      continue;
    }
    if (ch === "g" && i + 1 < word.length && /[eiy]/u.test(word[i + 1])) {
      phones.push("JH");
      i += 1;
      continue;
    }

    phones.push(...charToPhones(ch, next, isLast, word.length));
    i += 1;
  }

  const compact: string[] = [];
  for (const phone of phones) {
    if (!phone) {
      continue;
    }
    if (compact.length > 0 && compact[compact.length - 1] === phone) {
      continue;
    }
    compact.push(phone);
  }

  return compact;
}

function phonemeDistance(left: string[], right: string[]): number {
  if (left.length === 0) {
    return right.length;
  }
  if (right.length === 0) {
    return left.length;
  }

  const prev = new Array<number>(right.length + 1);
  const curr = new Array<number>(right.length + 1);
  for (let j = 0; j <= right.length; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= left.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const l = left[i - 1];
      const r = right[j - 1];
      const similar = SIMILAR_PHONEME_MAP.get(l)?.has(r) === true;
      const subCost = l === r ? 0 : (similar ? 0.35 : 1);
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + subCost);
    }
    for (let j = 0; j <= right.length; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[right.length];
}

function phonemeSimilarity(expectedRaw: string, transcriptRaw: string): number {
  const expectedPhones = wordToApproxArpabet(expectedRaw);
  const transcriptPhones = wordToApproxArpabet(transcriptRaw);
  if (expectedPhones.length === 0 || transcriptPhones.length === 0) {
    return 0;
  }

  const dist = phonemeDistance(expectedPhones, transcriptPhones);
  const denom = Math.max(expectedPhones.length, transcriptPhones.length);
  if (denom <= 0) {
    return 1;
  }

  return Math.max(0, 1 - (dist / denom));
}

function pairSimilarity(expectedRaw: string, transcriptRaw: string): number {
  if (!expectedRaw || !transcriptRaw) {
    return 0;
  }
  if (expectedRaw === transcriptRaw) {
    return 1;
  }

  const expectedKey = phoneticKey(expectedRaw);
  const transcriptKey = phoneticKey(transcriptRaw);
  const phonemeScore = phonemeSimilarity(expectedRaw, transcriptRaw);
  if (expectedKey && transcriptKey && expectedKey === transcriptKey && phonemeScore >= 0.78) {
    return 0.99;
  }

  const keySimilarity = normalizedStringSimilarity(expectedKey, transcriptKey);
  const rawSimilarity = normalizedStringSimilarity(expectedRaw, transcriptRaw);
  const combined = (phonemeScore * 0.6) + (keySimilarity * 0.25) + (rawSimilarity * 0.15);
  return Math.max(rawSimilarity * 0.8, combined);
}

function phoneticTokenSimilarity(
  expectedTokens: string[],
  transcriptTokens: string[],
): { quality: number; coverage: number; available: boolean } {
  const expectedWords = expectedTokens
    .map((token) => latinLettersOnly(token))
    .filter((token) => token.length > 0);
  const transcriptWords = transcriptTokens
    .map((token) => latinLettersOnly(token))
    .filter((token) => token.length > 0);

  if (expectedWords.length === 0) {
    return { quality: 0, coverage: 0, available: false };
  }

  const expectedSeq = expectedWords
    .map((word) => {
      const phones = wordToApproxArpabet(word);
      return phones.length > 0 ? phones.join("-") : phoneticKey(word);
    })
    .filter((value) => value.length > 0);
  const transcriptSeq = transcriptWords
    .map((word) => {
      const phones = wordToApproxArpabet(word);
      return phones.length > 0 ? phones.join("-") : phoneticKey(word);
    })
    .filter((value) => value.length > 0);

  if (expectedSeq.length === 0) {
    return { quality: 0, coverage: 0, available: false };
  }

  const seqDistance = levenshteinDistance(expectedSeq, transcriptSeq);
  const seqDenom = Math.max(expectedSeq.length, transcriptSeq.length);
  const seqQuality = seqDenom > 0 ? Math.max(0, 1 - (seqDistance / seqDenom)) : 1;

  let coverageHits = 0;
  let similaritySum = 0;
  for (const expectedWord of expectedWords) {
    let best = 0;
    for (const transcriptWord of transcriptWords) {
      const similarity = pairSimilarity(expectedWord, transcriptWord);
      if (similarity > best) {
        best = similarity;
      }
      if (best >= 0.995) {
        break;
      }
    }
    similaritySum += best;
    if (best >= SIMILARITY_COVERAGE_THRESHOLD) {
      coverageHits += 1;
    }
  }

  const averageBest = similaritySum / expectedWords.length;
  const quality = clamp01((averageBest * 0.7) + (seqQuality * 0.3));
  const coverage = coverageHits / expectedWords.length;
  return { quality, coverage, available: true };
}

function confidenceValues(words: readonly KaraokeRecognizedWord[]): number[] {
  return words
    .map((word) => typeof word.confidence === "number" && Number.isFinite(word.confidence)
      ? clamp01(word.confidence)
      : null)
    .filter((value): value is number => value !== null);
}

function confidenceMean(words: readonly KaraokeRecognizedWord[]): number | null {
  const values = confidenceValues(words);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function transcriptFromWords(words: readonly KaraokeRecognizedWord[]): string {
  return words
    .flatMap((word) => tokenizeKaraokeText(word.text))
    .filter(Boolean)
    .join(" ");
}

function findMissedWords(expectedTokens: string[], transcriptTokens: string[]): string[] {
  const missed: string[] = [];

  for (const expectedToken of expectedTokens) {
    let best = 0;
    for (const transcriptToken of transcriptTokens) {
      best = Math.max(best, pairSimilarity(expectedToken, transcriptToken));
      if (best >= 0.995) {
        break;
      }
    }

    if (best < SIMILARITY_COVERAGE_THRESHOLD) {
      missed.push(expectedToken);
    }
  }

  return missed;
}

export function scoreKaraokeLineText(input: {
  expected: string;
  transcript: string;
  recognizedWords?: readonly KaraokeRecognizedWord[];
}): KaraokeTextScore {
  const expectedTokens = tokenizeKaraokeText(input.expected);
  const transcriptTokens = tokenizeKaraokeText(input.transcript);
  const editDistance = levenshteinDistance(expectedTokens, transcriptTokens);
  const wer = expectedTokens.length === 0
    ? (transcriptTokens.length === 0 ? 0 : 1)
    : editDistance / expectedTokens.length;
  const coverage = keywordCoverage(expectedTokens, transcriptTokens);
  const phonetic = phoneticTokenSimilarity(expectedTokens, transcriptTokens);

  const quality = Math.max(0, 1 - wer);
  const lexicalScore = (quality * 0.45) + (coverage * 0.2);
  const phoneticScore = (phonetic.quality * 0.25) + (phonetic.coverage * 0.1);
  const weighted = phonetic.available ? lexicalScore + phoneticScore : lexicalScore;
  const denom = phonetic.available ? 1 : 0.65;
  const score = clamp01(weighted / denom);

  return {
    confidenceMean: input.recognizedWords ? confidenceMean(input.recognizedWords) : null,
    keywordCoverage: coverage,
    missedWords: findMissedWords(expectedTokens, transcriptTokens),
    phoneticAvailable: phonetic.available,
    phoneticCoverage: phonetic.coverage,
    phoneticQuality: phonetic.quality,
    score,
    wer,
  };
}

function lineWindow(line: ScorableKaraokeLine): { endMs: number; startMs: number } {
  return {
    endMs: line.endMs + KARAOKE_LINE_WINDOW_TRAIL_MS,
    startMs: line.startMs - KARAOKE_LINE_WINDOW_LEAD_MS,
  };
}

function validRecognizedWord(word: KaraokeRecognizedWord): boolean {
  return Boolean(
    word.text.trim()
    && Number.isFinite(word.startMs)
    && Number.isFinite(word.endMs)
    && word.endMs >= word.startMs,
  );
}

function closestExpectedWordDistance(line: ScorableKaraokeLine, recognizedWord: KaraokeRecognizedWord): number {
  const recognizedTokens = tokenizeKaraokeText(recognizedWord.text);
  const recognizedToken = recognizedTokens[0] ?? latinLettersOnly(recognizedWord.text);
  const recognizedMidpoint = midpointMs(recognizedWord);
  let best = Number.POSITIVE_INFINITY;

  for (const expectedWord of line.words) {
    const expectedTokens = tokenizeKaraokeText(expectedWord.text);
    const expectedToken = expectedTokens[0] ?? latinLettersOnly(expectedWord.text);
    const similarity = expectedToken && recognizedToken ? pairSimilarity(expectedToken, recognizedToken) : 0;
    const textPenalty = similarity >= SIMILARITY_COVERAGE_THRESHOLD ? 0 : BUCKETIZER_TEXT_MISMATCH_PENALTY_MS;
    const distance = Math.abs(midpointMs(expectedWord) - recognizedMidpoint) + textPenalty;
    best = Math.min(best, distance);
  }

  if (Number.isFinite(best)) {
    return best;
  }

  return Math.abs(midpointMs(line) - recognizedMidpoint);
}

export function bucketRecognizedWordsIntoLines(input: {
  lines: readonly ScorableKaraokeLine[];
  words: readonly KaraokeRecognizedWord[];
  nowMs: number;
  assignmentLocks?: ReadonlySet<string>;
  finalizedReason?: KaraokeLineBucket["finalizedReason"];
}): KaraokeLineBucket[] {
  const buckets = input.lines.map((line) => {
    const window = lineWindow(line);

    return {
      expectedLine: line,
      lineId: line.lineId,
      lineIndex: line.lineIndex,
      recognizedWords: [] as KaraokeRecognizedWord[],
      scoredLineIndex: line.scoredLineIndex,
      windowEndMs: window.endMs,
      windowStartMs: window.startMs,
    };
  });

  for (const word of input.words) {
    if (!validRecognizedWord(word)) {
      continue;
    }

    const wordMidpoint = midpointMs(word);
    let bestBucketIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const [index, bucket] of buckets.entries()) {
      if (input.assignmentLocks?.has(bucket.lineId)) {
        continue;
      }

      if (wordMidpoint < bucket.windowStartMs || wordMidpoint > bucket.windowEndMs) {
        continue;
      }

      const distance = closestExpectedWordDistance(bucket.expectedLine, word);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestBucketIndex = index;
      }
    }

    if (bestBucketIndex >= 0) {
      buckets[bestBucketIndex]?.recognizedWords.push(word);
    }
  }

  return buckets.map((bucket) => {
    const recognizedWords = [...bucket.recognizedWords].sort((a, b) => a.startMs - b.startMs);
    const finalizedReason = input.finalizedReason
      ?? (input.nowMs >= bucket.windowEndMs ? "line_end" : "asr_final");

    return {
      ...bucket,
      confidenceMean: confidenceMean(recognizedWords),
      finalizedReason,
      recognizedWords,
      transcript: transcriptFromWords(recognizedWords),
    };
  });
}

function bestRecognizedMatch(
  expectedWord: ScorableKaraokeWord,
  recognizedWords: readonly KaraokeRecognizedWord[],
): KaraokeRecognizedWord | null {
  const expectedToken = tokenizeKaraokeText(expectedWord.text)[0] ?? latinLettersOnly(expectedWord.text);
  let bestWord: KaraokeRecognizedWord | null = null;
  let bestScore = 0;

  for (const recognizedWord of recognizedWords) {
    const recognizedTokens = tokenizeKaraokeText(recognizedWord.text);
    const recognizedFallback = latinLettersOnly(recognizedWord.text);
    const textSimilarity = expectedToken
      ? Math.max(
          ...recognizedTokens.map((recognizedToken) => pairSimilarity(expectedToken, recognizedToken)),
          recognizedFallback ? pairSimilarity(expectedToken, recognizedFallback) : 0,
        )
      : 0;
    if (textSimilarity < SIMILARITY_COVERAGE_THRESHOLD) {
      continue;
    }

    const timingDistance = Math.abs(recognizedWord.startMs - expectedWord.startMs);
    const timingScore = clamp01(1 - (timingDistance / TIMING_SCORE_MAX_DELTA_MS));
    const score = (textSimilarity * 0.8) + (timingScore * 0.2);

    if (score > bestScore) {
      bestScore = score;
      bestWord = recognizedWord;
    }
  }

  return bestWord;
}

function timingTrendFromDeltas(deltas: readonly number[]): KaraokeTimingTrend {
  if (deltas.length === 0) {
    return "on_time";
  }

  const signedMean = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
  const earlyCount = deltas.filter((delta) => delta < -TIMING_MIXED_SIGN_MS).length;
  const lateCount = deltas.filter((delta) => delta > TIMING_MIXED_SIGN_MS).length;

  if (Math.abs(signedMean) <= TIMING_ON_TIME_MS) {
    return earlyCount > 0 && lateCount > 0 ? "mixed" : "on_time";
  }
  if (earlyCount > 0 && lateCount > 0) {
    return "mixed";
  }

  return signedMean < 0 ? "early" : "late";
}

export function scoreKaraokeLineTiming(input: {
  expectedLine: ScorableKaraokeLine;
  recognizedWords: readonly KaraokeRecognizedWord[];
}): KaraokeTimingScore | null {
  const deltas: number[] = [];

  for (const expectedWord of input.expectedLine.words) {
    const recognizedWord = bestRecognizedMatch(expectedWord, input.recognizedWords);
    if (!recognizedWord) {
      continue;
    }

    deltas.push(recognizedWord.startMs - expectedWord.startMs);
  }

  if (deltas.length === 0) {
    return null;
  }

  const meanAbsDeltaMs = deltas.reduce((sum, value) => sum + Math.abs(value), 0) / deltas.length;
  const signedMeanDeltaMs = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;

  return {
    matchedWordCount: deltas.length,
    meanAbsDeltaMs,
    score: clamp01(1 - (meanAbsDeltaMs / TIMING_SCORE_WINDOW_MS)),
    signedMeanDeltaMs,
    timingTrend: timingTrendFromDeltas(deltas),
  };
}

export function scoreKaraokeLine(input: {
  bucket: KaraokeLineBucket;
}): KaraokeLineScore {
  const textScore = scoreKaraokeLineText({
    expected: input.bucket.expectedLine.text,
    recognizedWords: input.bucket.recognizedWords,
    transcript: input.bucket.transcript,
  });
  const timingScore = scoreKaraokeLineTiming({
    expectedLine: input.bucket.expectedLine,
    recognizedWords: input.bucket.recognizedWords,
  });
  const confidenceScore = input.bucket.confidenceMean;
  const weightedScores = [
    // Rebalanced to give timing real leverage (was 0.75/0.20/0.05): at 20% the
    // timing signal couldn't separate good from great. Text still dominates;
    // timing now meaningfully moves the score. (Pitch will claim weight here later.)
    { available: true, score: textScore.score, weight: 0.6 },
    { available: timingScore !== null, score: timingScore?.score ?? 0, weight: 0.35 },
    { available: confidenceScore !== null, score: confidenceScore ?? 0, weight: 0.05 },
  ];
  const availableWeight = weightedScores
    .filter((item) => item.available)
    .reduce((sum, item) => sum + item.weight, 0);
  const weightedScore = weightedScores
    .filter((item) => item.available)
    .reduce((sum, item) => sum + (item.score * item.weight), 0);

  return {
    confidenceScore,
    finalizedReason: input.bucket.finalizedReason,
    lineId: input.bucket.lineId,
    lineIndex: input.bucket.lineIndex,
    recognizedWords: input.bucket.recognizedWords,
    score: availableWeight > 0 ? clamp01(weightedScore / availableWeight) : 0,
    scoredLineIndex: input.bucket.scoredLineIndex,
    textScore,
    timingScore,
    transcript: input.bucket.transcript,
    uncertain: input.bucket.finalizedReason === "provider_failed",
  };
}

function aggregateTimingTrend(lineScores: readonly KaraokeLineScore[]): KaraokeTimingTrend {
  const deltas = lineScores
    .map((lineScore) => lineScore.timingScore?.signedMeanDeltaMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return timingTrendFromDeltas(deltas);
}

function uniqueMissedWords(lineScores: readonly KaraokeLineScore[]): string[] {
  const seen = new Set<string>();
  const missed: string[] = [];

  for (const lineScore of lineScores) {
    for (const word of lineScore.textScore.missedWords) {
      if (seen.has(word)) {
        continue;
      }
      seen.add(word);
      missed.push(word);
    }
  }

  return missed;
}

export function aggregateKaraokeSession(input: {
  lineScores: readonly KaraokeLineScore[];
}): KaraokeSessionSummary {
  const lineScores = [...input.lineScores].sort((a, b) => a.scoredLineIndex - b.scoredLineIndex);
  // Uncertain (measurement-failed) lines never contribute to the performance
  // averages — an infrastructure failure must not read as poor singing.
  const measuredLineScores = lineScores.filter((lineScore) => !lineScore.uncertain);
  const scoredLineScores = measuredLineScores.filter((lineScore) => lineScore.recognizedWords.length > 0);
  const scoreSource = scoredLineScores.length > 0 ? scoredLineScores : measuredLineScores;
  const finalScore = scoreSource.length > 0
    ? scoreSource.reduce((sum, lineScore) => sum + lineScore.score, 0) / scoreSource.length
    : 0;
  const lyricsScore = scoreSource.length > 0
    ? scoreSource.reduce((sum, lineScore) => sum + lineScore.textScore.score, 0) / scoreSource.length
    : 0;
  const timingScores = scoreSource
    .map((lineScore) => lineScore.timingScore?.score)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const confidenceScores = scoreSource
    .map((lineScore) => lineScore.confidenceScore)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const strongestLines = [...scoreSource].sort((a, b) => b.score - a.score).slice(0, 3);
  const weakestLines = [...scoreSource].sort((a, b) => a.score - b.score).slice(0, 3);

  return {
    confidenceMean: confidenceScores.length > 0
      ? confidenceScores.reduce((sum, value) => sum + value, 0) / confidenceScores.length
      : null,
    finalScore: clamp01(finalScore),
    lineCount: lineScores.length,
    lowConfidenceLineCount: lineScores.filter((lineScore) => (
      lineScore.confidenceScore !== null && lineScore.confidenceScore < LOW_CONFIDENCE_THRESHOLD
    )).length,
    lyricsScore: clamp01(lyricsScore),
    missedWords: uniqueMissedWords(lineScores),
    noRecognitionLineCount: lineScores.filter((lineScore) => lineScore.recognizedWords.length === 0).length,
    phoneticUnavailableLineCount: lineScores.filter((lineScore) => !lineScore.textScore.phoneticAvailable).length,
    scoredLineCount: scoredLineScores.length,
    strongestLines,
    timingScore: timingScores.length > 0
      ? timingScores.reduce((sum, value) => sum + value, 0) / timingScores.length
      : null,
    timingTrend: aggregateTimingTrend(lineScores),
    weakestLines,
  };
}
