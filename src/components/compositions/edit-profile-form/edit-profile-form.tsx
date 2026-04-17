"use client";

import * as React from "react";
import { Warning } from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/primitives/dialog";
import { FormFieldLabel, FormNote, FormSectionHeading } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Spinner } from "@/components/primitives/spinner";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";
import type {
  EditProfileFieldError,
  EditProfileFormProps,
} from "./edit-profile-form.types";
import type { UseGlobalHandleFlowReturn } from "@/hooks/use-global-handle-flow";

const DISPLAY_NAME_MAX = 50;
const BIO_MAX = 300;

function getFieldError(
  fieldErrors: EditProfileFieldError[],
  field: EditProfileFieldError["field"],
): string | undefined {
  return fieldErrors.find((e) => e.field === field)?.message;
}

export function GlobalHandleField({
  currentHandle,
  handleFlow,
}: {
  currentHandle: string;
  handleFlow: Pick<
    UseGlobalHandleFlowReturn,
    "draft" | "preview" | "state" | "setDraft" | "checkAvailability" | "submitRename" | "resetState"
  >;
}) {
  const { draft, preview, state, setDraft, checkAvailability, submitRename } = handleFlow;

  const prevDraftRef = React.useRef(draft);
  const pendingCheckRef = React.useRef(false);

  React.useEffect(() => {
    if (draft !== prevDraftRef.current) {
      prevDraftRef.current = draft;
      if (state.kind !== "idle" && state.kind !== "checking") {
        handleFlow.resetState();
      }
    }
  });

  React.useEffect(() => {
    if (state.kind === "idle" && pendingCheckRef.current) {
      pendingCheckRef.current = false;
      checkAvailability();
    }
  });

  const handleBlur = () => {
    if (state.kind === "idle") {
      checkAvailability();
    } else if (state.kind !== "checking") {
      pendingCheckRef.current = true;
      handleFlow.resetState();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (state.kind === "available") {
        void submitRename();
      } else if (state.kind === "idle") {
        checkAvailability();
      }
    }
  };

  const isBusy = state.kind === "checking" || state.kind === "saving";

  return (
    <div className="space-y-4">
      <FormSectionHeading title="Handle" />
      <div className="space-y-2">
        <FormFieldLabel htmlFor="current-handle" label="Current handle" />
        <Input disabled id="current-handle" value={currentHandle} />
      </div>
      <div className="space-y-2">
        <FormFieldLabel htmlFor="handle-input" label="New handle" />
        <Input
          disabled={isBusy}
          id="handle-input"
          onBlur={handleBlur}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="your-new-handle"
          value={draft}
        />
        {preview ? <FormNote>{preview}</FormNote> : null}
      </div>

      {state.kind === "checking" && (
        <div className="flex items-center gap-2 text-base text-muted-foreground">
          <Spinner className="size-4" />
          Checking availability...
        </div>
      )}

      {state.kind === "available" && (
        <div className="space-y-3">
          <FormNote tone="default">This handle is available.</FormNote>
          {!state.freeRenameRemaining && (
            <FormNote tone="warning">This rename requires a paid upgrade.</FormNote>
          )}
          <Button onClick={() => void submitRename()} size="sm">
            Rename handle
          </Button>
        </div>
      )}

      {state.kind === "unavailable" && (
        <FormNote tone="destructive">{state.reason}</FormNote>
      )}

      {state.kind === "saving" && (
        <div className="flex items-center gap-2 text-base text-muted-foreground">
          <Spinner className="size-4" />
          Renaming handle...
        </div>
      )}

      {state.kind === "error" && (
        <FormNote tone="destructive">{state.message}</FormNote>
      )}

      {state.kind === "success" && (
        <FormNote tone="default">Handle updated to {state.newHandle}.</FormNote>
      )}
    </div>
  );
}

export function EditProfileForm({
  className,
  currentAvatarSrc,
  currentBio = "",
  currentDisplayName,
  currentHandle,
  fieldErrors,
  handleFlow,
  onChange,
  onSubmit,
  submitState,
  values,
}: EditProfileFormProps) {
  const displayNameError = getFieldError(fieldErrors, "displayName");
  const bioError = getFieldError(fieldErrors, "bio");
  const bioLength = values.bio.length;

  const trimmedDisplayName = values.displayName.trim();
  const isDirty =
    trimmedDisplayName !== currentDisplayName.trim() ||
    values.bio !== (currentBio ?? "");

  const isSaving = submitState.kind === "saving";
  const canSubmit = isDirty && !isSaving && fieldErrors.length === 0 && trimmedDisplayName.length > 0;

  const handleDisplayNameChange = (value: string) => {
    onChange?.({ ...values, displayName: value });
  };

  const handleBioChange = (value: string) => {
    if (value.length <= BIO_MAX) {
      onChange?.({ ...values, bio: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit?.({ ...values, displayName: trimmedDisplayName });
  };

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit}>
      <div className="flex items-center gap-4">
        <Avatar fallback={currentDisplayName} size="lg" src={currentAvatarSrc} />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Edit profile</h2>
          {currentHandle ? (
            <p className="text-base text-muted-foreground">{currentHandle}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <FormSectionHeading title="Profile" />
        <div className="space-y-2">
          <FormFieldLabel
            counter={`${values.displayName.length}/${DISPLAY_NAME_MAX}`}
            htmlFor="display-name"
            label="Display name"
          />
          <Input
            id="display-name"
            maxLength={DISPLAY_NAME_MAX}
            onChange={(e) => handleDisplayNameChange(e.target.value)}
            value={values.displayName}
          />
          {displayNameError ? (
            <FormNote tone="destructive">{displayNameError}</FormNote>
          ) : null}
        </div>

        <div className="space-y-2">
          <FormFieldLabel
            counter={`${bioLength}/${BIO_MAX}`}
            htmlFor="bio"
            label="Bio"
          />
          <Textarea
            id="bio"
            onChange={(e) => handleBioChange(e.target.value)}
            placeholder="Tell people about yourself"
            rows={4}
            value={values.bio}
          />
          {bioError ? (
            <FormNote tone="destructive">{bioError}</FormNote>
          ) : null}
        </div>
      </div>

      {handleFlow && currentHandle ? (
        <GlobalHandleField currentHandle={currentHandle} handleFlow={handleFlow} />
      ) : null}

      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        {submitState.kind === "error" ? (
          <div className="mr-auto flex items-center gap-2 text-base text-destructive">
            <Warning className="size-4 shrink-0" />
            {submitState.message}
          </div>
        ) : null}
        <Button disabled={!canSubmit} loading={isSaving} type="submit">
          Save changes
        </Button>
      </div>
    </form>
  );
}

export function EditProfileDialog({
  children,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  ...formProps
}: EditProfileFormProps & {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChangeProp ?? setInternalOpen;

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update your display name, bio, or handle.
          </DialogDescription>
        </DialogHeader>
        <EditProfileForm {...formProps} />
      </DialogContent>
    </Dialog>
  );
}
