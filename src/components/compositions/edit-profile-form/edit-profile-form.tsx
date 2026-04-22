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
import { useUiLocale } from "@/lib/ui-locale";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";
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
  expandable = false,
}: {
  currentHandle: string;
  handleFlow: Pick<
    UseGlobalHandleFlowReturn,
    "draft" | "preview" | "state" | "setDraft" | "checkAvailability" | "submitRename" | "resetState"
  >;
  expandable?: boolean;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").settings;
  const { draft, preview, state, setDraft, checkAvailability, submitRename } = handleFlow;
  const [isExpanded, setIsExpanded] = React.useState(
    !expandable || Boolean(draft) || state.kind !== "idle",
  );

  const prevDraftRef = React.useRef(draft);
  const pendingCheckRef = React.useRef(false);

  React.useEffect(() => {
    if (draft !== prevDraftRef.current) {
      prevDraftRef.current = draft;
      if (state.kind !== "idle" && state.kind !== "checking") {
        handleFlow.resetState();
      }
    }
  }, [draft, handleFlow, state.kind]);

  React.useEffect(() => {
    if (state.kind === "idle" && pendingCheckRef.current) {
      pendingCheckRef.current = false;
      checkAvailability();
    }
  }, [checkAvailability, state.kind]);

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

  const handleCancel = () => {
    if (expandable) {
      setIsExpanded(false);
      handleFlow.resetState();
      setDraft("");
    }
  };

  const isBusy = state.kind === "checking" || state.kind === "saving";

  if (!isExpanded) {
    return (
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-background">
        <div className="flex min-h-16 flex-col items-start gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="text-base font-medium text-muted-foreground">{copy.currentHandleLabel}</div>
          <div className="flex items-center gap-4">
            <div className="min-w-0 max-w-full truncate text-base font-medium text-foreground">{currentHandle}</div>
            <Button onClick={() => setIsExpanded(true)} size="sm" variant="secondary">
              {copy.changeHandleLabel}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!expandable && <FormSectionHeading title={copy.handleNotePirate} />}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-background">
        <div className="flex min-h-16 flex-col items-start gap-1 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="text-base font-medium text-muted-foreground">{copy.currentHandleLabel}</div>
          <div className="min-w-0 max-w-full truncate text-base font-medium text-foreground sm:text-end">{currentHandle}</div>
        </div>
        <div className="space-y-2 px-4 py-4">
          <FormFieldLabel htmlFor="handle-input" label={copy.newHandleLabel} />
          <Input
            disabled={isBusy}
            id="handle-input"
            onBlur={handleBlur}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={copy.handlePlaceholder}
            value={draft}
          />
          {preview ? <FormNote>{preview}</FormNote> : null}
        </div>
      </div>

      {state.kind === "checking" && (
        <div className="flex items-center gap-2 text-base text-muted-foreground">
          <Spinner className="size-4" />
          {copy.checkingAvailability}
        </div>
      )}

      {state.kind === "available" && (
        <div className="space-y-3">
          <FormNote tone="default">{copy.handleAvailableMessage}</FormNote>
          {!state.freeRenameRemaining && (
            <FormNote tone="warning">{copy.renameRequiresPaidUpgrade}</FormNote>
          )}
          <div className="flex items-center gap-3">
            <Button onClick={() => void submitRename()} size="sm">
              {copy.renameHandle}
            </Button>
            {expandable && (
              <Button onClick={handleCancel} size="sm" variant="ghost">
                {copy.cancelHandleChangeLabel}
              </Button>
            )}
          </div>
        </div>
      )}

      {state.kind === "unavailable" && (
        <div className="space-y-3">
          <FormNote tone="destructive">{state.reason}</FormNote>
          {expandable && (
            <Button onClick={handleCancel} size="sm" variant="ghost">
              {copy.cancelHandleChangeLabel}
            </Button>
          )}
        </div>
      )}

      {state.kind === "saving" && (
        <div className="flex items-center gap-2 text-base text-muted-foreground">
          <Spinner className="size-4" />
          {copy.renamingHandle}
        </div>
      )}

      {state.kind === "error" && (
        <div className="space-y-3">
          <FormNote tone="destructive">{state.message}</FormNote>
          {expandable && (
            <Button onClick={handleCancel} size="sm" variant="ghost">
              {copy.cancelHandleChangeLabel}
            </Button>
          )}
        </div>
      )}

      {state.kind === "success" && (
        <div className="space-y-3">
          <FormNote tone="default">{copy.handleUpdatedMessage.replace("{handle}", state.newHandle)}</FormNote>
          {expandable && (
            <Button onClick={handleCancel} size="sm" variant="ghost">
              {copy.cancelHandleChangeLabel}
            </Button>
          )}
        </div>
      )}

      {state.kind === "idle" && expandable && (
        <div className="flex items-center gap-3">
          <Button disabled size="sm">
            {copy.renameHandle}
          </Button>
          <Button onClick={handleCancel} size="sm" variant="ghost">
            {copy.cancelHandleChangeLabel}
          </Button>
        </div>
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
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").settings;
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
          <h2 className="text-lg font-semibold text-foreground">{copy.editProfileTitle}</h2>
          {currentHandle ? (
            <p className="text-base text-muted-foreground">{currentHandle}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <FormSectionHeading title={copy.profileSectionTitle} />
        <div className="space-y-2">
          <FormFieldLabel
            counter={`${values.displayName.length}/${DISPLAY_NAME_MAX}`}
            htmlFor="display-name"
            label={copy.displayNameLabel}
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
            label={copy.bioLabel}
          />
          <Textarea
            id="bio"
            onChange={(e) => handleBioChange(e.target.value)}
            placeholder={copy.bioPlaceholder}
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
          <div className="me-auto flex items-center gap-2 text-base text-destructive">
            <Warning className="size-4 shrink-0" />
            {submitState.message}
          </div>
        ) : null}
        <Button disabled={!canSubmit} loading={isSaving} type="submit">
          {copy.saveProfile}
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
  const { locale } = useUiLocale();
  const copy = React.useMemo(() => getLocaleMessages(locale, "routes").settings, [locale]);
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
          <DialogTitle>{copy.editProfileTitle}</DialogTitle>
          <DialogDescription>
            {copy.editProfileDescription}
          </DialogDescription>
        </DialogHeader>
        <EditProfileForm {...formProps} />
      </DialogContent>
    </Dialog>
  );
}
