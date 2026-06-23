"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { FormNote } from "@/components/primitives/form-layout";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import type { CommunityArchivePageProps } from "./community-archive-page.types";

const copy = {
  title: "Danger zone",
  intro: "Archiving retires this community. It is reversible — you can restore it at any time.",
  effectsTitle: "What archiving does",
  effects: [
    "Hides the community from discovery and search.",
    "Returns 404 for the public community page.",
    "Blocks new posts, comments, joins, listings, live rooms, and purchases.",
    "Keeps all existing content, members, and settings intact for restore.",
  ],
  archiveAction: "Archive community",
  confirmTitle: "Archive this community?",
  confirmBody: "Members won't be able to post, join, or buy while it's archived. You can unarchive it later.",
  confirmAction: "Yes, archive",
  cancelAction: "Cancel",
  archivedTitle: "This community is archived",
  archivedBody: "It's hidden from discovery and new activity is blocked. Restore it to bring it back online.",
  unarchiveAction: "Unarchive community",
} as const;

export function CommunityArchivePage({
  status,
  submitState,
  className,
  onArchive,
  onUnarchive,
}: CommunityArchivePageProps) {
  const [confirming, setConfirming] = React.useState(false);
  const saving = submitState.kind === "saving";

  // Collapse the confirm affordance once a transition succeeds.
  React.useEffect(() => {
    if (status === "archived") {
      setConfirming(false);
    }
  }, [status]);

  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      <div className="space-y-2">
        <Type as="h1" variant="h1" className="md:text-4xl text-destructive">{copy.title}</Type>
        <FormNote>{copy.intro}</FormNote>
      </div>

      {status === "active" ? (
        <section className="space-y-4 rounded-md border border-destructive/40 bg-destructive/5 p-5 md:p-6">
          <Type as="h2" variant="h2">{copy.effectsTitle}</Type>
          <ul className="list-disc space-y-1.5 pl-5 text-base leading-6 text-foreground">
            {copy.effects.map((effect) => (
              <li key={effect}>{effect}</li>
            ))}
          </ul>

          {confirming ? (
            <div className="space-y-3 border-t border-destructive/30 pt-4">
              <Type as="p" variant="body-strong">{copy.confirmTitle}</Type>
              <FormNote>{copy.confirmBody}</FormNote>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="destructive"
                  loading={saving}
                  onClick={() => onArchive?.()}
                >
                  {copy.confirmAction}
                </Button>
                <Button
                  variant="ghost"
                  disabled={saving}
                  onClick={() => setConfirming(false)}
                >
                  {copy.cancelAction}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => setConfirming(true)}
            >
              {copy.archiveAction}
            </Button>
          )}
        </section>
      ) : (
        <section className="space-y-4 rounded-md border border-border-soft bg-muted/20 p-5 md:p-6">
          <Type as="h2" variant="h2">{copy.archivedTitle}</Type>
          <FormNote>{copy.archivedBody}</FormNote>
          <Button
            variant="default"
            loading={saving}
            onClick={() => onUnarchive?.()}
          >
            {copy.unarchiveAction}
          </Button>
        </section>
      )}

      {submitState.kind === "error" ? (
        <p className="text-base text-destructive">{submitState.message}</p>
      ) : null}
    </section>
  );
}
