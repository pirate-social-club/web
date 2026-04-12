"use client";

import * as React from "react";
import { Check, X } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

type ItemRenderer<T> = (item: T) => React.ReactNode;

type ComboboxProps<T, Multiple extends boolean | undefined = false> = {
  autoHighlight?: boolean;
  children: React.ReactNode;
  className?: string;
  defaultValue?: Multiple extends true ? T[] : T | undefined;
  itemToStringLabel?: (item: T) => string;
  itemToStringValue?: (item: T) => string;
  items: T[];
  multiple?: Multiple;
  onValueChange?: (value: Multiple extends true ? T[] : T | undefined) => void;
  value?: Multiple extends true ? T[] : T | undefined;
};

type ComboboxContextValue<T> = {
  autoHighlight: boolean;
  close: () => void;
  commitSelection: (nextSelected: T[]) => void;
  filteredItems: T[];
  focusInput: () => void;
  getItemLabel: (item: T) => string;
  getItemValue: (item: T) => string;
  highlightedValue: string | null;
  isOpen: boolean;
  items: T[];
  multiple: boolean;
  open: () => void;
  query: string;
  removeItem: (item: T) => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
  selectedItems: T[];
  selectItem: (item: T) => void;
  setHighlightedValue: (value: string | null) => void;
  setInputElement: (element: HTMLInputElement | null) => void;
  setQuery: (value: string) => void;
};

const ComboboxContext = React.createContext<ComboboxContextValue<unknown> | null>(null);

function useComboboxContext<T>() {
  const context = React.useContext(ComboboxContext);
  if (!context) {
    throw new Error("Combobox components must be used within <Combobox>.");
  }

  return context as ComboboxContextValue<T>;
}

function composeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (!ref) {
        continue;
      }

      if (typeof ref === "function") {
        ref(node);
        continue;
      }

      (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function toSelectedItems<T>(
  multiple: boolean,
  controlledValue: T[] | T | undefined,
  uncontrolledValue: T[] | T | undefined,
) {
  const source = controlledValue !== undefined ? controlledValue : uncontrolledValue;

  if (multiple) {
    return Array.isArray(source) ? source : [];
  }

  return source === undefined ? [] : [source as T];
}

function Combobox<T, Multiple extends boolean | undefined = false>({
  autoHighlight = false,
  children,
  className,
  defaultValue,
  itemToStringLabel,
  itemToStringValue,
  items,
  multiple = false as Multiple,
  onValueChange,
  value,
}: ComboboxProps<T, Multiple>) {
  const isMultiple = multiple === true;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlightedValue, setHighlightedValue] = React.useState<string | null>(null);
  const [uncontrolledValue, setUncontrolledValue] = React.useState<T[] | T | undefined>(defaultValue);

  const getItemLabel = React.useCallback(
    (item: T) => itemToStringLabel?.(item) ?? String(item),
    [itemToStringLabel],
  );
  const getItemValue = React.useCallback(
    (item: T) => itemToStringValue?.(item) ?? getItemLabel(item),
    [getItemLabel, itemToStringValue],
  );

  const selectedItems = React.useMemo(
    () => toSelectedItems<T>(isMultiple, value, uncontrolledValue),
    [isMultiple, uncontrolledValue, value],
  );

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => getItemLabel(item).toLowerCase().includes(normalizedQuery));
  }, [getItemLabel, items, query]);

  const commitSelection = React.useCallback((nextSelected: T[]) => {
    if (value === undefined) {
      setUncontrolledValue((isMultiple ? nextSelected : nextSelected[0]) as T[] | T | undefined);
    }

    if (!onValueChange) {
      return;
    }

    if (isMultiple) {
      (onValueChange as (value: T[]) => void)(nextSelected);
      return;
    }

    (onValueChange as (value: T | undefined) => void)(nextSelected[0]);
  }, [isMultiple, onValueChange, value]);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);

  const focusInput = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const selectItem = React.useCallback((item: T) => {
    const itemValue = getItemValue(item);
    const isSelected = selectedItems.some((selectedItem) => getItemValue(selectedItem) === itemValue);

    if (isMultiple) {
      const nextSelected = isSelected
        ? selectedItems.filter((selectedItem) => getItemValue(selectedItem) !== itemValue)
        : [...selectedItems, item];

      commitSelection(nextSelected);
      setQuery("");
      setIsOpen(true);
      focusInput();
      return;
    }

    commitSelection(isSelected ? [] : [item]);
    setQuery(isSelected ? "" : getItemLabel(item));
    setIsOpen(false);
  }, [commitSelection, focusInput, getItemLabel, getItemValue, isMultiple, selectedItems]);

  const removeItem = React.useCallback((item: T) => {
    const itemValue = getItemValue(item);
    const nextSelected = selectedItems.filter((selectedItem) => getItemValue(selectedItem) !== itemValue);
    commitSelection(nextSelected);

    if (!isMultiple) {
      setQuery("");
    }
  }, [commitSelection, getItemValue, isMultiple, selectedItems]);

  React.useEffect(() => {
    if (isMultiple || isOpen) {
      return;
    }

    setQuery(selectedItems[0] ? getItemLabel(selectedItems[0]) : "");
  }, [getItemLabel, isMultiple, isOpen, selectedItems]);

  React.useEffect(() => {
    if (!isOpen) {
      setHighlightedValue(null);
      return;
    }

    if (!autoHighlight || filteredItems.length === 0) {
      return;
    }

    const nextHighlighted = filteredItems[0];
    setHighlightedValue(nextHighlighted ? getItemValue(nextHighlighted) : null);
  }, [autoHighlight, filteredItems, getItemValue, isOpen]);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const contextValue = React.useMemo<ComboboxContextValue<T>>(() => ({
    autoHighlight,
    close,
    commitSelection,
    filteredItems,
    focusInput,
    getItemLabel,
    getItemValue,
    highlightedValue,
    isOpen,
    items,
    multiple: isMultiple,
    open,
    query,
    removeItem,
    rootRef,
    selectedItems,
    selectItem,
    setHighlightedValue,
    setInputElement: (element) => {
      inputRef.current = element;
    },
    setQuery,
  }), [
    autoHighlight,
    close,
    commitSelection,
    filteredItems,
    focusInput,
    getItemLabel,
    getItemValue,
    highlightedValue,
    isMultiple,
    isOpen,
    items,
    open,
    query,
    removeItem,
    selectedItems,
    selectItem,
  ]);

  return (
    <ComboboxContext.Provider value={contextValue as ComboboxContextValue<unknown>}>
      <div className={cn("relative", className)} ref={rootRef}>
        {children}
      </div>
    </ComboboxContext.Provider>
  );
}

