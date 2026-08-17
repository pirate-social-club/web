/** @jsxImportSource @solidjs/web */

import { Show, createEffect, createMemo, createSignal } from "solid-js";

import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  FormFieldLabel,
  FormNote,
  FormSectionHeading,
  IconWarningCircle,
  Input,
  Spinner,
  Textarea,
  Type,
  buttonVariants,
  cn,
} from "../../../design-system";
import type {
  EditProfileDialogProps,
  EditProfileFieldError,
  EditProfileFormProps,
  EditProfileFormValues,
  EditProfileHandleFlow,
  HandleRenameState,
} from "./edit-profile-form.types";

export const DISPLAY_NAME_MAX = 50;
export const BIO_MAX = 300;

function fieldError(errors: EditProfileFieldError[], field: EditProfileFieldError["field"]): string | undefined {
  return errors.find((error) => error.field === field)?.message;
}

function handleStateMessage(state: HandleRenameState): string | undefined {
  if (state.kind === "checking") return "Checking availability...";
  if (state.kind === "saving") return "Renaming handle...";
  if (state.kind === "available") return state.freeRenameRemaining === false
    ? "Paid handle changes are not available yet."
    : "This handle is available.";
  if (state.kind === "unavailable" || state.kind === "invalid") return state.reason;
  if (state.kind === "error") return state.message;
  if (state.kind === "success") return `Handle updated to ${state.newHandle}.`;
  return undefined;
}

function HandleStatus(props: { state: HandleRenameState; id: string }) {
  const message = () => handleStateMessage(props.state);
  return (
    <Show when={message()}>
      <div
        aria-live="polite"
        class={cn(
          "flex items-center gap-2",
          props.state.kind === "checking" || props.state.kind === "saving"
            ? "text-muted-foreground"
            : props.state.kind === "available" || props.state.kind === "success"
              ? "text-success"
              : "text-destructive-text",
        )}
        id={props.id}
      >
        <Show when={props.state.kind === "checking" || props.state.kind === "saving"}>
          <Spinner class="size-4" />
        </Show>
        <Type as="span" variant="caption">{message()}</Type>
      </div>
    </Show>
  );
}

