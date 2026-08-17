import { For, Show } from "solid-js";

import { Avatar } from "@/components/data-display/avatar/avatar";
import {
  IconBell,
  IconChatCircle,
  IconHouse,
  IconWallet,
} from "@/components/media/icons";
import { createClientHydrated } from "@/lib/hydration";
import { createIsMobile } from "@/lib/media-query";
import { cn } from "@/lib/cn";

export type FooterNavItemId = "home" | "wallet" | "chat" | "inbox" | "profile";

function formatUnreadCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

function normalizeUnreadCount(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.floor(count));
}

export interface MobileFooterNavLabels {
  chat?: string;
  chatAriaLabel?: string;
  home?: string;
  inbox?: string;
  inboxAriaLabel?: string;
  primaryNavAriaLabel?: string;
  profile?: string;
  profileAriaLabel?: string;
  wallet?: string;
  walletAriaLabel?: string;
}

export interface MobileFooterNavProps {
  activeItem?: FooterNavItemId;
  avatarFallback?: string;
  class?: string;
  forceMobile?: boolean;
  /** Haptic-style tap feedback hook fired before each item action; the host
      wires real haptics. */
  onTapHaptic?: () => void;
  labels?: MobileFooterNavLabels;
  onChatClick?: () => void;
  onHomeClick?: () => void;
  onInboxClick?: () => void;
  onProfileClick?: () => void;
  onWalletClick?: () => void;
  unreadChatCount?: number;
  unreadInboxCount?: number;
  userAvatarSeed?: string | null;
  userAvatarSrc?: string | null;
}

/**
 * Fixed bottom navigation for the mobile app shell. Callback-driven: item
 * presses report through the on*Click props, locale copy arrives via labels,
 * and tap haptics are an injected onTapHaptic callback. Renders nothing on
 * desktop (hydration-gated detection, forceMobile to override).
 */
export function MobileFooterNav(props: MobileFooterNavProps) {
  const chat = () => props.labels?.chat ?? "Chat";
  const home = () => props.labels?.home ?? "Home";
  const inbox = () => props.labels?.inbox ?? "Inbox";
  const primaryNavAriaLabel = () =>
    props.labels?.primaryNavAriaLabel ?? "Primary navigation";
  const profile = () => props.labels?.profile ?? "Profile";
  const wallet = () => props.labels?.wallet ?? "Wallet";

  const detectedMobile = createIsMobile();
  const hydrated = createClientHydrated();
  const isMobile = () => props.forceMobile ?? (hydrated() ? detectedMobile() : false);

  const unreadChat = () => normalizeUnreadCount(props.unreadChatCount ?? 0);
  const unreadInbox = () => normalizeUnreadCount(props.unreadInboxCount ?? 0);
  const chatAriaLabel = () =>
    unreadChat() > 0
      ? `${props.labels?.chatAriaLabel ?? chat()}, ${unreadChat()}`
      : (props.labels?.chatAriaLabel ?? chat());
  const inboxAriaLabel = () =>
    unreadInbox() > 0
      ? `${props.labels?.inboxAriaLabel ?? inbox()}, ${unreadInbox()}`
      : (props.labels?.inboxAriaLabel ?? inbox());

  const handleTap = (action?: () => void) => {
    if (!action) return;
    props.onTapHaptic?.();
    action();
  };

  const items = () =>
    [
      { id: "home", icon: IconHouse, label: home(), ariaLabel: home(), onClick: props.onHomeClick },
      { id: "wallet", icon: IconWallet, label: wallet(), ariaLabel: props.labels?.walletAriaLabel ?? wallet(), onClick: props.onWalletClick },
      { id: "chat", icon: IconChatCircle, label: chat(), ariaLabel: chatAriaLabel(), onClick: props.onChatClick },
      { id: "inbox", icon: IconBell, label: inbox(), ariaLabel: inboxAriaLabel(), onClick: props.onInboxClick },
    ] as const;

  return (
    <Show when={isMobile()}>
      <nav
        aria-label={primaryNavAriaLabel()}
        class={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md",
          props.class,
        )}
      >
        <div class="grid h-[var(--header-height)] grid-cols-5 items-center px-2">
          <For each={items()}>
            {(item) => {
              const active = () => (props.activeItem ?? "home") === item.id;
              const unread = () =>
                item.id === "inbox" ? unreadInbox() : item.id === "chat" ? unreadChat() : 0;
              return (
                <button
                  aria-current={active() ? "page" : undefined}
                  aria-label={item.ariaLabel}
                  class={cn(
                    "relative mx-auto inline-flex size-12 items-center justify-center rounded-full transition-colors",
                    active()
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  onClick={() => handleTap(item.onClick)}
                  type="button"
                >
                  <item.icon class="size-6" />
                  {unread() > 0 ? (
                    <span
                      aria-hidden="true"
                      class="notification-count-badge absolute end-1.5 top-1.5"
                    >
                      {formatUnreadCount(unread())}
                    </span>
                  ) : null}
                  <span class="sr-only">{item.label}</span>
                </button>
              );
            }}
          </For>
          <button
            aria-current={(props.activeItem ?? "home") === "profile" ? "page" : undefined}
            aria-label={props.labels?.profileAriaLabel ?? profile()}
            class={cn(
              "mx-auto inline-flex size-12 items-center justify-center rounded-full transition-colors",
              (props.activeItem ?? "home") === "profile"
                ? "text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={() => handleTap(props.onProfileClick)}
            type="button"
          >
            <Avatar
              class="size-9 bg-card text-base"
              fallback={props.avatarFallback ?? "Pirate User"}
              fallbackSeed={props.userAvatarSeed ?? undefined}
              size="sm"
              src={props.userAvatarSrc ?? undefined}
            />
            <span class="sr-only">{profile()}</span>
          </button>
        </div>
      </nav>
    </Show>
  );
}