function useComboboxInput<T>() {
  const context = useComboboxContext<T>();

  const moveHighlight = React.useCallback((direction: 1 | -1) => {
    if (context.filteredItems.length === 0) {
      return;
    }

    const currentIndex = context.highlightedValue
      ? context.filteredItems.findIndex((item) => context.getItemValue(item) === context.highlightedValue)
      : -1;
    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + direction + context.filteredItems.length) % context.filteredItems.length;
    const nextItem = context.filteredItems[nextIndex];
    context.setHighlightedValue(nextItem ? context.getItemValue(nextItem) : null);
  }, [context]);

  return {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      context.setQuery(event.target.value);
      context.open();
    },
    onFocus: () => {
      context.open();
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        context.open();
        moveHighlight(1);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        context.open();
        moveHighlight(-1);
        return;
      }

      if (event.key === "Enter") {
        if (!context.isOpen) {
          return;
        }

        const highlightedItem = context.highlightedValue
          ? context.filteredItems.find((item) => context.getItemValue(item) === context.highlightedValue)
          : context.filteredItems[0];
        if (!highlightedItem) {
          return;
        }

        event.preventDefault();
        context.selectItem(highlightedItem);
        return;
      }

      if (event.key === "Escape") {
        context.close();
        return;
      }

      if (
        event.key === "Backspace"
        && context.multiple
        && context.query.length === 0
        && context.selectedItems.length > 0
      ) {
        const lastItem = context.selectedItems[context.selectedItems.length - 1];
        if (lastItem) {
          context.removeItem(lastItem);
        }
      }
    },
    value: context.query,
  };
}

const ComboboxInput = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  ({ className, onChange, onFocus, onKeyDown, ...props }, ref) => {
    const context = useComboboxContext<unknown>();
    const inputProps = useComboboxInput<unknown>();

    return (
      <input
        {...props}
        className={cn(
          "flex h-11 w-full rounded-full border border-input bg-background px-4 py-2 text-base shadow-sm transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        onChange={(event) => {
          inputProps.onChange(event);
          onChange?.(event);
        }}
        onFocus={(event) => {
          inputProps.onFocus();
          onFocus?.(event);
        }}
        onKeyDown={(event) => {
          inputProps.onKeyDown(event);
          onKeyDown?.(event);
        }}
        ref={composeRefs(ref, context.setInputElement)}
        role="combobox"
        value={inputProps.value}
      />
    );
  },
);
ComboboxInput.displayName = "ComboboxInput";

const ComboboxChips = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, onClick, ...props }, ref) => {
    const context = useComboboxContext<unknown>();

    return (
      <div
        {...props}
        className={cn(
          "flex min-h-11 w-full flex-wrap items-center gap-2 rounded-[28px] border border-input bg-background px-3 py-2 shadow-sm transition-[color,box-shadow,border-color] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          className,
        )}
        onClick={(event) => {
          context.focusInput();
          onClick?.(event);
        }}
        ref={ref}
      />
    );
  },
);
ComboboxChips.displayName = "ComboboxChips";

const ComboboxChipsInput = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  ({ className, onChange, onFocus, onKeyDown, ...props }, ref) => {
    const context = useComboboxContext<unknown>();
    const inputProps = useComboboxInput<unknown>();

    return (
      <input
        {...props}
        className={cn(
          "min-w-[8rem] flex-1 bg-transparent py-1 text-base outline-none placeholder:text-muted-foreground",
          className,
        )}
        onChange={(event) => {
          inputProps.onChange(event);
          onChange?.(event);
        }}
        onFocus={(event) => {
          inputProps.onFocus();
          onFocus?.(event);
        }}
        onKeyDown={(event) => {
          inputProps.onKeyDown(event);
          onKeyDown?.(event);
        }}
        ref={composeRefs(ref, context.setInputElement)}
        value={inputProps.value}
      />
    );
  },
);
ComboboxChipsInput.displayName = "ComboboxChipsInput";