export function GlobalHandleField(props: {
  currentHandle: string;
  fieldIdPrefix?: string;
  handleFlow: EditProfileHandleFlow;
  expandable?: boolean;
}) {
  const [isExpanded, setIsExpanded] = createSignal(!props.expandable || Boolean(props.handleFlow.draft) || props.handleFlow.state.kind !== "idle");
  const [draft, setDraft] = createSignal(props.handleFlow.draft);
  const [pendingCheck, setPendingCheck] = createSignal(false);
  let previousHandle = props.currentHandle;
  const inputId = () => `${props.fieldIdPrefix ?? "profile"}-handle`;
  const statusId = () => `${inputId()}-status`;
  const busy = () => props.handleFlow.state.kind === "checking" || props.handleFlow.state.kind === "saving";

  createEffect(
    () => [props.handleFlow.draft, props.currentHandle] as const,
    ([nextDraft, nextHandle]) => {
      if (nextHandle !== previousHandle) {
        previousHandle = nextHandle;
        setDraft("");
        setPendingCheck(false);
        props.handleFlow.onResetState?.();
        props.handleFlow.onDraftChange?.("");
        if (props.expandable) setIsExpanded(false);
        return;
      }
      if (nextDraft !== draft()) setDraft(nextDraft);
    },
  );
  createEffect(
    () => props.handleFlow.state.kind,
    (kind) => {
      if (kind === "idle" && pendingCheck()) {
        setPendingCheck(false);
        props.handleFlow.onCheckAvailability?.();
      }
    },
  );

  const checkAvailability = () => {
    if (props.handleFlow.state.kind === "idle") {
      props.handleFlow.onCheckAvailability?.();
    } else if (props.handleFlow.state.kind !== "checking") {
      setPendingCheck(true);
      props.handleFlow.onResetState?.();
    }
  };
  const submitRename = () => {
    const result = props.handleFlow.onSubmitRename?.();
    if (result && typeof (result as Promise<void>).then === "function") void result;
  };
  const cancel = () => {
    if (!props.expandable) return;
    setIsExpanded(false);
    props.handleFlow.onResetState?.();
    setDraft("");
    props.handleFlow.onDraftChange?.("");
  };

  return (
    <Show
      when={isExpanded()}
      fallback={(
        <div class="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-background">
          <div class="flex min-h-16 flex-col items-start gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Type as="div" variant="caption">Current handle</Type>
            <div class="flex items-center gap-4">
              <Type as="div" class="min-w-0 max-w-full truncate" variant="label">{props.currentHandle}</Type>
              <Button onClick={() => setIsExpanded(true)} size="sm" variant="secondary">Change handle</Button>
            </div>
          </div>
        </div>
      )}
    >
      <div class="space-y-4" data-handle-state={props.handleFlow.state.kind}>
        <Show when={!props.expandable}>
          <FormSectionHeading title="Pirate handle" />
        </Show>
        <div class="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-background">
          <div class="flex min-h-16 flex-col items-start gap-1 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Type as="div" variant="caption">Current handle</Type>
            <Type as="div" class="min-w-0 max-w-full truncate sm:text-end" variant="label">{props.currentHandle}</Type>
          </div>
          <div class="space-y-2 p-4">
            <FormFieldLabel htmlFor={inputId()} label="New handle" />
            <Input
              aria-describedby={props.handleFlow.state.kind === "idle" ? undefined : statusId()}
              disabled={busy()}
              id={inputId()}
              onBlur={checkAvailability}
              onInput={(event) => {
                setDraft(event.currentTarget.value);
                props.handleFlow.onDraftChange?.(event.currentTarget.value);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                if (props.handleFlow.state.kind === "available") submitRename();
                else if (props.handleFlow.state.kind === "idle") checkAvailability();
              }}
              placeholder="your-new-handle"
              value={draft()}
            />
            <Show when={props.handleFlow.preview}>
              <FormNote>{props.handleFlow.preview}</FormNote>
            </Show>
          </div>
        </div>
        <HandleStatus id={statusId()} state={props.handleFlow.state} />
        <Show when={props.handleFlow.state.kind === "available" && props.handleFlow.state.freeRenameRemaining !== false}>
          <Button onClick={submitRename} size="sm">Rename handle</Button>
        </Show>
        <Show when={props.expandable && props.handleFlow.state.kind === "idle"}>
          <div class="flex items-center gap-3">
            <Button disabled size="sm">Rename handle</Button>
            <Button onClick={cancel} size="sm" variant="ghost">Cancel</Button>
          </div>
        </Show>
        <Show when={props.expandable && props.handleFlow.state.kind !== "idle"}>
          <Button onClick={cancel} size="sm" variant="ghost">Cancel</Button>
        </Show>
      </div>
    </Show>
  );
}

