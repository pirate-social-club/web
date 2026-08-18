/** @jsxImportSource @solidjs/web */

import { createEffect, createSignal, For, Show } from "solid-js";

import {
  Button,
  CopyField,
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ResponsiveOptionSelect,
  Type,
} from "../../design-system";
import { cn } from "../../design-system";
import { ChainIcon } from "./wallet-visuals";
import type { WalletHubChainId } from "./wallet-hub.types";
import {
  formatFiatTotal,
  getDefaultReceiveChainId,
  truncateReceiveAddress,
} from "./wallet-receive-sheet-model";
import type { WalletReceiveSheetProps } from "./wallet-receive-sheet.types";

function QrHintIcon() {
  return (
    <svg aria-hidden="true" class="mt-0.5 size-5 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 20 20">
      <path d="M3 3h5v5H3zM12 3h5v5h-5zM3 12h5v5H3zM13 13h1v1h-1zM16 12h1v3h-1zM12 16h3v1h-3z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5" />
    </svg>
  );
}

type QrCell = { x: number; y: number };

function qrCells(value: string): QrCell[] {
  const cells: QrCell[] = [];
  const reserved = new Set<string>();
  const finder = (originX: number, originY: number) => {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        reserved.add(`${originX + x}:${originY + y}`);
        if (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)) {
          cells.push({ x: originX + x, y: originY + y });
        }
      }
    }
  };
  finder(0, 0);
  finder(14, 0);
  finder(0, 14);

  let state = 2166136261;
  for (const character of value) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  for (let y = 0; y < 21; y += 1) {
    for (let x = 0; x < 21; x += 1) {
      if (reserved.has(`${x}:${y}`)) continue;
      state = Math.imul(state ^ (x * 31 + y * 17), 16777619);
      if ((state >>> 0) % 3 === 0) cells.push({ x, y });
    }
  }
  return cells;
}

function WalletQrCode(props: { value: string }) {
  const cells = () => qrCells(props.value);
  return (
    <div
      aria-label={`QR code for ${props.value}`}
      class="mx-auto grid size-52 place-items-center rounded-xl border border-border-soft bg-white p-4"
      role="img"
    >
      <svg aria-hidden="true" class="size-full" shape-rendering="crispEdges" viewBox="0 0 21 21">
        <rect fill="#ffffff" height="21" width="21" />
        <For each={cells()}>{(cell) => <rect fill="#000000" height="1" width="1" x={cell.x} y={cell.y} />}</For>
      </svg>
    </div>
  );
}

export function WalletReceiveSheet(props: WalletReceiveSheetProps) {
  const [selectedChainId, setSelectedChainId] = createSignal(
    getDefaultReceiveChainId(props.chainSections, props.defaultChainId),
  );

  createEffect(
    () => ({
      chainSections: props.chainSections,
      defaultChainId: props.defaultChainId,
      open: props.open,
    }),
    ({ chainSections, defaultChainId, open }) => {
      if (open) setSelectedChainId(getDefaultReceiveChainId(chainSections, defaultChainId));
    },
  );

  const selectedChain = () => props.chainSections.find((section) => section.chainId === selectedChainId()) ?? props.chainSections[0];
  const selectedAddress = () => selectedChain()?.walletAddress ?? props.walletAddress ?? null;
  const activeChainId = () => selectedChain()?.chainId ?? "ethereum";
  const activeChainTitle = () => selectedChain()?.title ?? "";
  const activeAddress = () => selectedAddress() ?? "";
  const options = () => props.chainSections.map((section) => ({
    description: formatFiatTotal(section),
    icon: <ChainIcon chainId={section.chainId} class="size-8" framed />,
    label: section.title,
    value: section.chainId,
  }));

  return (
    <Modal forceMobile={props.forceMobile} onOpenChange={props.onOpenChange} open={props.open}>
      <ModalContent
        class={cn(
          "flex max-h-[88dvh] w-full flex-col overflow-y-auto rounded-t-[var(--radius-3xl)] border-x-0 border-b-0 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4",
          !props.forceMobile && "md:w-[min(100%-2rem,34rem)] md:max-w-[34rem] md:px-7 md:pb-7 md:pt-7",
        )}
        mobileSide="bottom"
      >
        <div aria-hidden="true" class={cn("mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/60", !props.forceMobile && "md:hidden")} />
        <ModalHeader class="pe-10 text-start">
          <ModalTitle>Receive</ModalTitle>
          <ModalDescription class="text-muted-foreground">Choose the network before sharing your wallet address.</ModalDescription>
        </ModalHeader>

        <Show
          when={Boolean(selectedChain() && selectedAddress())}
          fallback={
            <div class="mt-6 rounded-lg border border-border-soft bg-muted/20 p-5 text-center">
              <Type as="p" variant="body-strong">No wallet connected</Type>
              <Type as="p" class="mt-1 text-muted-foreground" variant="body">Connect a wallet before receiving assets.</Type>
              <Button class="mt-5" onClick={() => props.onOpenChange(false)}>Close receive sheet</Button>
            </div>
          }
        >
          <div class="mt-6 space-y-5">
            <div class="flex items-center justify-between gap-4">
              <Type as="div" class="text-muted-foreground" variant="body">Network</Type>
              <ResponsiveOptionSelect
                ariaLabel="Receive network"
                drawerTitle="Receive network"
                onValueChange={(value) => setSelectedChainId(value as WalletHubChainId)}
                options={options()}
                triggerContent={
                  <span class="flex min-w-0 items-center gap-2">
                    <ChainIcon chainId={activeChainId()} class="size-5" framed={false} />
                    <span class="truncate">{activeChainTitle()}</span>
                  </span>
                }
                value={activeChainId()}
              />
            </div>

            <div class="rounded-lg border border-border-soft bg-muted/20 p-4">
              <div class="mb-4 flex items-center gap-3">
                <ChainIcon chainId={activeChainId()} />
                <div class="min-w-0">
                  <Type as="div" variant="body-strong">{activeChainTitle()}</Type>
                  <Type as="div" class="truncate text-muted-foreground" variant="caption">{truncateReceiveAddress(activeAddress())}</Type>
                </div>
              </div>
              <CopyField copyLabel="address" value={activeAddress()} />
            </div>

            <WalletQrCode value={`${activeChainId()}:${activeAddress()}`} />

            <div class="flex gap-3 rounded-lg border border-border-soft bg-muted/20 p-4">
              <QrHintIcon />
              <Type as="p" class="text-muted-foreground" variant="body">Only send assets on {activeChainTitle()} to this address.</Type>
            </div>
          </div>
        </Show>
      </ModalContent>
    </Modal>
  );
}
