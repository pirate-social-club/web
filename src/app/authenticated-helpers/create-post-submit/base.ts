"use client";

import type { CreatePostRequest } from "@pirate/api-contracts";

import type {
  AnonymousIdentityScope,
  AuthorMode,
  ComposerTab,
  IdentityMode,
  PostAudience,
} from "@/components/compositions/posts/post-composer/post-composer.types";

export type BasePostRequestFields = Pick<
  CreatePostRequest,
  | "anonymous_scope"
  | "disclosed_qualifier_ids"
  | "identity_mode"
  | "idempotency_key"
  | "translation_policy"
  | "visibility"
>;

export type SignAgentAuthoredBody = <T extends Record<string, unknown>>(
  path: string,
  body: T,
) => Promise<T>;

export interface ResolvedCreatePostIdentity {
  anonymousScope?: AnonymousIdentityScope;
  disclosedQualifierIds?: string[];
  identityMode: IdentityMode;
}

export function resolveCreatePostIdentity({
  allowAnonymousIdentity,
  anonymousIdentityScope,
  authorMode,
  composerMode,
  monetizedVideo,
  requestedIdentityMode,
  selectedQualifierIds,
}: {
  allowAnonymousIdentity: boolean;
  anonymousIdentityScope?: AnonymousIdentityScope | null;
  authorMode: AuthorMode;
  composerMode: ComposerTab;
  monetizedVideo?: boolean;
  requestedIdentityMode: IdentityMode;
  selectedQualifierIds: string[];
}): ResolvedCreatePostIdentity {
  const identityMode = authorMode === "agent"
    || composerMode === "song"
    || composerMode === "live"
    || (composerMode === "video" && monetizedVideo)
    || !allowAnonymousIdentity
    ? "public"
    : requestedIdentityMode;

  return {
    identityMode,
    anonymousScope: identityMode === "anonymous"
      ? (anonymousIdentityScope ?? "community_stable")
      : undefined,
    disclosedQualifierIds: identityMode === "anonymous" && selectedQualifierIds.length > 0
      ? selectedQualifierIds
      : undefined,
  };
}

export function buildBasePostRequest({
  anonymousScope,
  disclosedQualifierIds,
  idempotencyKey,
  identityMode,
  visibility,
}: {
  anonymousScope?: AnonymousIdentityScope;
  disclosedQualifierIds?: string[];
  idempotencyKey: string;
  identityMode: IdentityMode;
  visibility: PostAudience;
}): BasePostRequestFields {
  return {
    anonymous_scope: anonymousScope,
    disclosed_qualifier_ids: disclosedQualifierIds,
    identity_mode: identityMode,
    idempotency_key: idempotencyKey,
    translation_policy: "machine_allowed",
    visibility,
  };
}

export async function signIfAgent<T extends Record<string, unknown>>({
  authorMode,
  path,
  request,
  signAgentAuthoredBody,
}: {
  authorMode: AuthorMode;
  path: string;
  request: T;
  signAgentAuthoredBody: SignAgentAuthoredBody;
}): Promise<T> {
  return authorMode === "agent"
    ? await signAgentAuthoredBody(path, request)
    : request;
}
