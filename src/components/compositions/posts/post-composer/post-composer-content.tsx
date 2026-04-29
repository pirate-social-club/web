"use client";

import * as React from "react";

import { Input } from "@/components/primitives/input";
import { Type } from "@/components/primitives/type";

function formatTimestamp(seconds: number): string {
  const bounded = Math.max(0, seconds);
  const mins = Math.floor(bounded / 60);
  const secs = bounded % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
}

export function VideoFramePicker({
  copy,
  file,
  frameSeconds,
  onFrameSecondsChange,
}: {
  copy: {
    fields: Record<string, string>;
  };
  file: File;
  frameSeconds: string;
  onFrameSecondsChange: (value: string) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = React.useState(0);
  const selectedSeconds = Math.min(
    durationSeconds || 0,
    Math.max(0, Number.parseFloat(frameSeconds || "0") || 0),
  );

  React.useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    setDurationSeconds(0);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !objectUrl) return;
    const seekTo = Math.min(video.duration || selectedSeconds, selectedSeconds);
    if (Number.isFinite(seekTo)) {
      video.currentTime = seekTo;
    }
  }, [objectUrl, selectedSeconds]);

  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <Type as="div" variant="label">
          {copy.fields.coverFrame}
        </Type>
        <Type as="div" variant="body-strong">
          {formatTimestamp(selectedSeconds)}
        </Type>
      </div>
      {objectUrl ? (
        <video
          className="aspect-video w-full rounded-[var(--radius-lg)] bg-black object-contain"
          muted
          onLoadedMetadata={(event) => {
            const duration = event.currentTarget.duration;
            setDurationSeconds(Number.isFinite(duration) ? duration : 0);
            event.currentTarget.currentTime = selectedSeconds;
          }}
          playsInline
          preload="metadata"
          ref={videoRef}
          src={objectUrl}
        />
      ) : null}
      <Input
        aria-label={copy.fields.coverFrame}
        className="h-12"
        disabled={durationSeconds <= 0}
        max={Math.max(0, durationSeconds)}
        min={0}
        onChange={(event) => onFrameSecondsChange(event.target.value)}
        step={0.1}
        type="range"
        value={String(selectedSeconds)}
      />
    </div>
  );
}
