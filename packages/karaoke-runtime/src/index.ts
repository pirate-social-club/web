export {
  KARAOKE_LINE_WINDOW_LEAD_MS,
  KARAOKE_LINE_WINDOW_TRAIL_MS,
  aggregateKaraokeSession,
  bucketRecognizedWordsIntoLines,
  scoreKaraokeLine,
  scoreKaraokeLineText,
  scoreKaraokeLineTiming,
  tokenizeKaraokeText,
} from "./scoring";

export { KARAOKE_TRANSPORT_PROTOCOL_VERSION } from "./transport";

export {
  KARAOKE_BINARY_HEADER_BYTES,
  KARAOKE_BINARY_PROTOCOL_VERSION,
  KARAOKE_MAX_BINARY_FRAME_BYTES,
  decodeKaraokeBinaryFrame,
  encodeKaraokeBinaryFrame,
} from "./binary-codec";

export {
  createKaraokeSessionState,
  reduceKaraokeSession,
} from "./session";

export {
  parseKaraokeClientEvent,
  parseKaraokeStreamingSttEvent,
  validateKaraokeClientEventPayload,
  validateKaraokeStreamingSttEventPayload,
  validateKaraokeTransportEnvelope,
} from "./transport";

export {
  KaraokeSessionHost,
} from "./session-host";

export {
  KaraokeSessionClient,
} from "./karaoke-session-client";

export type {
  KaraokeCaptureAnchor,
  KaraokeClientPhase,
  KaraokeClientSocket,
  KaraokeSessionClientOptions,
  KaraokeSessionDescriptor,
} from "./karaoke-session-client";

export {
  deserializeKaraokeScoringPolicy,
  deserializeKaraokeSessionSnapshot,
  KaraokeSnapshotValidationError,
  serializeKaraokeScoringPolicy,
  serializeKaraokeScoringPolicyForApi,
  serializeKaraokeSessionSnapshot,
} from "./serialization";

export type {
  DecodeKaraokeBinaryFrameOptions,
  DecodeKaraokeBinaryFrameResult,
} from "./binary-codec";

export type {
  JsonKaraokeScoringPolicy,
  JsonKaraokeSessionStatus,
  KaraokeSnapshotValidationErrorCode,
  PublicKaraokeScoringPolicy,
  StoredKaraokeRecognizedWord,
  StoredKaraokeScorableLine,
  StoredKaraokeScorableWord,
  StoredKaraokeSessionPolicy,
  StoredKaraokeSessionSnapshot,
  StoredKaraokeSessionState,
} from "./serialization";

export type {
  KaraokeLineScore,
  KaraokeRecognizedWord,
  KaraokeSessionSummary,
  KaraokeTimingScore,
  KaraokeTimingTrend,
  ScorableKaraokeLine,
  ScorableKaraokeWord,
  KaraokeTextScore,
  KaraokeLineBucket,
} from "./scoring";

export type {
  KaraokePendingCommit,
  KaraokeScoringPolicy,
  KaraokeScoringSttProvider,
  KaraokeSessionEffect,
  KaraokeSessionEvent,
  KaraokeSessionReduction,
  KaraokeSessionState,
  KaraokeSessionStatus,
} from "./session";

export type {
  KaraokeClientBinaryFrame,
  KaraokeClientEvent,
  KaraokeLineIdentity,
  KaraokeServerEvent,
  KaraokeStreamingSttEvent,
  KaraokeTransportEnvelope,
  KaraokeTransportError,
  KaraokeTransportErrorCode,
} from "./transport";

export type {
  KaraokeEffectRunner,
  KaraokeSessionHostRestoreOptions,
  KaraokeSessionHostSnapshot,
  KaraokeSttAdapterMessage,
  KaraokeSttCommitAck,
  KaraokeStreamingSttAdapter,
} from "./session-host";
