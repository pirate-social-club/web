/** @jsxImportSource @solidjs/web */

import { Show } from "solid-js";

import {
  Button,
  IconCheckCircle,
  IconWarningCircle,
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Switch,
  Type,
} from "../../../design-system";
import { cn } from "../../../design-system";
import {
  claimableWipLabel,
  DEFAULT_CLAIMABLE_WIP_WEI,
  formatWalletAddress,
  isRoyaltyClaimBusy,
  royaltyPrimaryAction,
} from "./royalty-claim-modal-model";
import type { RoyaltyClaimModalProps, RoyaltyClaimState } from "./royalty-claim-modal.types";

function claimStatusLabel(status: RoyaltyClaimState["status"]): string {
  switch (status) {
    case "preparing":
      return "Preparing claim";
    case "signing":
      return "Confirm in wallet";
    case "submitting":
      return "Submitting claim";
    case "success":
      return "Royalties claimed";
    case "error":
      return "Claim failed";
    default:
      return "Claim";
  }
}

export function RoyaltyClaimModal(props: RoyaltyClaimModalProps) {
  const claimState = () => props.claimState ?? { status: "ready" as const };
  const walletAddress = () => props.walletAddress ?? null;
  const totalClaimableWipWei = () => props.totalClaimableWipWei ?? DEFAULT_CLAIMABLE_WIP_WEI;
  const claimableCount = () => props.claimableCount ?? 3;
  const autoUnwrapIpTokens = () => props.autoUnwrapIpTokens ?? true;
  const busy = () => isRoyaltyClaimBusy(claimState().status);
  const hasClaimable = () => claimableCount() > 0 && totalClaimableWipWei() !== "0";
  const action = () => royaltyPrimaryAction(claimState(), walletAddress());

  return (
    <Modal forceMobile={props.forceMobile} onOpenChange={props.onOpenChange} open={props.open}>
      <ModalContent
        class="border-border bg-background p-6 sm:w-[min(100%-2rem,32rem)] sm:max-w-[32rem]"
        mobileSide="bottom"
      >
        <ModalHeader class="pe-10 text-start">
          <span class="mb-3 grid size-11 place-items-center text-warning">
            <svg aria-hidden="true" class="size-8" fill="none" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="11" stroke="currentColor" stroke-width="1.75" />
              <path d="M12.25 12.5h7.5M12.25 19.5h7.5M14 9.75v12.5M18 9.75v12.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
              <path d="M12.25 16h7.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.75" />
            </svg>
          </span>
          <ModalTitle>Claim royalties</ModalTitle>
          <ModalDescription class="text-muted-foreground">
            Claim royalties available from your Story IP assets.
          </ModalDescription>
        </ModalHeader>

        <div class="mt-5 space-y-3 rounded-lg border border-border-soft bg-muted/20 p-4">
          <div class="flex items-center justify-between gap-4">
            <Type as="span" class="text-muted-foreground" variant="body">Available</Type>
            <Type as="span" class="text-end" variant="body-strong">
              {claimableWipLabel(totalClaimableWipWei(), props.loading)}
            </Type>
          </div>
          <div class="flex items-center justify-between gap-4">
            <Type as="span" class="text-muted-foreground" variant="body">IP assets</Type>
            <Type as="span" class="text-end" variant="body-strong">
              {props.loading ? "..." : claimableCount().toLocaleString("en-US")}
            </Type>
          </div>
          <div class="flex items-center justify-between gap-4">
            <Type as="span" class="text-muted-foreground" variant="body">Destination</Type>
            <Type as="span" class="text-end" variant="body-strong">
              {formatWalletAddress(walletAddress())}
            </Type>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between gap-4 rounded-lg border border-border-soft px-4 py-3">
          <div class="min-w-0">
            <Type as="p" variant="body-strong">Receive as IP</Type>
            <Type as="p" class="text-muted-foreground" variant="body">Unwrap claimed WIP after claiming.</Type>
          </div>
          <Switch
            aria-label="Receive claimed royalties as IP"
            checked={autoUnwrapIpTokens()}
            disabled={busy()}
            onChange={(checked: boolean) => props.onAutoUnwrapIpTokensChange?.(checked)}
          />
        </div>

        <Show when={claimState().status === "error"}>
          <div aria-live="assertive" class="mt-4 flex gap-3 rounded-lg border border-border-soft bg-muted/20 p-3 text-warning" role="alert">
            <IconWarningCircle aria-hidden="true" class="mt-0.5 size-5 shrink-0" />
            <Type as="p" variant="body">{claimState().message ?? "User rejected the transaction request."}</Type>
          </div>
        </Show>

        <Show when={claimState().status === "success"}>
          <div aria-live="polite" class="mt-4 flex gap-3 rounded-lg border border-border-soft bg-muted/20 p-3 text-success" role="status">
            <IconCheckCircle aria-hidden="true" class="mt-0.5 size-5 shrink-0" />
            <Type as="p" variant="body">
              Royalties claimed{claimState().txHash ? `: ${claimState().txHash?.slice(0, 10)}...` : "."}
            </Type>
          </div>
        </Show>

        <ModalFooter class={cn("mt-6 gap-3", "sm:justify-end")}>
          <Button disabled={busy()} onClick={() => props.onOpenChange(false)} variant="secondary">Cancel</Button>
          <Button
            aria-busy={busy() ? "true" : undefined}
            disabled={props.loading || action().disabled || (Boolean(walletAddress()) && !hasClaimable())}
            loading={busy()}
            onClick={() => props.onClaim?.()}
          >
            {walletAddress() ? claimStatusLabel(claimState().status) : action().label}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
