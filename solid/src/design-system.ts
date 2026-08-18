// Explicit package boundary: product UI imports catalog primitives here and
// never reaches through the design-system implementation from route code.
// Until the root-barrel split lands (UI track), this module is the single
// app-side import site for @pirate/web-solid-ui.
export { cn, createIsMobile } from "@pirate/web-solid-ui";

export {
  Button,
  buttonVariants,
  type ButtonProps,
} from "@pirate/web-solid-ui";
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@pirate/web-solid-ui";
export {
  TextField,
  TextFieldDescription,
  TextFieldInput,
  TextFieldLabel,
} from "@pirate/web-solid-ui";

// Chrome and navigation (Batch 5 patterns used by the shell features).
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AppHeader,
  MobileFooterNav,
  MobilePageHeader,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  createSidebar,
  createSidebarSide,
  type FooterNavItemId,
  type MobileFooterNavIcons,
} from "@pirate/web-solid-ui";

// Route states (Batch 5 feedback patterns used by the shell).
export {
  RootAppErrorState,
  RouteLoadingState,
  RouteMessageState,
} from "@pirate/web-solid-ui";

// Primitives used by the shell features and their stories.
export {
  Avatar,
  Card,
  IconButton,
  Input,
  PageContainer,
  PirateBrandMark,
  Separator,
  Spinner,
  Type,
  type PageContainerProps,
} from "@pirate/web-solid-ui";

// Primitives and patterns used by the post-card feature (B7a).
export {
  ActionMenu,
  AvatarBadge,
  buildDefaultAvatarBadgeSrc,
  CommentPill,
  FormattedText,
  MediaControlButton,
  mediaControlButtonVariants,
  Scrubber,
  Skeleton,
  VerticalFeed,
  VotePill,
  resolveAvatarBadgeSrc,
  type ActionMenuItem,
  type AvatarBadgeProps,
  type CommentPillProps,
  type FormattedTextProps,
  type MediaControlButtonProps,
  type MediaPostData,
  type ScrubberProps,
  type VerticalFeedProps,
  type VotePillProps,
} from "@pirate/web-solid-ui";

// Icons used by the shell features and their stories.
export {
  IconBell,
  IconCaretDown,
  IconChatCircle,
  IconFire,
  IconFlag,
  IconHouse,
  IconList,
  IconMagnifyingGlass,
  IconPlus,
  IconTrendUp,
  IconWallet,
} from "@pirate/web-solid-ui";

// Icons used by the post-card feature (B7a).
export {
  IconArrowSquareOut,
  IconArrowsClockwise,
  IconBroadcast,
  IconCalendar,
  IconCalendarBlank,
  IconCheck,
  IconCheckCircle,
  IconClock,
  IconCopy,
  IconCrown,
  IconDotsThree,
  IconDownloadSimple,
  IconGlobe,
  IconInfo,
  IconLink,
  IconLock,
  IconMapPin,
  IconMusicNote,
  IconPause,
  IconPlay,
  IconRobot,
  IconShareFat,
  IconShareNetwork,
  IconShield,
  IconUsers,
  IconX,
  IconVideoCamera,
  IconVinylRecord,
  IconWarningCircle,
} from "@pirate/web-solid-ui";

// Primitives and patterns used by the post-composer feature (B7b).
export {
  CardContent,
  CardFooter,
  Checkbox,
  CheckboxLabel,
  Chip,
  Combobox,
  CommunityAvatar,
  DialogFooter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FormFieldLabel,
  FormattedTextarea,
  FormNote,
  FormSectionHeading,
  Label,
  PillButton,
  pillButtonVariants,
  RadioIndicator,
  ResponsiveOptionSelect,
  Select,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  type FormattedTextareaProps,
  type FormattedTextareaToolbarAction,
  type FormattedTextareaToolbarLabels,
  type ResponsiveOptionSelectOption,
  type ResponsiveOptionSelectProps,
} from "@pirate/web-solid-ui";

// Icons used by the post-composer feature (B7b).
export {
  IconArrowUp,
  IconFileText,
  IconImage,
  IconMaskHappy,
  IconMicrophone,
  IconTrash,
  IconUploadSimple,
  IconUsersThree,
} from "@pirate/web-solid-ui";

// Primitives and icons used by the wallet Storybook feature (B8b).
export { IconPencil } from "@pirate/web-solid-ui";

export {
  BadgedCircle,
  CopyField,
  IconCaretLeft,
  IconCaretRight,
  type BadgedCircleProps,
  type CopyFieldProps,
} from "@pirate/web-solid-ui";
