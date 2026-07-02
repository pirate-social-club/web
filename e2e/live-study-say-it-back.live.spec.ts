import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { expect, test } from "@playwright/test";
import type { SessionExchangeResponse } from "@pirate/api-contracts";

import { resolveApiBaseURL } from "./fixtures/e2e-helpers";
import { createStoredSessionFromExchange } from "./fixtures/session";

const baseURL = process.env.E2E_BASE_URL ?? "https://staging.pirate.sc";
const apiBaseURL = process.env.E2E_API_BASE_URL ?? resolveApiBaseURL(baseURL);

type SongStudyExercise =
  | {
      id: string;
      line_id: string;
      max_attempts: number;
      prompt_text: string;
      reference_text: string;
      type: "say_it_back";
    }
  | {
      id: string;
      type: "translation_choice";
    };

type SongStudyPayload = {
  access: "ready" | "locked" | "processing" | "unavailable";
  exercise_count: number;
  exercises: SongStudyExercise[];
  object: "song_study_payload";
};

type SongStudyTranscriptionResponse = {
  duration_seconds: number | null;
  model: string;
  object: "song_study_transcription";
  provider: "elevenlabs";
  text: string;
};

type SongStudyAttemptResult = {
  attempts_remaining: number;
  exercise_id: string;
  feedback?: {
    extra: string[];
    matched: string[];
    missing: string[];
  };
  object: "song_study_attempt_result";
  outcome: "correct" | "incorrect" | "revealed";
};

