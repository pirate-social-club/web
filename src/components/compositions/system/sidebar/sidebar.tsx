"use client";

import * as React from "react";

import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/primitives/sheet";
import { TooltipProvider } from "@/components/primitives/tooltip";

import {
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_WIDTH_MOBILE,
  SIDEBAR_WIDTH_MOBILE_VARIABLE,
  SidebarContext,
  SidebarSideContext,
  type SidebarContextProps,
  useSidebar,
  useSidebarSide,
} from "./sidebar.shared";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "./sidebar.primitives";

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const detectedMobile = useIsMobile();
    const hydrated = useClientHydrated();
    const isMobile = hydrated ? detectedMobile : false;
    const [openMobile, setOpenMobile] = React.useState(false);
    const [_open, _setOpen] = React.useState(defaultOpen);
    const open = openProp ?? _open;

    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }

        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      },
      [open, setOpenProp],
    );

    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((currentOpen) => !currentOpen)
        : setOpen((currentOpen) => !currentOpen);
    }, [isMobile, setOpen]);

    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault();
          toggleSidebar();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);

    const state = open ? "expanded" : "collapsed";
    const contextValue = React.useMemo<SidebarContextProps>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [isMobile, open, openMobile, setOpen, state, toggleSidebar],
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                [SIDEBAR_WIDTH_MOBILE_VARIABLE]: SIDEBAR_WIDTH_MOBILE,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
              className,
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  },
);
SidebarProvider.displayName = "SidebarProvider";

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right";
    variant?: "sidebar" | "floating" | "inset";
    collapsible?: "offcanvas" | "icon" | "none";
  }
>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    if (collapsible === "none") {
      return (
        <SidebarSideContext.Provider value={side}>
          <div
            className={cn(
              "flex h-full w-[var(--sidebar-width)] flex-col bg-sidebar text-sidebar-foreground",
              className,
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </SidebarSideContext.Provider>
      );
    }

    if (isMobile) {
      return (
        <SidebarSideContext.Provider value={side}>
          <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
            <SheetContent
              data-sidebar="sidebar"
              data-mobile="true"
              className="w-[var(--sidebar-width)] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
              style={
                {
                  "--sidebar-width": `var(${SIDEBAR_WIDTH_MOBILE_VARIABLE})`,
                } as React.CSSProperties
              }
              side={side}
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Sidebar</SheetTitle>
                <SheetDescription>Displays the mobile sidebar.</SheetDescription>
              </SheetHeader>
              <div className="flex h-full w-full flex-col">{children}</div>
            </SheetContent>
          </Sheet>
        </SidebarSideContext.Provider>
      );
    }

    return (
      <SidebarSideContext.Provider value={side}>
        <div
          ref={ref}
          className="group peer hidden text-sidebar-foreground md:block"
          data-state={state}
          data-collapsible={state === "collapsed" ? collapsible : ""}
          data-variant={variant}
          data-side={side}
        >
          <div
            className={cn(
              "relative w-[var(--sidebar-width)] bg-transparent transition-[width] duration-200 ease-linear",
              "group-data-[collapsible=offcanvas]:w-0",
              "group-data-[side=right]:rotate-180",
              variant === "floating" || variant === "inset"
                ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
                : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]",
            )}
          />
          <div
            className={cn(
              "fixed inset-y-0 z-10 hidden h-svh w-[var(--sidebar-width)] transition-[left,right,width] duration-200 ease-linear md:flex",
              side === "left"
                ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
                : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
              variant === "floating" || variant === "inset"
                ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
                : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)] group-data-[side=left]:border-r group-data-[side=right]:border-l",
              className,
            )}
            {...props}
          >
            <div
              data-sidebar="sidebar"
              className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
            >
              {children}
            </div>
          </div>
        </div>
      </SidebarSideContext.Provider>
    );
  },
);
Sidebar.displayName = "Sidebar";

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
  useSidebarSide,
};
