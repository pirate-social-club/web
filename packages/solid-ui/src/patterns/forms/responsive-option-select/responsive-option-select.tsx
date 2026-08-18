import {
  Select as KSelect,
  type SelectRootItemComponentProps,
} from "@kobalte/core/select";
import type { JSX } from "@solidjs/web";
import { createSignal, For, Show } from "solid-js";

import { Button } from "@/components/actions/button/button";
import { pillButtonVariants } from "@/components/actions/pill-button/pill-button";
import { Type } from "@/components/data-display/type/type";
import { IconCaretDown, IconCheck } from "@/components/media/icons";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/overlays/sheet/sheet";
import { cn } from "@/lib/cn";

export interface ResponsiveOptionSelectOption {
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
  icon?: JSX.Element;
  label: string;
  value: string;
}

export interface ResponsiveOptionSelectProps {
  ariaLabel: string;
  class?: string;
  drawerTitle: string;
  mobileTrigger?: JSX.Element;
  onValueChange?: (value: string) => void;
  options: readonly ResponsiveOptionSelectOption[];
  placeholder?: string;
  size?: "default" | "lg";
  triggerContent?: JSX.Element;
  triggerClass?: string;
  value?: string;
}

function OptionDetail(props: { option: ResponsiveOptionSelectOption }) {
  return (
    <span class="flex min-w-0 items-center gap-3 text-start">
      {props.option.icon ? <span class="shrink-0">{props.option.icon}</span> : null}
      <span class="min-w-0 space-y-0.5">
        <span class="block truncate">{props.option.label}</span>
        {props.option.description ? (
          <Type as="span" variant="caption" class="block whitespace-normal">
            {props.option.description}
          </Type>
        ) : null}
        {props.option.disabled && props.option.disabledReason ? (
          <Type as="span" variant="caption" class="block whitespace-normal text-warning">
            {props.option.disabledReason}
          </Type>
        ) : null}
      </span>
    </span>
  );
}

function RichSelectItem(props: SelectRootItemComponentProps<ResponsiveOptionSelectOption>) {
  const option = () => props.item.rawValue;

  return (
    <KSelect.Item
      item={props.item}
      class={cn(
        "relative flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-base outline-none transition-colors text-popover-foreground data-highlighted:bg-muted data-disabled:pointer-events-none data-disabled:opacity-50",
        option().description && "items-start py-3",
      )}
    >
      <KSelect.ItemLabel class="min-w-0">
        <OptionDetail option={option()} />
      </KSelect.ItemLabel>
      <KSelect.ItemIndicator class="shrink-0 text-primary">
        <IconCheck class="size-5" />
      </KSelect.ItemIndicator>
    </KSelect.Item>
  );
}

/**
 * Responsive option picker: a bottom sheet of full-width option buttons on
 * small viewports and a pill-styled select popup on md and up. Fully
 * data-driven — options carry label, description, icon, and disabled reason;
 * selection is reported through onValueChange. The host controls the value.
 *
 * Deliberate reduction from the React version: the Kobalte 2.0.0-alpha.0
 * Select exposes no popup placement control, so the React `selectAlign` prop
 * is not ported; the popup anchors with Kobalte defaults.
 */
export function ResponsiveOptionSelect(props: ResponsiveOptionSelectProps) {
  const [drawerOpen, setDrawerOpen] = createSignal(false);

  const activeOption = () =>
    props.options.find((option) => option.value === props.value);
  const activeLabel = () =>
    activeOption()?.label ?? props.placeholder ?? props.value ?? "";
  const triggerSizeClass = () => (props.size === "lg" ? "h-12" : "h-11");

  const handleChange = (nextValue: string) => {
    props.onValueChange?.(nextValue);
    setDrawerOpen(false);
  };

  const selectedOption = () =>
    props.value == null ? null : (activeOption() ?? null);

  return (
    <Show when={props.value && props.options.length > 0}>
      <div class={cn("inline-flex", props.class)}>
        <div class="w-full md:hidden">
          <Sheet open={drawerOpen()} onOpenChange={setDrawerOpen}>
            <SheetTrigger
              aria-label={props.ariaLabel}
              class={
                props.mobileTrigger
                  ? undefined
                  : cn(
                      pillButtonVariants({ tone: "default" }),
                      triggerSizeClass(),
                      "max-w-48 cursor-pointer gap-1.5 px-4",
                      props.triggerClass,
                    )
              }
            >
              {props.mobileTrigger ?? (
                <>
                  {props.triggerContent ?? <span class="truncate">{activeLabel()}</span>}
                  <IconCaretDown class="size-4 shrink-0" />
                </>
              )}
            </SheetTrigger>
            <SheetContent
              class="max-h-[75dvh] rounded-t-[var(--radius-3xl)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4"
              side="bottom"
            >
              <div class="mx-auto mb-4 h-1 w-12 rounded-full bg-muted" aria-hidden="true" />
              <SheetHeader class="pe-12 text-start">
                <SheetTitle>{props.drawerTitle}</SheetTitle>
              </SheetHeader>
              <div class="mt-5 grid gap-3">
                <For each={props.options}>
                  {(option) => (
                    <Button
                      class="h-auto min-h-14 w-full justify-between px-4 py-3"
                      disabled={option.disabled}
                      onClick={() => handleChange(option.value)}
                      trailingIcon={
                        option.value === props.value ? (
                          <IconCheck class="size-5 shrink-0" />
                        ) : null
                      }
                      variant={option.value === props.value ? "default" : "secondary"}
                    >
                      <OptionDetail option={option} />
                    </Button>
                  )}
                </For>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div class="hidden md:block">
          <KSelect<ResponsiveOptionSelectOption>
            options={props.options as ResponsiveOptionSelectOption[]}
            optionValue={(option) => option.value}
            optionTextValue={(option) => option.label}
            optionDisabled={(option) => Boolean(option.disabled)}
            value={selectedOption()}
            onChange={(option) => {
              if (option) props.onValueChange?.(option.value);
            }}
            placeholder={props.placeholder}
            multiple={false}
            itemComponent={RichSelectItem}
          >
            <KSelect.Trigger
              aria-label={props.ariaLabel}
              class={cn(
                pillButtonVariants({ tone: "default" }),
                triggerSizeClass(),
                "w-auto min-w-32 cursor-pointer justify-between gap-2 bg-card py-0 pe-3 ps-4 shadow-none",
                props.triggerClass,
              )}
            >
              {props.triggerContent ?? (
                <KSelect.Value<ResponsiveOptionSelectOption> class="truncate">
                  {(state) => state.selectedOption()?.label ?? props.placeholder}
                </KSelect.Value>
              )}
              <KSelect.Icon class="ms-2 shrink-0 text-muted-foreground">
                <IconCaretDown class="size-4" />
              </KSelect.Icon>
            </KSelect.Trigger>
            <KSelect.Portal>
              <KSelect.Content class="z-50 min-w-48 overflow-hidden rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-xl">
                <KSelect.Listbox />
              </KSelect.Content>
            </KSelect.Portal>
          </KSelect>
        </div>
      </div>
    </Show>
  );
}
