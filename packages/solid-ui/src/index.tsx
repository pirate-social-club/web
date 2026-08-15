// Public catalog entry for @pirate/web-solid-ui.
//
// The frozen bootstrap surface (Button, Dialog family, TextField family,
// useDialogContext) is re-exported from the real catalog counterparts below.
// Breaking differences from the stub, recorded for consumers:
// - Stub ButtonProps/DialogTriggerProps accepted an `as` polymorphic prop;
//   the real Button and DialogTrigger deliberately dropped polymorphism.
//   Call sites passing `as` must render the real trigger directly.

export {
  Button,
  buttonVariants,
  type ButtonProps,
} from "./components/actions/button/button";
export {
  Chip,
  type ChipProps,
} from "./components/actions/chip/chip";
export {
  IconButton,
  type IconButtonProps,
} from "./components/actions/icon-button/icon-button";
export {
  PillButton,
  type PillButtonProps,
} from "./components/actions/pill-button/pill-button";

export {
  Avatar,
  type AvatarProps,
  type AvatarSize,
} from "./components/data-display/avatar/avatar";
export {
  BadgedCircle,
  type BadgedCircleProps,
} from "./components/data-display/badged-circle/badged-circle";
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/data-display/card/card";
export {
  FormattedText,
  type FormattedTextProps,
} from "./components/data-display/formatted-text/formatted-text";
export {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
  itemVariants,
  type ItemActionsProps,
  type ItemContentProps,
  type ItemDescriptionProps,
  type ItemGroupProps,
  type ItemMediaProps,
  type ItemProps,
  type ItemTitleProps,
} from "./components/data-display/item/item";
export {
  Separator,
  type SeparatorProps,
} from "./components/data-display/separator/separator";
export {
  Type,
  typeVariants,
  type TypeProps,
} from "./components/data-display/type/type";

export {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
  type AccordionContentProps,
  type AccordionHeaderProps,
  type AccordionItemProps,
  type AccordionTriggerProps,
} from "./components/disclosure/accordion/accordion";
export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type TabsContentProps,
} from "./components/disclosure/tabs/tabs";

export {
  Skeleton,
} from "./components/feedback/skeleton/skeleton";
export {
  Spinner,
  type SpinnerProps,
} from "./components/feedback/spinner/spinner";

export {
  AutoResizeTextarea,
  type AutoResizeTextareaProps,
} from "./components/forms/auto-resize-textarea/auto-resize-textarea";
export {
  Checkbox,
  CheckboxDescription,
  CheckboxErrorMessage,
  CheckboxLabel,
  type CheckboxProps,
} from "./components/forms/checkbox/checkbox";
export {
  Combobox,
  type ComboboxProps,
} from "./components/forms/combobox/combobox";
export {
  EditableNumberInput,
  type EditableNumberInputProps,
} from "./components/forms/editable-number-input/editable-number-input";
export {
  Input,
  inputVariants,
  type InputProps,
} from "./components/forms/input/input";
export {
  Label,
  type LabelProps,
} from "./components/forms/label/label";
export {
  PrefixInput,
  prefixInputVariants,
  type PrefixInputProps,
} from "./components/forms/prefix-input/prefix-input";
export {
  RadioGroup,
  RadioGroupDescription,
  RadioGroupErrorMessage,
  RadioGroupItem,
  RadioGroupLabel,
  type RadioGroupItemProps,
  type RadioGroupProps,
} from "./components/forms/radio-group/radio-group";
export {
  RadioIndicator,
  type RadioIndicatorProps,
} from "./components/forms/radio-indicator/radio-indicator";
export {
  Select,
  type SelectProps,
} from "./components/forms/select/select";
export {
  Switch,
  SwitchDescription,
  SwitchErrorMessage,
  SwitchLabel,
  type SwitchProps,
} from "./components/forms/switch/switch";
export {
  Textarea,
  textareaVariants,
  type TextareaProps,
} from "./components/forms/textarea/textarea";
export {
  TextField,
  TextFieldDescription,
  TextFieldErrorMessage,
  TextFieldInput,
  TextFieldLabel,
  type TextFieldInputProps,
} from "./components/forms/text-field/text-field";

export {
  MediaControlButton,
  type MediaControlButtonProps,
} from "./components/media/media-control-button/media-control-button";
export {
  Scrubber,
  type ScrubberProps,
} from "./components/media/scrubber/scrubber";
export {
  Waveform,
  type WaveformProps,
} from "./components/media/waveform/waveform";

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  type AlertDialogContentProps,
} from "./components/overlays/alert-dialog/alert-dialog";
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  useDialogContext,
  type DialogContentProps,
} from "./components/overlays/dialog/dialog";
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/overlays/dropdown-menu/dropdown-menu";
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetContentProps,
} from "./components/overlays/sheet/sheet";
export {
  Toaster,
  toast,
  type ShowToastOptions,
  type ToastType,
} from "./components/overlays/toast/toast";
export {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./components/overlays/tooltip/tooltip";

export {
  CommentPill,
  type CommentPillProps,
} from "./patterns/engagement/comment-pill/comment-pill";
export {
  CommunityAvatar,
  buildDefaultCommunityAvatarSrc,
  resolveCommunityAvatarSrc,
  type CommunityAvatarProps,
} from "./patterns/engagement/community-avatar/community-avatar";
export {
  MediaActions,
  MediaPost,
  type HapticKind,
  type MediaActionsProps,
  type MediaPostData,
  type MediaPostProps,
  type VideoPlayerProps,
} from "./patterns/engagement/vertical-feed";
export {
  VotePill,
  type VotePillProps,
} from "./patterns/engagement/vote-pill/vote-pill";

export {
  ActionBanner,
  type ActionBannerProps,
} from "./patterns/feedback/action-banner/action-banner";
export {
  IllustratedState,
  type IllustratedStateImage,
  type IllustratedStateProps,
} from "./patterns/feedback/illustrated-state/illustrated-state";

export {
  CheckboxCard,
  type CheckboxCardProps,
} from "./patterns/forms/checkbox-card/checkbox-card";
export {
  CopyField,
  type CopyFieldProps,
} from "./patterns/forms/copy-field/copy-field";
export {
  FormattedTextarea,
  type FormattedTextareaProps,
} from "./patterns/forms/formatted-textarea/formatted-textarea";
export {
  FormFieldLabel,
  FormNote,
  FormSectionHeading,
  type FormFieldLabelProps,
  type FormNoteProps,
  type FormSectionHeadingProps,
} from "./patterns/forms/form-layout/form-layout";
export {
  OptionCard,
  optionCardVariants,
  type OptionCardProps,
} from "./patterns/forms/option-card/option-card";

export {
  PirateBrandMark,
  type PirateBrandMarkProps,
} from "./patterns/identity/pirate-brand-mark/pirate-brand-mark";

export {
  CardShell,
  PageContainer,
  type PageContainerProps,
} from "./patterns/layout/layout-shell/layout-shell";

export {
  ActionMenu,
  type ActionMenuGroup,
  type ActionMenuItem,
  type ActionMenuProps,
} from "./patterns/overlays/action-menu/action-menu";
export {
  ConfirmDialog,
  type ConfirmDialogProps,
} from "./patterns/overlays/confirm-dialog/confirm-dialog";
