"use client";

import * as React from "react";

import {
  defaultAudienceState,
  defaultCharityContributionState,
  defaultMonetizationState,
  defaultSongState,
} from "@/components/compositions/post-composer/post-composer-config";
import type {
  AuthorMode,
  CharityContributionState,
  ComposerAudienceState,
  ComposerTab,
  DerivativeStepState,
  MonetizationState,
  SongComposerState,
  SongMode,
} from "@/components/compositions/post-composer/post-composer.types";

export type CreatePostDraftState = {
  audience: ComposerAudienceState;
  authorMode: AuthorMode;
  body: string;
  caption: string;
  charityContribution: CharityContributionState;
  composerMode: ComposerTab;
  derivativeStep: DerivativeStepState | undefined;
  identityMode: "public" | "anonymous";
  linkUrl: string;
  lyrics: string;
  monetizationState: MonetizationState;
  pendingSongBundleId: string | null;
  selectedQualifierIds: string[];
  songMode: SongMode;
  songState: SongComposerState;
  submitError: string | null;
  title: string;
};

type DraftAction =
  | { type: "setAudience"; value: React.SetStateAction<ComposerAudienceState> }
  | { type: "setAuthorMode"; value: React.SetStateAction<AuthorMode> }
  | { type: "setBody"; value: React.SetStateAction<string> }
  | { type: "setCaption"; value: React.SetStateAction<string> }
  | { type: "setCharityContribution"; value: React.SetStateAction<CharityContributionState> }
  | { type: "setComposerMode"; value: React.SetStateAction<ComposerTab> }
  | { type: "setDerivativeStep"; value: React.SetStateAction<DerivativeStepState | undefined> }
  | { type: "setIdentityMode"; value: React.SetStateAction<"public" | "anonymous"> }
  | { type: "setLinkUrl"; value: React.SetStateAction<string> }
  | { type: "setLyrics"; value: React.SetStateAction<string> }
  | { type: "setMonetizationState"; value: React.SetStateAction<MonetizationState> }
  | { type: "setPendingSongBundleId"; value: React.SetStateAction<string | null> }
  | { type: "setSelectedQualifierIds"; value: React.SetStateAction<string[]> }
  | { type: "setSongMode"; value: React.SetStateAction<SongMode> }
  | { type: "setSongState"; value: React.SetStateAction<SongComposerState> }
  | { type: "setSubmitError"; value: React.SetStateAction<string | null> }
  | { type: "setTitle"; value: React.SetStateAction<string> };

type CreatePostDraftActions = {
  resetCharityContribution: () => void;
  setAudience: React.Dispatch<React.SetStateAction<ComposerAudienceState>>;
  setAuthorMode: React.Dispatch<React.SetStateAction<AuthorMode>>;
  setBody: React.Dispatch<React.SetStateAction<string>>;
  setCaption: React.Dispatch<React.SetStateAction<string>>;
  setCharityContribution: React.Dispatch<React.SetStateAction<CharityContributionState>>;
  setComposerMode: React.Dispatch<React.SetStateAction<ComposerTab>>;
  setDerivativeStep: React.Dispatch<React.SetStateAction<DerivativeStepState | undefined>>;
  setIdentityMode: React.Dispatch<React.SetStateAction<"public" | "anonymous">>;
  setLinkUrl: React.Dispatch<React.SetStateAction<string>>;
  setLyrics: React.Dispatch<React.SetStateAction<string>>;
  setMonetizationState: React.Dispatch<React.SetStateAction<MonetizationState>>;
  setPendingSongBundleId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedQualifierIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSongMode: React.Dispatch<React.SetStateAction<SongMode>>;
  setSongState: React.Dispatch<React.SetStateAction<SongComposerState>>;
  setSubmitError: React.Dispatch<React.SetStateAction<string | null>>;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
};

function resolveSetState<T>(current: T, value: React.SetStateAction<T>): T {
  return typeof value === "function" ? (value as (current: T) => T)(current) : value;
}

