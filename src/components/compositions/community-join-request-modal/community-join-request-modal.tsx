"use client";

import * as React from "react";
import { CheckCircle, UserPlus } from "@phosphor-icons/react";

import { Modal } from "@/components/compositions/modal/modal";
import {
  StandardModalContent,
  StandardModalHeader,
  StandardModalIconBadge,
} from "@/components/compositions/modal/standard-modal-layout";
import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { Textarea } from "@/components/primitives/textarea";
import { Type, typeVariants } from "@/components/primitives/type";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";

export interface CommunityJoinRequestModalProps {
  communityName: string;
  error?: string | null;
  forceMobile?: boolean;
  initialNote?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (note: string) => Promise<void> | void;
  open: boolean;
  submitted?: boolean;
  submitting?: boolean;
}

const MAX_NOTE_LENGTH = 500;

export function CommunityJoinRequestModal({
  communityName,
  error,
  forceMobile,
  initialNote = "",
  onOpenChange,
  onSubmit,
  open,
  submitted = false,
  submitting = false,
}: CommunityJoinRequestModalProps) {
  const { copy } = useRouteMessages();
  const jc = copy.joinRequest;
  const textareaId = React.useId();
  const [note, setNote] = React.useState(() => initialNote.slice(0, MAX_NOTE_LENGTH));

  React.useEffect(() => {
    if (open) {
      setNote(initialNote.slice(0, MAX_NOTE_LENGTH));
    }
  }, [initialNote, open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(note.trim());
  };

  return (
    <Modal forceMobile={forceMobile} onOpenChange={onOpenChange} open={open}>
      <StandardModalContent>
        <StandardModalHeader
          description={submitted
            ? jc.submittedDescription
            : jc.description}
          icon={(
            <StandardModalIconBadge>
              {submitted ? <CheckCircle className="size-8" weight="duotone" /> : <UserPlus className="size-8" weight="duotone" />}
            </StandardModalIconBadge>
          )}
          title={submitted ? jc.submittedTitle : jc.title}
        />

        {submitted ? (
          <div className="mt-8">
            <Button className="h-14 w-full" onClick={() => onOpenChange(false)}>
              {jc.done}
            </Button>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <label className={typeVariants({ variant: "body-strong" })} htmlFor={textareaId}>
                  {jc.messageOptional}
                </label>
                <Type as="span" className="shrink-0 text-muted-foreground" variant="caption">
                  {note.length}/{MAX_NOTE_LENGTH}
                </Type>
              </div>
              <Textarea
                disabled={submitting}
                id={textareaId}
                maxLength={MAX_NOTE_LENGTH}
                onChange={(event) => setNote(event.target.value)}
                placeholder={jc.whyJoinPlaceholder.replace("{communityName}", communityName)}
                rows={5}
                value={note}
              />
            </div>

            {error ? <FormNote tone="warning">{error}</FormNote> : null}

            <Button className="h-14 w-full" loading={submitting} type="submit">
              {jc.submit}
            </Button>
          </form>
        )}
      </StandardModalContent>
    </Modal>
  );
}
