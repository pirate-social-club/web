"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { SidebarSimple } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/primitives/button";
import { Separator } from "@/components/primitives/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/primitives/tooltip";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";

import { useSidebar, useSidebarSide } from "./sidebar.shared";

export function SidebarTrigger({ className, onClick, ref, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("size-9", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <SidebarSimple />
      <span className="sr-only">{copy.toggleSidebar}</span>
    </Button>
  );
}

export function SidebarRail({ className, ref, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;

  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label={copy.toggleSidebar}
      tabIndex={-1}
      onClick={toggleSidebar}
      title={copy.toggleSidebar}
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:start-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarInset({ className, ref, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      ref={ref}
      className={cn(
        "relative flex w-full flex-1 flex-col bg-background",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ms-2 md:peer-data-[variant=inset]:ms-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarHeader({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("flex flex-col gap-3 p-4", className)}
      {...props}
    />
  );
}

export function SidebarSeparator({ className, ref, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      {...props}
    />
  );
}

export function SidebarContent({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroup({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-3", className)}
      {...props}
    />
  );
}

export function SidebarGroupLabel({ asChild = false, className, ref, ...props }: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "flex h-9 shrink-0 items-center rounded-md px-3 text-base font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-5 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroupContent({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      data-sidebar="group-content"
      className={cn("w-full text-base", className)}
      {...props}
    />
  );
}

export function SidebarMenu({ className, ref, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      ref={ref}
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
}

export function SidebarMenuItem({ className, ref, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      ref={ref}
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-3 overflow-hidden rounded-md p-2.5 text-start text-base outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pe-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-2.5 [&>span:last-child]:truncate [&>svg]:size-5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-10 text-base",
        sm: "h-9 text-base",
        lg: "h-12 text-base group-data-[collapsible=icon]:!p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type SidebarMenuButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string | React.ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof sidebarMenuButtonVariants>;

export function SidebarMenuButton({
  asChild = false,
  className,
  isActive = false,
  ref,
  size = "default",
  tooltip,
  variant = "default",
  ...props
}: SidebarMenuButtonProps) {
    const Comp = asChild ? Slot : "button";
    const { isMobile, state } = useSidebar();
    const side = useSidebarSide();

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      />
    );

    if (!tooltip) {
      return button;
    }

    const tooltipProps =
      typeof tooltip === "string"
        ? { children: tooltip }
        : tooltip;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side={side === "right" ? "left" : "right"}
          align="center"
          hidden={state !== "collapsed" || isMobile}
          {...tooltipProps}
        />
      </Tooltip>
    );
}
