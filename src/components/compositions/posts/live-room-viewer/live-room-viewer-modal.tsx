"use client";

import * as React from "react";
import type { IAgoraRTCClient, IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import { Broadcast, ArrowsOut, VideoCameraSlash } from "@phosphor-icons/react";

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

type RemoteVideoUser = {
  uid: string;
  user: IAgoraRTCRemoteUser;
};

type LiveRoomViewerModalProps = {
  attachResponse: ApiLiveRoomViewerAttachResponse | null;
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  onRenew?: (uid: number) => Promise<ApiLiveRoomViewerAttachResponse | null>;
};

type LiveRoomViewerSurfaceProps = {
  attachResponse: ApiLiveRoomViewerAttachResponse | null;
  className?: string;
  contentClassName?: string;
  footer?: React.ReactNode;
  open: boolean;
  placeholderSrc?: string;
  showDetails?: boolean;
  title: string;
  videoClassName?: string;
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

function remoteUserKey(user: IAgoraRTCRemoteUser): string {
  return String(user.uid);
}

function remoteMediaKey(user: IAgoraRTCRemoteUser, mediaType: "audio" | "video"): string {
  return `${remoteUserKey(user)}:${mediaType}`;
}

function updateMediaKeySet(
  previous: Set<string>,
  key: string,
  active: boolean,
): Set<string> {
  if (active && previous.has(key)) return previous;
  if (!active && !previous.has(key)) return previous;
  const next = new Set(previous);
  if (active) {
    next.add(key);
  } else {
    next.delete(key);
  }
  return next;
}

function RemoteVideoTile({ user }: { user: IAgoraRTCRemoteUser }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const videoTrack = user.videoTrack;

  React.useEffect(() => {
    const target = containerRef.current;
    if (!target || !videoTrack) return;
    videoTrack.play(target);
    return () => {
      target.replaceChildren();
    };
  }, [videoTrack]);

  return (
    <div className="relative min-h-0 min-w-0 overflow-hidden bg-black" data-live-room-video-tile="">
      <div ref={containerRef} className="size-full" />
    </div>
  );
}

export function LiveRoomViewerModal({
  attachResponse,
  open,
  title,
  onOpenChange,
  onRenew,
}: LiveRoomViewerModalProps) {
  return (
    <Modal onOpenChange={onOpenChange} open={open}>
      <ModalContent className="p-0 max-w-3xl" mobileSide="bottom">
        <LiveRoomViewerSurface
          attachResponse={attachResponse}
          footer={(
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
          )}
          onRenew={onRenew}
          open={open}
          title={title}
        />
      </ModalContent>
    </Modal>
  );
}

export function LiveRoomViewerSurface({
  attachResponse,
  className,
  contentClassName,
  footer,
  open,
  placeholderSrc,
  showDetails = true,
  title,
  videoClassName,
  onRenew,
}: LiveRoomViewerSurfaceProps) {
  const videoWrapperRef = React.useRef<HTMLDivElement | null>(null);
  const clientRef = React.useRef<IAgoraRTCClient | null>(null);
  const renewingRef = React.useRef(false);
  const [status, setStatus] = React.useState<ViewerStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [remoteVideoUsers, setRemoteVideoUsers] = React.useState<RemoteVideoUser[]>([]);
  const [activeMediaKeys, setActiveMediaKeys] = React.useState<Set<string>>(() => new Set());
  const [tokenExpiresAt, setTokenExpiresAt] = React.useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const agora = attachResponse?.agora ?? null;
  const hasVideo = remoteVideoUsers.length > 0;

  React.useEffect(() => {
    setTokenExpiresAt(open ? agora?.token_expires_at ?? null : null);
  }, [agora?.token_expires_at, open]);

  React.useEffect(() => {
    if (!open) {
      setStatus("idle");
      setError(null);
      setRemoteVideoUsers([]);
      setActiveMediaKeys(new Set());
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
        setRemoteVideoUsers((current) => {
          const key = remoteUserKey(user);
          const index = current.findIndex((entry) => entry.uid === key);
          if (index === -1) return [...current, { uid: key, user }];
          const next = [...current];
          next[index] = { uid: key, user };
          return next;
        });
        setActiveMediaKeys((current) => updateMediaKeySet(current, remoteMediaKey(user, "video"), true));
      }

      if (mediaType === "audio" && user.audioTrack) {
        user.audioTrack.play();
        setActiveMediaKeys((current) => updateMediaKeySet(current, remoteMediaKey(user, "audio"), true));
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
        client.on("user-unpublished", (user, mediaType) => {
          if (mediaType === "video") {
            const key = remoteUserKey(user);
            setRemoteVideoUsers((current) => current.filter((entry) => entry.uid !== key));
            setActiveMediaKeys((current) => updateMediaKeySet(current, remoteMediaKey(user, "video"), false));
          }
          if (mediaType === "audio") {
            setActiveMediaKeys((current) => updateMediaKeySet(current, remoteMediaKey(user, "audio"), false));
          }
        });
        client.on("user-left", (user) => {
          const key = remoteUserKey(user);
          setRemoteVideoUsers((current) => current.filter((entry) => entry.uid !== key));
          setActiveMediaKeys((current) => {
            const next = new Set(current);
            next.delete(`${key}:audio`);
            next.delete(`${key}:video`);
            return next.size === current.size ? current : next;
          });
        });

        await client.join(credentials.appId, credentials.channel, credentials.token, credentials.uid);
        await Promise.all(client.remoteUsers.flatMap((user) => {
          const subscriptions: Array<Promise<void>> = [];
          if (user.hasAudio) {
            subscriptions.push(subscribeToUser(client, user, "audio"));
          }
          if (user.hasVideo) {
            subscriptions.push(subscribeToUser(client, user, "video"));
          }
          return subscriptions;
        }));
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
      setRemoteVideoUsers([]);
      setActiveMediaKeys(new Set());
      if (client) {
        void client.leave().catch(() => undefined);
      }
    };
  }, [agora?.app_id, agora?.channel, agora?.configured, agora?.token, agora?.uid, open]);

  React.useEffect(() => {
    if (!open) return;
    setStatus((current) => {
      if (current !== "waiting" && current !== "watching") return current;
      return activeMediaKeys.size > 0 ? "watching" : "waiting";
    });
  }, [activeMediaKeys.size, open]);

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

  const handleToggleFullscreen = React.useCallback(() => {
    const el = videoWrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      void document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  React.useEffect(() => {
    function onChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return (
    <div className={cn("flex min-h-0 flex-col bg-black text-white", isFullscreen && "h-dvh", className)}>
      <div
        ref={videoWrapperRef}
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-t-lg bg-black",
          !showDetails && "min-h-0 flex-1 rounded-none",
          videoClassName,
        )}
      >
        <div
          className={cn(
            "grid size-full",
            remoteVideoUsers.length > 1 && "grid-cols-2",
            !hasVideo && "hidden",
          )}
        >
          {remoteVideoUsers.map((remote) => (
            <RemoteVideoTile key={remote.uid} user={remote.user} />
          ))}
        </div>
        {!hasVideo ? (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-white">
            {placeholderSrc ? (
              <>
                <img
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 size-full object-cover"
                  src={placeholderSrc}
                />
                <div className="absolute inset-0 bg-black/55" />
              </>
            ) : null}
            <div className="relative z-10 space-y-3">
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
        {hasVideo ? (
          <button
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-md bg-black/60 text-white transition-colors hover:bg-black/80"
            onClick={handleToggleFullscreen}
            type="button"
          >
            <ArrowsOut className="size-5" weight="bold" />
          </button>
        ) : null}
      </div>

      {showDetails ? (
        <div className={cn("space-y-4 bg-background p-5 text-foreground", contentClassName)}>
          <ModalHeader className="space-y-1 text-start">
            <ModalTitle>{title}</ModalTitle>
            <ModalDescription>{statusText(status)}</ModalDescription>
          </ModalHeader>
          {footer ? <ModalFooter>{footer}</ModalFooter> : null}
        </div>
      ) : null}
    </div>
  );
}
