// Explicit package boundary: product UI imports catalog primitives here and
// never reaches through the design-system implementation from route code.
// Until the root-barrel split lands (UI track), this module is the single
// app-side import site for @pirate/web-solid-ui.
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
  useSidebar,
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

// Icons used by the shell features and their stories.
export {
  IconBell,
  IconChatCircle,
  IconFire,
  IconFlag,
  IconHouse,
  IconMagnifyingGlass,
  IconPlus,
  IconTrendUp,
  IconWallet,
} from "@pirate/web-solid-ui";
