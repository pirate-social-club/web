import type { JSX } from "@solidjs/web";
import { createEffect, createSignal, onCleanup } from "solid-js";

import { AppHeader, Type, cn } from "../../../design-system";

export interface MobileThreadScreenProps {
  children: JSX.Element;
  class?: string;
  stabilizeForKeyboard?: boolean;
  title: string;
  trailingAction?: JSX.Element;
  onBackClick?: () => void;
}

function createVisualViewportTopOffset(enabled: () => boolean) {
  const [offset, setOffset] = createSignal(0);

  createEffect(() => enabled(), (isEnabled) => {
    if (!isEnabled || typeof window === "undefined" || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const updateOffset = () => setOffset(Math.max(0, viewport.offsetTop));
    updateOffset();
    viewport.addEventListener("resize", updateOffset);
    viewport.addEventListener("scroll", updateOffset, { passive: true });
    onCleanup(() => {
      viewport.removeEventListener("resize", updateOffset);
      viewport.removeEventListener("scroll", updateOffset);
    });
  });

  return offset;
}

export function MobileThreadScreen(props: MobileThreadScreenProps) {
  const viewportTopOffset = createVisualViewportTopOffset(() => props.stabilizeForKeyboard ?? false);

  return (
    <div
      class={cn(
        "min-h-dvh bg-background text-foreground",
        props.stabilizeForKeyboard && "overflow-hidden",
        props.class,
      )}
      style={viewportTopOffset() > 0 ? { transform: `translateY(${viewportTopOffset()}px)` } : undefined}
    >
      <AppHeader
        forceMobile
        hideBrand
        mobileCenterContent={<Type as="div" variant="h4" class="truncate">{props.title}</Type>}
        mobileTrailingContent={props.trailingAction}
        onBackClick={props.onBackClick}
        showCreateAction={false}
        showNotificationsAction={false}
        showProfileAction={false}
        showWalletAction={false}
      />
      <main class="flex min-h-dvh w-full flex-col px-4 pb-6 pt-[calc(env(safe-area-inset-top)+5rem)]">
        {props.children}
      </main>
    </div>
  );
}
