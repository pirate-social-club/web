"use client";

import * as React from "react";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { logger } from "@/lib/logger";

export interface BookingVideoCredentials {
  app_id: string;
  channel: string;
  uid: number;
  token: string;
}

type StageStatus = "connecting" | "live" | "error";

// Plays a (local or remote) video track into a DOM container and stops/cleans it on change/unmount.
function VideoTile({
  track,
  label,
  muted,
}: {
  track: { play: (el: HTMLElement) => void; stop: () => void } | null;
  label: string;
  muted?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    track.play(el);
    return () => {
      try { track.stop(); } catch { /* already stopped */ }
      el.replaceChildren();
    };
  }, [track]);
  return (
    <div className="relative min-h-0 min-w-0 overflow-hidden rounded-lg bg-black aspect-video">
      <div ref={ref} className="size-full" />
      <div className="absolute bottom-1 left-2 flex items-center gap-1">
        <Type variant="caption" className="text-white/90 drop-shadow">{label}{muted ? " · muted" : ""}</Type>
      </div>
      {!track && (
        <div className="absolute inset-0 grid place-items-center">
          <Type variant="caption" className="text-white/70">Camera off</Type>
        </div>
      )}
    </div>
  );
}

/**
 * 1:1 Agora RTC stage for a booking session. Both parties publish mic+camera and subscribe to the one
 * remote participant. All tracks and the client are torn down on unmount/leave (no lingering camera).
 */
export function BookingVideoStage({
  agora,
  onLeave,
}: {
  agora: BookingVideoCredentials;
  onLeave: () => void;
}): React.ReactElement {
  const clientRef = React.useRef<IAgoraRTCClient | null>(null);
  const localTracksRef = React.useRef<{ mic?: IMicrophoneAudioTrack; cam?: ICameraVideoTrack }>({});
  const [status, setStatus] = React.useState<StageStatus>("connecting");
  const [error, setError] = React.useState<string | null>(null);
  const [remoteUser, setRemoteUser] = React.useState<IAgoraRTCRemoteUser | null>(null);
  const [localCam, setLocalCam] = React.useState<ICameraVideoTrack | null>(null);
  const [micOn, setMicOn] = React.useState(true);
  const [camOn, setCamOn] = React.useState(true);

  React.useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        if (disposed) return;
        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        client.on("user-published", (user, mediaType) => {
          void client.subscribe(user, mediaType).then(() => {
            if (disposed) return;
            if (mediaType === "audio") user.audioTrack?.play();
            setRemoteUser({ ...user } as IAgoraRTCRemoteUser);
          }).catch((e: unknown) => {
            logger.error("[booking-video] subscribe failed", { message: e instanceof Error ? e.message : String(e) });
          });
        });
        client.on("user-unpublished", (user) => { if (!disposed) setRemoteUser({ ...user } as IAgoraRTCRemoteUser); });
        client.on("user-left", (user) => { if (!disposed) setRemoteUser((r) => (r && r.uid === user.uid ? null : r)); });

        await client.join(agora.app_id, agora.channel, agora.token, agora.uid);
        if (disposed) return;
        const [mic, cam] = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (disposed) { try { mic.close(); cam.close(); } catch { /* noop */ } return; }
        localTracksRef.current = { mic, cam };
        setLocalCam(cam);
        await client.publish([mic, cam]);
        if (disposed) return;
        setStatus("live");
      } catch (e) {
        if (disposed) return;
        logger.error("[booking-video] join failed", { message: e instanceof Error ? e.message : String(e) });
        setError(e instanceof Error ? e.message : "Could not start the video session.");
        setStatus("error");
      }
    })();

    return () => {
      disposed = true;
      const { mic, cam } = localTracksRef.current;
      try { mic?.close(); } catch { /* noop */ }
      try { cam?.close(); } catch { /* noop */ }
      localTracksRef.current = {};
      const client = clientRef.current;
      if (client) {
        try { client.removeAllListeners(); } catch { /* noop */ }
        void client.leave().catch(() => { /* noop */ });
        clientRef.current = null;
      }
    };
  }, [agora.app_id, agora.channel, agora.token, agora.uid]);

  const toggleMic = React.useCallback(() => {
    const mic = localTracksRef.current.mic;
    if (!mic) return;
    const next = !micOn;
    void mic.setEnabled(next);
    setMicOn(next);
  }, [micOn]);
  const toggleCam = React.useCallback(() => {
    const cam = localTracksRef.current.cam;
    if (!cam) return;
    const next = !camOn;
    void cam.setEnabled(next);
    setCamOn(next);
  }, [camOn]);

  const remoteVideo = remoteUser?.hasVideo ? remoteUser.videoTrack ?? null : null;

  return (
    <div className="space-y-3">
      {error && <Type variant="body" className="text-destructive">{error}</Type>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <VideoTile track={remoteVideo ?? null} label="Guest" />
        <VideoTile track={camOn ? localCam : null} label="You" muted={!micOn} />
      </div>
      {status === "connecting" && (
        <Type variant="caption" className="text-muted-foreground">Connecting your camera and microphone…</Type>
      )}
      {status === "live" && !remoteUser && (
        <Type variant="caption" className="text-muted-foreground">Waiting for the other participant to join…</Type>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={toggleMic} disabled={status !== "live"}>{micOn ? "Mute" : "Unmute"}</Button>
        <Button variant="outline" onClick={toggleCam} disabled={status !== "live"}>{camOn ? "Camera off" : "Camera on"}</Button>
        <Button variant="ghost" onClick={onLeave}>Leave</Button>
      </div>
    </div>
  );
}
