/** @jsxImportSource @solidjs/web */

import { Show } from "solid-js";

import {
  Button,
  FormNote,
  IconMusicNote,
  IconVideoCamera,
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  Type,
} from "../../../design-system";
import { createUiLocale } from "../../../lib/ui-locale";
import {
  formatSavingsPercent,
  purchaseButtonLabel,
  selfVerificationLabel,
  stateDefaults,
} from "./song-purchase-modal-model";
import type { SongPurchaseModalProps } from "./song-purchase-modal.types";

function SummaryRow(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between gap-4 py-3">
      <Type as="div" class="min-w-0 text-muted-foreground" variant="body">{props.label}</Type>
      <Type as="div" class="min-w-0 truncate text-end" variant="body-strong">{props.value}</Type>
    </div>
  );
}

export function SongPurchaseModal(props: SongPurchaseModalProps) {
  const { dir } = createUiLocale();
  const defaults = () => stateDefaults(props.state);
  const assetLabel = () => props.assetLabel ?? "song";
  const displayTitle = () => props.assetTitle ?? props.songTitle;
  const confirmedDiscountPercent = () => props.confirmedDiscountPercent ?? defaults().confirmedDiscountPercent;
  const processing = () => props.processing ?? defaults().processing;
  const error = () => props.error ?? defaults().error;
  const forceMobile = () => props.forceMobile ?? defaults().forceMobile;
  const vinylReleaseAvailable = () => props.vinylReleaseAvailable ?? defaults().vinylReleaseAvailable;
  const savingsPercent = () => props.selfVerificationSavingsPercent ?? defaults().selfVerificationSavingsPercent;
  const hasConfirmedDiscount = () => typeof confirmedDiscountPercent() === "number" && confirmedDiscountPercent()! > 0;
  const hasSelfVerificationNudge = () => !hasConfirmedDiscount() && typeof savingsPercent() === "number" && savingsPercent()! > 0;
  const savingsLabel = () => hasSelfVerificationNudge() ? selfVerificationLabel(savingsPercent()) : null;

  return (
    <Modal forceMobile={forceMobile()} onOpenChange={props.onOpenChange} open={props.open}>
      <ModalContent
        class="flex max-h-[90vh] flex-col overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:max-w-2xl sm:px-8 sm:pb-8 sm:pt-8"
        mobileSide="bottom"
      >
        <div class="contents" dir={dir()}>
          <ModalHeader class="space-y-5 pe-10 text-start">
            <div class="flex items-center gap-4">
              <span aria-hidden="true" class="grid size-16 shrink-0 place-items-center rounded-full border border-border-soft bg-muted/45 text-foreground">
                <Show when={assetLabel() === "video"} fallback={<IconMusicNote class="size-8" />}>
                  <IconVideoCamera class="size-8" />
                </Show>
              </span>
              <ModalTitle class="min-w-0" leading="tight" variant="h1">Unlock {assetLabel()}</ModalTitle>
            </div>
            <ModalDescription class="w-full text-foreground" leading="roomy" variant="body">Buy full access to {displayTitle()}.</ModalDescription>
          </ModalHeader>

          <div class="mt-8 space-y-6">
            <div class="divide-y divide-border-soft border-y border-border-soft">
              <SummaryRow label="Price" value={props.priceLabel} />
              <Show when={hasConfirmedDiscount()}>
                <SummaryRow label="Self.xyz discount" value={`${formatSavingsPercent(confirmedDiscountPercent() ?? 0)}% off`} />
              </Show>
              <SummaryRow label="Pay with" value={props.fundingAssetLabel} />
            </div>

            <Show when={vinylReleaseAvailable()}>
              <FormNote>Vinyl available after unlock. Sold separately on ElasticStage.</FormNote>
            </Show>

            <Show when={savingsLabel()}>
              <div class="flex flex-col gap-3 rounded-lg border border-border-soft bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <Type as="p" class="min-w-0" variant="body-strong">{savingsLabel()}</Type>
                <Show when={props.onSelfVerificationClick}>
                  <Button class="w-full sm:w-auto" onClick={() => props.onSelfVerificationClick?.()} size="sm" variant="outline">Verify</Button>
                </Show>
              </div>
            </Show>

            <Show when={error()}>
              <div aria-live="assertive" role="alert">
                <FormNote tone="warning">{error()}</FormNote>
              </div>
            </Show>

            <Button
              aria-busy={processing() ? "true" : undefined}
              class="h-14 w-full"
              loading={processing()}
              onClick={() => props.onConfirm?.()}
            >
              {purchaseButtonLabel(props.priceLabel, processing())}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
