"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import {
  Modal,
  ModalContent,
} from "@/components/compositions/system/modal/modal";

type LiveRoomReplayPlayerModalProps = {
  mimeType?: string | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  sourceUrl: string | null;
  title: string;
};

function isVideoMimeType(mimeType: string | null | undefined): boolean {
  return mimeType?.toLowerCase().startsWith("video/") === true;
}

export function LiveRoomReplayPlayerSurface({
  mimeType,
  onClose,
  sourceUrl,
  title,
}: {
  mimeType?: string | null;
  onClose: () => void;
  sourceUrl: string | null;
  title: string;
}) {
  const isVideo = isVideoMimeType(mimeType);

  return (
    <>
      <div className="bg-black">
        {sourceUrl ? (
          isVideo ? (
            <video
              autoPlay
              className="aspect-video w-full bg-black"
              controls
              playsInline
              src={sourceUrl}
            />
          ) : (
            <div className="flex min-h-56 items-center justify-center bg-black px-5">
              <audio autoPlay className="w-full max-w-xl" controls src={sourceUrl} />
            </div>
          )
        ) : (
          <div className="grid aspect-video place-items-center bg-black text-base text-white/70">
            Loading replay...
          </div>
        )}
      </div>
      <div className="space-y-4 bg-background p-5 text-foreground">
        <div className="space-y-1 text-start">
          <h2 className="text-xl font-semibold leading-tight">{title}</h2>
          <p className="text-base text-muted-foreground">Replay</p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </>
  );
}

export function LiveRoomReplayPlayerModal({
  mimeType,
  onOpenChange,
  open,
  sourceUrl,
  title,
}: LiveRoomReplayPlayerModalProps) {
  return (
    <Modal onOpenChange={onOpenChange} open={open}>
      <ModalContent className="overflow-hidden p-0 max-w-3xl" mobileSide="bottom">
        <LiveRoomReplayPlayerSurface
          mimeType={mimeType}
          onClose={() => onOpenChange(false)}
          sourceUrl={sourceUrl}
          title={title}
        />
      </ModalContent>
    </Modal>
  );
}