function createInitialDraftState(): CreatePostDraftState {
  return {
    audience: defaultAudienceState(),
    authorMode: "human",
    body: "",
    caption: "",
    charityContribution: defaultCharityContributionState(),
    composerMode: "text",
    derivativeStep: undefined,
    identityMode: "public",
    linkUrl: "",
    lyrics: "",
    monetizationState: defaultMonetizationState(),
    pendingSongBundleId: null,
    selectedQualifierIds: [],
    songMode: "original",
    songState: defaultSongState(),
    submitError: null,
    title: "",
  };
}

function createPostDraftReducer(state: CreatePostDraftState, action: DraftAction): CreatePostDraftState {
  switch (action.type) {
    case "setAudience":
      return { ...state, audience: resolveSetState(state.audience, action.value) };
    case "setAuthorMode":
      return { ...state, authorMode: resolveSetState(state.authorMode, action.value) };
    case "setBody":
      return { ...state, body: resolveSetState(state.body, action.value) };
    case "setCaption":
      return { ...state, caption: resolveSetState(state.caption, action.value) };
    case "setCharityContribution":
      return { ...state, charityContribution: resolveSetState(state.charityContribution, action.value) };
    case "setComposerMode":
      return { ...state, composerMode: resolveSetState(state.composerMode, action.value) };
    case "setDerivativeStep":
      return { ...state, derivativeStep: resolveSetState(state.derivativeStep, action.value) };
    case "setIdentityMode":
      return { ...state, identityMode: resolveSetState(state.identityMode, action.value) };
    case "setLinkUrl":
      return { ...state, linkUrl: resolveSetState(state.linkUrl, action.value) };
    case "setLyrics":
      return { ...state, lyrics: resolveSetState(state.lyrics, action.value) };
    case "setMonetizationState":
      return { ...state, monetizationState: resolveSetState(state.monetizationState, action.value) };
    case "setPendingSongBundleId":
      return { ...state, pendingSongBundleId: resolveSetState(state.pendingSongBundleId, action.value) };
    case "setSelectedQualifierIds":
      return { ...state, selectedQualifierIds: resolveSetState(state.selectedQualifierIds, action.value) };
    case "setSongMode":
      return { ...state, songMode: resolveSetState(state.songMode, action.value) };
    case "setSongState":
      return { ...state, songState: resolveSetState(state.songState, action.value) };
    case "setSubmitError":
      return { ...state, submitError: resolveSetState(state.submitError, action.value) };
    case "setTitle":
      return { ...state, title: resolveSetState(state.title, action.value) };
  }
}

export function useCreatePostDraftState(): {
  actions: CreatePostDraftActions;
  state: CreatePostDraftState;
} {
  const [state, dispatch] = React.useReducer(createPostDraftReducer, undefined, createInitialDraftState);

  const actions = React.useMemo<CreatePostDraftActions>(() => ({
    resetCharityContribution: () => dispatch({ type: "setCharityContribution", value: defaultCharityContributionState() }),
    setAudience: (value) => dispatch({ type: "setAudience", value }),
    setAuthorMode: (value) => dispatch({ type: "setAuthorMode", value }),
    setBody: (value) => dispatch({ type: "setBody", value }),
    setCaption: (value) => dispatch({ type: "setCaption", value }),
    setCharityContribution: (value) => dispatch({ type: "setCharityContribution", value }),
    setComposerMode: (value) => dispatch({ type: "setComposerMode", value }),
    setDerivativeStep: (value) => dispatch({ type: "setDerivativeStep", value }),
    setIdentityMode: (value) => dispatch({ type: "setIdentityMode", value }),
    setLinkUrl: (value) => dispatch({ type: "setLinkUrl", value }),
    setLyrics: (value) => dispatch({ type: "setLyrics", value }),
    setMonetizationState: (value) => dispatch({ type: "setMonetizationState", value }),
    setPendingSongBundleId: (value) => dispatch({ type: "setPendingSongBundleId", value }),
    setSelectedQualifierIds: (value) => dispatch({ type: "setSelectedQualifierIds", value }),
    setSongMode: (value) => dispatch({ type: "setSongMode", value }),
    setSongState: (value) => dispatch({ type: "setSongState", value }),
    setSubmitError: (value) => dispatch({ type: "setSubmitError", value }),
    setTitle: (value) => dispatch({ type: "setTitle", value }),
  }), []);

  return { actions, state };
}