type SynthesizedAudio = {
  bytes: ArrayBuffer;
  fileName: string;
  mimeType: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for live say-it-back E2E`);
  return value;
}

function optionalEnv(name: string): string | null {
  return process.env[name]?.trim() || null;
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/u, "");
}

function signHs256Jwt(payload: Record<string, unknown>, secret: string): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest("base64url");
  return `${signingInput}.${signature}`;
}

function walletAddressForSubject(subject: string): string {
  return `0x${createHash("sha256").update(subject).digest("hex").slice(0, 40)}`;
}

function mintUpstreamJwt(subject: string): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return signHs256Jwt({
    aud: requiredEnv("AUTH_UPSTREAM_JWT_AUDIENCE"),
    exp: nowSeconds + 15 * 60,
    iat: nowSeconds,
    iss: requiredEnv("AUTH_UPSTREAM_JWT_ISSUER"),
    sub: subject,
    wallet_address: optionalEnv("E2E_STUDY_SAY_IT_BACK_WALLET_ADDRESS") ?? walletAddressForSubject(subject),
  }, requiredEnv("AUTH_UPSTREAM_JWT_SHARED_SECRET"));
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  okStatuses = [200, 201, 202],
): Promise<T> {
  const response = await fetch(new URL(path, apiBaseURL), {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.body && !(init.body instanceof FormData) ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const text = await response.text();
  const body = (text.trim() ? JSON.parse(text) : null) as T;
  if (!okStatuses.includes(response.status)) {
    throw new Error(`${init.method ?? "GET"} ${path} failed with ${response.status}: ${text}`);
  }
  return body;
}

async function createLiveSession(): Promise<{ accessToken: string }> {
  const subject = optionalEnv("E2E_STUDY_SAY_IT_BACK_SUBJECT") ?? `study-say-it-back-${Date.now()}`;
  const exchanged = await requestJson<SessionExchangeResponse>("/auth/session/exchange", {
    body: JSON.stringify({
      proof: {
        jwt: mintUpstreamJwt(subject),
        type: "jwt_based_auth",
      },
    }),
    method: "POST",
  });
  const session = createStoredSessionFromExchange(exchanged);
  return { accessToken: session.accessToken };
}

async function requestBytes(path: string, init: RequestInit = {}, okStatuses = [200]): Promise<Response> {
  const response = await fetch(new URL(path, apiBaseURL), {
    ...init,
    headers: {
      accept: "*/*",
      ...(init.body && !(init.body instanceof FormData) ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!okStatuses.includes(response.status)) {
    const text = await response.text();
    throw new Error(`${init.method ?? "GET"} ${path} failed with ${response.status}: ${text}`);
  }
  return response;
}

function audioMimeType(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case ".m4a":
    case ".mp4":
      return "audio/mp4";
    case ".mp3":
      return "audio/mpeg";
    case ".ogg":
    case ".oga":
      return "audio/ogg";
    case ".wav":
      return "audio/wav";
    case ".webm":
      return "audio/webm";
    default:
      return "application/octet-stream";
  }
}

function synthesizedAudioExtension(contentType: string): string {
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("ogg")) return "ogg";
  if (contentType.includes("webm")) return "webm";
  return "mp3";
}

function toExactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function loadAudioForExercise(input: {
  authHeaders: Record<string, string>;
  communityId: string;
  exercise: Extract<SongStudyExercise, { type: "say_it_back" }>;
}): Promise<SynthesizedAudio> {
  const audioPath = optionalEnv("E2E_STUDY_SAY_IT_BACK_AUDIO_PATH");
  if (audioPath) {
    return {
      bytes: toExactArrayBuffer(await readFile(audioPath)),
      fileName: basename(audioPath),
      mimeType: audioMimeType(audioPath),
    };
  }

  if (process.env.E2E_STUDY_SAY_IT_BACK_SYNTHESIZE_AUDIO !== "true") {
    throw new Error(
      "E2E_STUDY_SAY_IT_BACK_AUDIO_PATH is required unless E2E_STUDY_SAY_IT_BACK_SYNTHESIZE_AUDIO=true",
    );
  }

  const response = await requestBytes(
    `/communities/${encodeURIComponent(input.communityId)}/assistant/speech`,
    {
      body: JSON.stringify({ text: input.exercise.prompt_text }),
      headers: input.authHeaders,
      method: "POST",
    },
  );
  const contentType = response.headers.get("content-type") ?? "audio/mpeg";
  const bytes = await response.arrayBuffer();
  expect(bytes.byteLength, "assistant TTS should return non-empty audio").toBeGreaterThan(0);
  return {
    bytes,
    fileName: `study-say-it-back.${synthesizedAudioExtension(contentType)}`,
    mimeType: contentType,
  };
}

test.describe("live Study say-it-back", () => {
  test("transcribes real audio and grades a say-it-back attempt", async () => {
    test.skip(
      process.env.E2E_LIVE_STUDY_SAY_IT_BACK !== "true",
      "Set E2E_LIVE_STUDY_SAY_IT_BACK=true and provide the Study fixture env vars to run this live STT smoke.",
    );

    const communityId = requiredEnv("E2E_STUDY_SAY_IT_BACK_COMMUNITY_ID");
    const postId = requiredEnv("E2E_STUDY_SAY_IT_BACK_POST_ID");
    const targetLanguage = optionalEnv("E2E_STUDY_SAY_IT_BACK_TARGET_LANGUAGE") ?? "es";
    const expectedOutcome = optionalEnv("E2E_STUDY_SAY_IT_BACK_EXPECT_OUTCOME") ?? "correct";
    const expectedTranscriptIncludes = optionalEnv("E2E_STUDY_SAY_IT_BACK_EXPECT_TRANSCRIPT_INCLUDES");

    const session = await createLiveSession();
    const authHeaders = { authorization: `Bearer ${session.accessToken}` };
    const study = await requestJson<SongStudyPayload>(
      `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/study?target_language=${encodeURIComponent(targetLanguage)}`,
      { headers: authHeaders },
    );

    expect(study.access).toBe("ready");
    expect(study.exercise_count).toBeGreaterThan(0);
    const exercise = study.exercises.find((item): item is Extract<SongStudyExercise, { type: "say_it_back" }> =>
      item.type === "say_it_back"
    );
    expect(exercise, "Study payload must include a say-it-back exercise; check study_enabled and active ElevenLabs credential").toBeTruthy();

    const audio = await loadAudioForExercise({ authHeaders, communityId, exercise });
    const form = new FormData();
    form.set("file", new File([audio.bytes], audio.fileName, { type: audio.mimeType }));
    const transcription = await requestJson<SongStudyTranscriptionResponse>(
      `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/study/transcriptions`,
      {
        body: form,
        headers: authHeaders,
        method: "POST",
      },
    );

    expect(transcription.object).toBe("song_study_transcription");
    expect(transcription.provider).toBe("elevenlabs");
    expect(transcription.text.trim().length).toBeGreaterThan(0);
    if (expectedTranscriptIncludes) {
      expect(transcription.text.toLowerCase()).toContain(expectedTranscriptIncludes.toLowerCase());
    }

    const result = await requestJson<SongStudyAttemptResult>(
      `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/study/attempts`,
      {
        body: JSON.stringify({
          attempt_number: 1,
          exercise_id: exercise.id,
          idempotency_key: `live-study-say-it-back-${Date.now()}`,
          transcript: transcription.text,
          type: "say_it_back",
        }),
        headers: authHeaders,
        method: "POST",
      },
    );

    expect(result.object).toBe("song_study_attempt_result");
    expect(result.exercise_id).toBe(exercise.id);
    expect(result.outcome).toBe(expectedOutcome);
    expect(result.feedback, "say-it-back attempts should include token-diff feedback").toBeTruthy();
  });
});
