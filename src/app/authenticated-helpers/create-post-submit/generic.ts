"use client";

import type { CreatePostRequest } from "@pirate/api-contracts";
import type { DownloadFileComposerState, LearningDeckComposerState } from "@/components/compositions/posts/post-composer/post-composer.types";
import type { BasePostRequestFields, SignAgentAuthoredBody } from "./base";
import type { ApiContentBlob, ApiLearningDeckDraft } from "@/lib/api/client-api-types";

type CreatePost = (communityId: string, body: CreatePostRequest, options?: { altchaPayload?: string | null }) => Promise<{ id: string; status?: string; asset?: string | null }>;

export async function submitDownloadableFilePost(input: {
  communityId: string;
  title: string;
  file: DownloadFileComposerState;
  baseRequest: BasePostRequestFields;
  createContentBlob: (communityId: string, body: {
    validation_profile: "download_file_v1";
    declared_filename: string;
    declared_mime_type: string;
    declared_size_bytes: number;
    upload_mode: "proxy";
  }) => Promise<ApiContentBlob>;
  getContentBlob: (communityId: string, blobId: string) => Promise<ApiContentBlob>;
  uploadContentBlob: (communityId: string, blobId: string, content: ArrayBuffer, mimeType: string, onUploadProgress?: (fraction: number) => void) => Promise<ApiContentBlob>;
  createPost: CreatePost;
  contentBlobId?: string;
  onContentBlobCreated?: (blob: ApiContentBlob) => void;
  reportProgress?: (key: "validating" | "uploading_media" | "publishing_post") => void;
  signAgentAuthoredBody?: SignAgentAuthoredBody;
  authorMode?: "human" | "agent";
  altchaPayload?: string | null;
}): Promise<{ id: string; status?: string; asset?: string | null }> {
  const upload = input.file.upload;
  if (!upload) throw new Error("Choose a CSV, TSV, TXT, or JSON file.");
  input.reportProgress?.("validating");
  const contentBlob = input.contentBlobId
    ? await input.getContentBlob(input.communityId, input.contentBlobId)
    : await input.createContentBlob(input.communityId, {
    validation_profile: "download_file_v1",
    declared_filename: upload.name,
    declared_mime_type: upload.type || mimeFromFilename(upload.name),
    declared_size_bytes: upload.size,
    upload_mode: "proxy",
  });
  input.onContentBlobCreated?.(contentBlob);
  if (contentBlob.status === "failed" || contentBlob.status === "rejected" || contentBlob.status === "cancelled") {
    throw new Error("This file upload can no longer be resumed. Remove the file and choose it again before publishing.");
  }
  if (contentBlob.status === "pending_upload") {
    input.reportProgress?.("uploading_media");
    await input.uploadContentBlob(input.communityId, contentBlob.id, await upload.arrayBuffer(), contentBlob.declared_mime_type, (fraction) => {
      input.reportProgress?.(fraction >= 1 ? "publishing_post" : "uploading_media");
    });
  }
  const request = {
    ...input.baseRequest,
    post_type: "file" as const,
    title: input.title.trim(),
    file_upload: contentBlob.id,
    access_mode: "locked" as const,
    rights_basis: "original" as const,
    listing_draft: { price_cents: 100, regional_pricing_enabled: false, status: "active" as const },
  } satisfies Record<string, unknown>;
  const signed = input.authorMode === "agent" && input.signAgentAuthoredBody
    ? await input.signAgentAuthoredBody(`/communities/${input.communityId}/posts`, request)
    : request;
  input.reportProgress?.("publishing_post");
  return input.createPost(input.communityId, signed as CreatePostRequest, { altchaPayload: input.altchaPayload });
}

export async function submitLearningDeckPost(input: {
  communityId: string;
  title: string;
  deck: LearningDeckComposerState;
  baseRequest: BasePostRequestFields;
  createLearningDeck: (communityId: string, body: { title: string; description?: string | null }) => Promise<ApiLearningDeckDraft>;
  getLearningDeck?: (communityId: string, deckId: string) => Promise<ApiLearningDeckDraft>;
  upsertLearningDeckCard: (communityId: string, deckId: string, body: { card_id?: string; card_type: "basic" | "cloze"; prompt: string; answer: string; tags?: string[]; ordinal?: number }) => Promise<ApiLearningDeckDraft>;
  validateLearningDeck: (communityId: string, deckId: string) => Promise<{ issues: Array<{ message: string }>; canonical: unknown }>;
  createPost: CreatePost;
  learningDeckId?: string;
  onLearningDeckCreated?: (deck: ApiLearningDeckDraft) => void;
  reportProgress?: (key: "validating" | "publishing_post") => void;
  signAgentAuthoredBody?: SignAgentAuthoredBody;
  authorMode?: "human" | "agent";
  altchaPayload?: string | null;
}): Promise<{ id: string; status?: string; asset?: string | null }> {
  if (!input.title.trim()) throw new Error("Add a title for the learning deck.");
  if (!input.deck.cards.length) throw new Error("Add at least one learning card.");
  if (input.deck.cards.some((card) => !card.prompt.trim() || !card.answer.trim())) throw new Error("Complete every card prompt and answer.");
  input.reportProgress?.("validating");
  let draft = input.learningDeckId && input.getLearningDeck
    ? await input.getLearningDeck(input.communityId, input.learningDeckId)
    : await input.createLearningDeck(input.communityId, { title: input.title.trim(), description: input.deck.description.trim() || null });
  input.onLearningDeckCreated?.(draft);
  for (const [ordinal, card] of input.deck.cards.entries()) {
    // A retry resumes the same server draft. Reuse the durable card ID at the
    // same ordinal when the composer still carries a client-only UUID; this
    // prevents a timeout between card writes from allocating duplicates.
    const existingCard = draft.cards.find((candidate) => candidate.ordinal === ordinal && candidate.retiredAt == null);
    draft = await input.upsertLearningDeckCard(input.communityId, draft.deck.learning_deck_id, {
      card_id: card.id.startsWith("lcd_") ? card.id : existingCard?.cardId,
      card_type: card.cardType,
      prompt: card.prompt,
      answer: card.answer,
      tags: card.tags,
      ordinal,
    });
  }
  const validation = await input.validateLearningDeck(input.communityId, draft.deck.learning_deck_id);
  if (validation.issues.length) throw new Error(validation.issues.map((issue) => issue.message).join(" "));
  const request = {
    ...input.baseRequest,
    post_type: "deck" as const,
    title: input.title.trim(),
    learning_deck: draft.deck.learning_deck_id,
    access_mode: "locked" as const,
    rights_basis: "original" as const,
    listing_draft: { price_cents: 100, regional_pricing_enabled: false, status: "active" as const },
  } satisfies Record<string, unknown>;
  const signed = input.authorMode === "agent" && input.signAgentAuthoredBody
    ? await input.signAgentAuthoredBody(`/communities/${input.communityId}/posts`, request)
    : request;
  input.reportProgress?.("publishing_post");
  return input.createPost(input.communityId, signed as CreatePostRequest, { altchaPayload: input.altchaPayload });
}

function mimeFromFilename(filename: string): string {
  switch (filename.toLowerCase().split(".").pop()) {
    case "csv": return "text/csv";
    case "tsv": return "text/tab-separated-values";
    case "json": return "application/json";
    default: return "text/plain";
  }
}