const ComboboxChip = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & { value: unknown }
>(({ className, children, value, ...props }, ref) => {
  const context = useComboboxContext<unknown>();

  return (
    <div
      {...props}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border-soft bg-muted px-3 py-1.5 text-base font-medium text-foreground",
        className,
      )}
      ref={ref}
    >
      <span className="truncate">{children}</span>
      <button
        aria-label="Remove item"
        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          context.removeItem(value);
        }}
        type="button"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
});
ComboboxChip.displayName = "ComboboxChip";

function ComboboxValue({
  children,
}: {
  children: React.ReactNode | ((values: unknown[]) => React.ReactNode);
}) {
  const context = useComboboxContext<unknown>();

  if (typeof children === "function") {
    return <>{children(context.selectedItems)}</>;
  }

  return <>{children}</>;
}

const ComboboxContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    align?: "start" | "center" | "end";
    collisionPadding?: number;
    sideOffset?: number;
  }
>(({ align, className, collisionPadding, sideOffset, ...props }, ref) => {
  const context = useComboboxContext<unknown>();
  void align;
  void collisionPadding;
  void sideOffset;

  if (!context.isOpen) {
    return null;
  }

  return (
    <div
      {...props}
      className={cn(
        "absolute left-0 right-0 top-[calc(100%+0.375rem)] z-50 max-h-96 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover text-popover-foreground shadow-md outline-none",
        className,
      )}
      ref={ref}
    />
  );
});
ComboboxContent.displayName = "ComboboxContent";

const ComboboxEmpty = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => {
    const context = useComboboxContext<unknown>();

    if (context.filteredItems.length > 0) {
      return null;
    }

    return (
      <div
        {...props}
        className={cn("px-4 py-3 text-base text-muted-foreground", className)}
        ref={ref}
      />
    );
  },
);
ComboboxEmpty.displayName = "ComboboxEmpty";

const ComboboxList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    children?: React.ReactNode;
    renderItem?: ItemRenderer<unknown>;
  }
>(({ children, className, renderItem, ...props }, ref) => {
  const context = useComboboxContext<unknown>();

  return (
    <div
      {...props}
      className={cn("max-h-80 overflow-y-auto py-1", className)}
      ref={ref}
    >
      {renderItem
        ? context.filteredItems.map((item) => renderItem(item))
        : children}
    </div>
  );
});
ComboboxList.displayName = "ComboboxList";

const ComboboxItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & { value: unknown }
>(({ children, className, onClick, onMouseEnter, value, ...props }, ref) => {
  const context = useComboboxContext<unknown>();
  const itemValue = context.getItemValue(value);
  const isSelected = context.selectedItems.some((item) => context.getItemValue(item) === itemValue);
  const isHighlighted = context.highlightedValue === itemValue;

  return (
    <div
      {...props}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-start gap-3 px-4 py-3 text-base text-popover-foreground outline-none transition-colors data-[highlighted=true]:bg-muted data-[selected=true]:text-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        className,
      )}
      data-highlighted={isHighlighted ? "true" : undefined}
      data-selected={isSelected ? "true" : "false"}
      onClick={(event) => {
        context.selectItem(value);
        onClick?.(event);
      }}
      onMouseEnter={(event) => {
        context.setHighlightedValue(itemValue);
        onMouseEnter?.(event);
      }}
      ref={ref}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <div
        className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full border border-primary bg-primary/10 text-primary data-[selected=false]:border-border-soft data-[selected=false]:bg-transparent data-[selected=false]:text-transparent"
        data-selected={isSelected ? "true" : "false"}
      >
        <Check className="size-3.5" weight="bold" />
      </div>
    </div>
  );
});
ComboboxItem.displayName = "ComboboxItem";

const ComboboxGroup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div {...props} className={cn("py-1", className)} ref={ref} />
  ),
);
ComboboxGroup.displayName = "ComboboxGroup";

const ComboboxLabel = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div
      {...props}
      className={cn("px-4 py-2 text-base font-semibold text-foreground", className)}
      ref={ref}
    />
  ),
);
ComboboxLabel.displayName = "ComboboxLabel";

const ComboboxCollection = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

const ComboboxSeparator = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div {...props} className={cn("-mx-1 my-1 h-px bg-border", className)} ref={ref} />
  ),
);
ComboboxSeparator.displayName = "ComboboxSeparator";

const ComboboxTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<"button">>(
  ({ onClick, type = "button", ...props }, ref) => {
    const context = useComboboxContext<unknown>();

    return (
      <button
        {...props}
        onClick={(event) => {
          context.isOpen ? context.close() : context.open();
          onClick?.(event);
        }}
        ref={ref}
        type={type}
      />
    );
  },
);
ComboboxTrigger.displayName = "ComboboxTrigger";

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
};
