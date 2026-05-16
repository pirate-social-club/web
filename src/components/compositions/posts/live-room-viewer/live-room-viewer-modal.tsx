"use client";

import * as React from "react";
import type { IAgoraRTCClient, IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import { Broadcast, VideoCameraSlash } from "@phosphor-icons/react";

import type { ApiLiveRoomViewerAttachResponse } from "@/lib/api/client-api-types";
import { Button } from "@/components/primitives/button";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/system/modal/modal";
import { cn } from "@/lib/utils";

type ViewerStatus = "idle" | "connecting" | "waiting" | "watching" | "unavailable" | "error";

type LiveRoomViewerModalProps = {
  attachResponse: ApiLiveRoomViewerAttachResponse | null;
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  onRenew?: (uid: number) => Promise<ApiLiveRoomViewerAttachResponse | null>;
};

const TOKEN_RENEW_LEAD_MS = 120_000;
const TOKEN_RENEW_RETRY_MS = 15_000;
const MIN_TOKEN_RENEW_DELAY_MS = 5_000;

function statusText(status: ViewerStatus): string {
  if (status === "connecting") return "Connecting to the live room.";
  if (status === "waiting") return "Connected. Waiting for the broadcaster.";
  if (status === "watching") return "Watching live.";
  if (status === "unavailable") return "Browser playback is unavailable for this room.";
  if (status === "error") return "Could not join the live room.";
  return "Ready to join.";
}

export function LiveRoomViewerModal({
  attachResponse,
  open,
  title,
  onOpenChange,
  onRenew,
}: LiveRoomViewerModalProps) {
  const videoContainerRef = React.useRef<HTMLDivElement | null>(null);
  const clientRef = React.useRef<IAgoraRTCClient | null>(null);
  const renewingRef = React.useRef(false);
  const [status, setStatus] = React.useState<ViewerStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [hasVideo, setHasVideo] = React.useState(false);
  const [tokenExpiresAt, setTokenExpiresAt] = React.useState<number | null>(null);
  const agora = attachResponse?.agora ?? null;

  React.useEffect(() => {
    setTokenExpiresAt(open ? agora?.token_expires_at ?? null : null);
  }, [agora?.token_expires_at, open]);

  React.useEffect(() => {
    if (!open) {
      setStatus("idle");
      setError(null);
      setHasVideo(false);
      setTokenExpiresAt(null);
      return;
    }

    if (!agora?.configured || !agora.app_id) {
      setStatus("unavailable");
      setError(null);
      return;
    }

    const credentials = {
      appId: agora.app_id,
      channel: agora.channel,
      token: agora.token,
      uid: agora.uid,
    };
    let disposed = false;

    async function subscribeToUser(client: IAgoraRTCClient, user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") {
      await client.subscribe(user, mediaType);
      if (disposed) return;

      if (mediaType === "video" && user.videoTrack) {
        setHasVideo(true);
        setStatus("watching");
        window.requestAnimationFrame(() => {
          const target = videoContainerRef.current;
          if (target && user.videoTrack) {
            user.videoTrack.play(target);
          }
        });
      }

      if (mediaType === "audio" && user.audioTrack) {
        user.audioTrack.play();
        setStatus((current) => current === "waiting" ? "watching" : current);
      }
    }

    async function joinRoom() {
      try {
        setStatus("connecting");
        setError(null);
        const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        if (disposed) return;

        const client = AgoraRTC.createClient({ codec: "vp8", mode: "live" });
        clientRef.current = client;
        await client.setClientRole("audience");

        client.on("user-published", (user, mediaType) => {
          if (mediaType === "audio" || mediaType === "video") {
            void subscribeToUser(client, user, mediaType).catch((subscribeError: unknown) => {
              if (disposed) return;
              setStatus("error");
              setError(subscribeError instanceof Error ? subscribeError.message : String(subscribeError));
            });
          }
        });
        client.on("user-unpublished", (_user, mediaType) => {
          if (mediaType === "video") {
            setHasVideo(false);
          }
          setStatus("waiting");
        });
        client.on("user-left", () => {
          setHasVideo(false);
          setStatus("waiting");
        });

        await client.join(credentials.appId, credentials.channel, credentials.token, credentials.uid);
        if (!disposed) {
          setStatus("waiting");
        }
      } catch (joinError) {
        if (disposed) return;
        setStatus("error");
        setError(joinError instanceof Error ? joinError.message : String(joinError));
      }
    }

    void joinRoom();

    return () => {
      disposed = true;
      const client = clientRef.current;
      clientRef.current = null;
      setHasVideo(false);
      if (client) {
        void client.leave().catch(() => undefined);
      }
    };
  }, [agora?.app_id, agora?.channel, agora?.configured, agora?.token, agora?.uid, open]);

  React.useEffect(() => {
    if (!open || !onRenew || !agora?.configured || agora.uid == null || !tokenExpiresAt) return;
    const client = clientRef.current;
    if (!client) return;

    let canceled = false;
    const renewDelay = Math.max(
      tokenExpiresAt * 1000 - Date.now() - TOKEN_RENEW_LEAD_MS,
      MIN_TOKEN_RENEW_DELAY_MS,
    );

    const timeout = window.setTimeout(() => {
      if (renewingRef.current) return;
      renewingRef.current = true;
      void onRenew(agora.uid)
        .then(async (renewed) => {
          if (canceled || !renewed?.agora.token) return;
          await client.renewToken(renewed.agora.token);
          if (canceled) return;
          setTokenExpiresAt(renewed.agora.token_expires_at);
          setError(null);
        })
        .catch((renewError: unknown) => {
          if (canceled) return;
          setError(renewError instanceof Error ? renewError.message : String(renewError));
          setTokenExpiresAt(Math.floor((Date.now() + TOKEN_RENEW_RETRY_MS + TOKEN_RENEW_LEAD_MS) / 1000));
        })
        .finally(() => {
          renewingRef.current = false;
        });
    }, renewDelay);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [agora?.configured, agora?.uid, onRenew, open, tokenExpiresAt]);

  return (
    <Modal onOpenChange={onOpenChange} open={open}>
      <ModalContent className="max-w-3xl p-0" mobileSide="bottom">
        <div className="flex flex-col">
          <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-black">
            <div ref={videoContainerRef} className={cn("size-full", !hasVideo && "hidden")} />
            {!hasVideo ? (
              <div className="absolute inset-0 grid place-items-center px-6 text-center text-white">
                <div className="space-y-3">
                  {status === "unavailable" ? (
                    <VideoCameraSlash className="mx-auto size-10 opacity-80" />
                  ) : (
                    <Broadcast className="mx-auto size-10 opacity-80" />
                  )}
                  <p className="text-base font-medium">{statusText(status)}</p>
                  {error ? <p className="text-base text-white/70">{error}</p> : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4 p-5">
            <ModalHeader className="space-y-1 text-start">
              <ModalTitle>{title}</ModalTitle>
              <ModalDescription>{statusText(status)}</ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <Button onClick={() => onOpenChange(false)} variant="outline">
                Close
              </Button>
            </ModalFooter>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
