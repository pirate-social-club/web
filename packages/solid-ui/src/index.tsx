import { Portal, type JSX } from "@solidjs/web";
import {
  createContext,
  createSignal,
  omit,
  Show,
  useContext,
  type Accessor,
  type ParentProps,
} from "solid-js";

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: JSX.Element;
  trailingIcon?: JSX.Element;
  /** Accepted during the bootstrap contract; stubs render a native button. */
  as?: unknown;
}

export function buttonVariants(options: { variant?: ButtonVariant; size?: ButtonSize } = {}): string {
  const variant = options.variant ?? "default";
  const size = options.size ?? "default";
  return [
    "inline-flex items-center justify-center gap-2 rounded-full text-base font-semibold",
    variant === "default" ? "bg-primary text-primary-foreground" : `button-${variant}`,
    size === "sm" ? "h-9 px-4" : size === "lg" ? "h-12 px-6" : size === "icon" ? "size-11" : "h-11 px-5",
  ].join(" ");
}

export function Button(props: ParentProps<ButtonProps>): JSX.Element {
  const local = props;
  const rest = omit(props, "variant", "size", "loading", "leadingIcon", "trailingIcon", "children", "class", "disabled", "type", "as");
  return (
    <button
      {...rest}
      class={`${buttonVariants(local)}${local.class ? ` ${local.class}` : ""}`}
      disabled={local.disabled || local.loading}
      type={local.type ?? "button"}
      aria-busy={local.loading ? "true" : rest["aria-busy"]}
    >
      {local.loading ? "Loading…" : local.leadingIcon}
      {local.children}
      {local.loading ? undefined : local.trailingIcon}
    </button>
  );
}

interface DialogContextValue {
  open: Accessor<boolean>;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue>();

function useDialogContext(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) throw new Error("Dialog primitives must be nested inside Dialog");
  return context;
}

export function Dialog(props: ParentProps<{ open?: boolean; onOpenChange?: (open: boolean) => void }>): JSX.Element {
  const [internalOpen, setInternalOpen] = createSignal(props.open ?? false);
  const setOpen = (open: boolean) => {
    setInternalOpen(open);
    props.onOpenChange?.(open);
  };
  const value: DialogContextValue = {
    open: () => props.open ?? internalOpen(),
    setOpen,
  };
  return <DialogContext value={value}>{props.children}</DialogContext>;
}

export function DialogTrigger(props: ParentProps<JSX.ButtonHTMLAttributes<HTMLButtonElement> & { as?: unknown }>): JSX.Element {
  const context = useDialogContext();
  const local = props;
  const rest = omit(props, "children", "as", "onClick");
  return <button {...rest} onClick={event => { if (typeof local.onClick === "function") local.onClick(event); context.setOpen(true); }}>{local.children}</button>;
}

export function DialogContent(props: ParentProps<JSX.HTMLAttributes<HTMLDivElement> & { hideCloseButton?: boolean }>): JSX.Element {
  const context = useDialogContext();
  return (
    <Show when={context.open()}>
      <Portal>
        <div role="presentation" class="dialog-overlay" onClick={() => context.setOpen(false)}>
          <div {...props} role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
            {props.children}
            {!props.hideCloseButton && <button type="button" aria-label="Close" onClick={() => context.setOpen(false)}>×</button>}
          </div>
        </div>
      </Portal>
    </Show>
  );
}

export function DialogHeader(props: ParentProps<JSX.HTMLAttributes<HTMLElement>>): JSX.Element {
  return <header {...props}>{props.children}</header>;
}

export function DialogTitle(props: ParentProps<JSX.HTMLAttributes<HTMLHeadingElement>>): JSX.Element {
  return <h2 {...props}>{props.children}</h2>;
}

export function DialogDescription(props: ParentProps<JSX.HTMLAttributes<HTMLParagraphElement>>): JSX.Element {
  return <p {...props}>{props.children}</p>;
}

export interface TextFieldProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
}

interface TextFieldContextValue {
  value: () => string;
  onChange?: (value: string) => void;
}

const TextFieldContext = createContext<TextFieldContextValue>();

export function TextField(props: ParentProps<TextFieldProps>): JSX.Element {
  const local = props;
  const rest = omit(props, "children", "value", "onChange");
  const value = () => local.value ?? "";
  return (
    <TextFieldContext value={{ value, onChange: local.onChange }}>
      <div {...rest}>{local.children}</div>
    </TextFieldContext>
  );
}

export function TextFieldLabel(props: ParentProps<JSX.LabelHTMLAttributes<HTMLLabelElement>>): JSX.Element {
  return <label {...props}>{props.children}</label>;
}

export interface TextFieldInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  variant?: string;
  size?: string;
}

export function TextFieldInput(props: TextFieldInputProps): JSX.Element {
  const context = useContext(TextFieldContext);
  const local = props;
  const rest = omit(props, "variant", "size", "value", "onInput");
  return (
    <input
      {...rest}
      value={local.value ?? context?.value()}
      onInput={event => {
        if (typeof local.onInput === "function") local.onInput(event);
        context?.onChange?.(event.currentTarget.value);
      }}
    />
  );
}

export function TextFieldDescription(props: ParentProps<JSX.HTMLAttributes<HTMLParagraphElement>>): JSX.Element {
  return <p {...props}>{props.children}</p>;
}

export { useDialogContext };
