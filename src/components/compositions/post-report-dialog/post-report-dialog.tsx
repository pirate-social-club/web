"use client";

import * as React from "react";

import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/modal";
import { Button } from "@/components/primitives/button";
import { OptionCard } from "@/components/primitives/option-card";
import { Textarea } from "@/components/primitives/textarea";
import type { PirateApiUserReportReasonCode } from "@/lib/pirate-api";

const REPORT_REASON_OPTIONS: Array<{
  value: PirateApiUserReportReasonCode;
  title: string;
  description: string;
}> = [
  {
    value: "spam",
    title: "Spam",
    description: "Commercial noise, repetition, or obvious farming.",
  },
  {
    value: "harassment",
    title: "Harassment",
    description: "Targeted abuse, threats, or intimidation.",
  },
  {
    value: "hate",
    title: "Hate",
    description: "Dehumanizing or hateful content aimed at a protected group.",
  },
  {
    value: "sexual_content",
    title: "Sexual content",
    description: "Explicit sexual material or sexualized content that should be reviewed.",
  },
  {
    value: "graphic_content",
    title: "Graphic content",
    description: "Violent, gory, or disturbing imagery or descriptions.",
  },
  {
    value: "misleading",
    title: "Misleading",
    description: "False framing, impersonation, or deceptive context.",
  },
  {
    value: "other",
    title: "Other",
    description: "Something else that needs moderator attention.",
  },
];

export interface PostReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    reasonCode: PirateApiUserReportReasonCode;
    note: string;
  }) => Promise<void> | void;
  postLabel: string;
  submitting?: boolean;
  errorMessage?: string | null;
}

export function PostReportDialog({
  open,
  onOpenChange,
  onSubmit,
  postLabel,
  submitting = false,
  errorMessage,
}: PostReportDialogProps) {
  const [reasonCode, setReasonCode] = React.useState<PirateApiUserReportReasonCode>("spam");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setReasonCode("spam");
      setNote("");
    }
  }, [open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="w-[min(100%-1rem,42rem)] gap-5 border-border-soft bg-card px-4 py-5 sm:px-6">
        <ModalHeader className="gap-2 text-left">
          <ModalTitle className="text-2xl font-semibold tracking-tight text-foreground">
            Report post
          </ModalTitle>
          <p className="text-base leading-7 text-muted-foreground">
            {postLabel}
          </p>
        </ModalHeader>

        <div className="space-y-3">
          {REPORT_REASON_OPTIONS.map((option) => (
            <OptionCard
              className="rounded-[var(--radius-xl)]"
              description={option.description}
              key={option.value}
              onClick={() => setReasonCode(option.value)}
              selected={reasonCode === option.value}
              title={option.title}
            />
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-base font-semibold text-foreground">Context</div>
          <Textarea
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note for the moderators."
            value={note}
          />
        </div>

        {errorMessage ? (
          <div className="rounded-[var(--radius-xl)] border border-destructive/30 bg-destructive/10 px-4 py-4 text-base text-foreground">
            {errorMessage}
          </div>
        ) : null}

        <ModalFooter className="gap-3 sm:justify-between">
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Cancel
          </Button>
          <Button
            loading={submitting}
            onClick={() => void onSubmit({ note, reasonCode })}
          >
            Send report
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