export function EditProfileForm(props: EditProfileFormProps) {
  const errors = () => props.fieldErrors ?? [];
  const submitState = () => props.submitState ?? { kind: "idle" as const };
  const currentBio = () => props.currentBio ?? "";
  const prefix = () => props.fieldIdPrefix ?? "profile";
  const displayNameId = () => `${prefix()}-display-name`;
  const bioId = () => `${prefix()}-bio`;
  const displayNameError = createMemo(() => fieldError(errors(), "displayName"));
  const bioError = createMemo(() => fieldError(errors(), "bio"));
  const trimmedDisplayName = createMemo(() => props.values.displayName.trim());
  const isDirty = createMemo(() => trimmedDisplayName() !== props.currentDisplayName.trim() || props.values.bio !== currentBio());
  const isSaving = createMemo(() => submitState().kind === "saving");
  const canSubmit = createMemo(() => isDirty() && !isSaving() && props.values.displayName.trim().length > 0 && props.values.displayName.length <= DISPLAY_NAME_MAX && props.values.bio.length <= BIO_MAX && !displayNameError() && !bioError() && errors().length === 0);

  const change = (values: EditProfileFormValues) => props.onChange?.(values);
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!canSubmit()) return;
    props.onSubmit?.({ ...props.values, displayName: trimmedDisplayName() });
  };

  return (
    <form
      aria-label="Edit profile"
      class={cn("flex flex-col gap-6", props.class)}
      data-profile-form-state={submitState().kind}
      data-submit-enabled={canSubmit() ? "true" : "false"}
      onSubmit={submit}
    >
      <div class="flex items-center gap-4">
        <Avatar fallback={props.currentDisplayName} fallbackSeed={props.currentAvatarSeed} size="lg" src={props.currentAvatarSrc} />
        <div>
          <Type as="h2" variant="h4">Edit profile</Type>
          <Show when={props.currentHandle}>
            <Type as="p" variant="caption">{props.currentHandle}</Type>
          </Show>
        </div>
      </div>

      <div class="space-y-4">
        <FormSectionHeading title="Profile" />
        <div class="space-y-2">
          <FormFieldLabel counter={`${props.values.displayName.length}/${DISPLAY_NAME_MAX}`} htmlFor={displayNameId()} label="Display name" required />
          <Input
            aria-describedby={displayNameError() ? `${displayNameId()}-error` : undefined}
            aria-invalid={displayNameError() ? "true" : undefined}
            id={displayNameId()}
            maxlength={DISPLAY_NAME_MAX}
            onInput={(event) => change({ ...props.values, displayName: event.currentTarget.value.slice(0, DISPLAY_NAME_MAX) })}
            value={props.values.displayName}
          />
          <Show when={displayNameError()}>
            <Type as="p" class="text-destructive-text" id={`${displayNameId()}-error`} role="alert" variant="caption">{displayNameError()}</Type>
          </Show>
        </div>

        <div class="space-y-2">
          <FormFieldLabel counter={`${props.values.bio.length}/${BIO_MAX}`} htmlFor={bioId()} label="Bio" />
          <Textarea
            aria-describedby={bioError() ? `${bioId()}-error` : undefined}
            aria-invalid={bioError() ? "true" : undefined}
            id={bioId()}
            maxlength={BIO_MAX}
            onInput={(event) => change({ ...props.values, bio: event.currentTarget.value.slice(0, BIO_MAX) })}
            placeholder="Tell people about yourself"
            rows={4}
            value={props.values.bio}
          />
          <Show when={bioError()}>
            <Type as="p" class="text-destructive-text" id={`${bioId()}-error`} role="alert" variant="caption">{bioError()}</Type>
          </Show>
        </div>
      </div>

      {props.handleFlow && props.currentHandle
        ? <GlobalHandleField currentHandle={props.currentHandle} fieldIdPrefix={prefix()} handleFlow={props.handleFlow} />
        : null}

      <div class="flex items-center justify-end gap-3 border-t border-border pt-4">
        <Show when={submitState().kind === "error"}>
          <Type aria-live="assertive" class="me-auto flex items-center gap-2 text-destructive-text" variant="caption">
            <IconWarningCircle aria-hidden="true" class="size-4 shrink-0" />
            {(submitState() as { kind: "error"; message: string }).message}
          </Type>
        </Show>
        <Button disabled={!canSubmit()} loading={isSaving()} type="submit">Save profile</Button>
      </div>
    </form>
  );
}

export function EditProfileDialog(props: EditProfileDialogProps) {
  const [internalOpen, setInternalOpen] = createSignal(false);
  const open = () => props.open ?? internalOpen();
  const onOpenChange = (next: boolean) => props.onOpenChange?.(next) ?? setInternalOpen(next);

  return (
    <Dialog onOpenChange={onOpenChange} open={open()}>
      <DialogTrigger class={buttonVariants({ variant: "default" })} type="button">{props.children}</DialogTrigger>
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update your display name, bio, or handle.</DialogDescription>
        </DialogHeader>
        <EditProfileForm {...props} fieldIdPrefix={props.fieldIdPrefix ?? "dialog-profile"} />
      </DialogContent>
    </Dialog>
  );
}
