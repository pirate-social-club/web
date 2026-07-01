"use client";

import type { SubmitProgressStep } from "./progress";

// Ordered submit-progress step lists per post type. Shared between the live submit
// flow (create-post-state) and Storybook, so the composer's progress presentation
// can be reviewed against the exact steps production emits.

export function songSubmitProgressSteps(input: {
  hasPendingBundle: boolean;
  hasExtraArtifacts: boolean;
  isLocked: boolean;
}): SubmitProgressStep[] {
  const steps: SubmitProgressStep[] = [
    { key: "validating", phase: "validating", label: "Checking details" },
  ];
  if (!input.hasPendingBundle) {
    steps.push({ key: "upload_primary_audio", phase: "uploading_media", label: "Uploading audio" });
    if (input.hasExtraArtifacts) {
      steps.push({ key: "upload_artifacts", phase: "uploading_media", label: "Uploading files" });
    }
    steps.push(
      { key: "create_bundle", phase: "processing_media", label: "Analyzing song" },
      { key: "check_rights", phase: "checking_rights", label: "Checking rights" },
    );
  }
  if (input.isLocked) {
    steps.push({ key: "generate_preview", phase: "processing_media", label: "Generating preview" });
  }
  steps.push({ key: "publish_post", phase: "publishing_post", label: "Publishing" });
  if (input.isLocked) {
    steps.push({ key: "create_listing", phase: "creating_listing", label: "Creating listing" });
  }
  steps.push(
    { key: "check_registration", phase: "checking_registration", label: "Checking registration" },
    { key: "done", phase: "done", label: "Post published" },
  );
  return steps;
}

export function videoSubmitProgressSteps(input: { monetized: boolean }): SubmitProgressStep[] {
  const steps: SubmitProgressStep[] = [
    { key: "validating", phase: "validating", label: "Checking details" },
    { key: "upload_video", phase: "uploading_media", label: "Uploading video" },
    { key: "extract_poster", phase: "preparing_media", label: "Preparing poster" },
    { key: "upload_poster", phase: "uploading_media", label: "Uploading poster" },
    { key: "publish_post", phase: "publishing_post", label: "Publishing" },
  ];
  if (input.monetized) {
    steps.push({ key: "create_listing", phase: "creating_listing", label: "Creating listing" });
  }
  steps.push(
    { key: "check_registration", phase: "checking_registration", label: "Checking registration" },
    { key: "done", phase: "done", label: "Post published" },
  );
  return steps;
}

export function simpleSubmitProgressSteps(input: {
  mode: "text" | "image" | "link" | "live";
  monetized?: boolean;
  hasMedia?: boolean;
}): SubmitProgressStep[] {
  const steps: SubmitProgressStep[] = [
    { key: "validating", phase: "validating", label: "Checking details" },
  ];
  if (input.hasMedia) {
    steps.push({
      key: "prepare_media",
      phase: input.mode === "image" ? "uploading_media" : "preparing_media",
      label: input.mode === "live" ? "Preparing media" : "Uploading image",
    });
  }
  if (input.monetized) {
    steps.push({ key: "create_listing", phase: "creating_listing", label: "Creating listing" });
  }
  steps.push(
    { key: "publish_post", phase: "publishing_post", label: input.mode === "live" ? "Publishing live room" : "Publishing" },
    { key: "done", phase: "done", label: input.mode === "live" ? "Live room published" : "Post published" },
  );
  return steps;
}
