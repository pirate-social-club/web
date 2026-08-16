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
} from "@pirate/web-solid-ui";

// Route states (Batch 5 feedback patterns used by the shell).
export {
  RootAppErrorState,
  RouteLoadingState,
} from "@pirate/web-solid-ui";

// Primitives used by the shell features and their stories.
export {
  Avatar,
  Card,
  IconButton,
  Input,
  PageContainer,
  PirateBrandMark,
  Spinner,
  Type,
  type PageContainerProps,
} from "@pirate/web-solid-ui";

// Primitives and patterns used by the post-card feature (B7a).
export {
  ActionMenu,
  AvatarBadge,
  CommentPill,
  FormattedText,
  MediaControlButton,
  mediaControlButtonVariants,
  Scrubber,
  Skeleton,
  VotePill,
  type ActionMenuItem,
  type AvatarBadgeProps,
  type CommentPillProps,
  type FormattedTextProps,
  type MediaControlButtonProps,
  type ScrubberProps,
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
  FormNote,
  FormSectionHeading,
  Label,
  PillButton,
  RadioIndicator,
  Select,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@pirate/web-solid-ui";

// Icons used by the post-composer feature (B7b).
export {
  IconFileText,
  IconImage,
  IconMaskHappy,
  IconMicrophone,
  IconTrash,
  IconUploadSimple,
  IconUsersThree,
} from "@pirate/web-solid-ui";
