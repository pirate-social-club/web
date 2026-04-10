import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Flag,
  House,
  Plus,
} from "@phosphor-icons/react";
import { PirateBrandMark } from "@/components/primitives/pirate-brand-mark";
import {
  resolveDirectionalSide,
  useUiLocale,
} from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "./sidebar";

const meta = {
  title: "Primitives/Sidebar",
  component: Sidebar,
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ height: 720, width: "100%", minHeight: 720 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

const sectionLabelClassName =
  "px-4 pb-1.5 pt-3 text-base font-normal uppercase tracking-[0.06em] text-sidebar-foreground/32 hover:no-underline";

const navRowClassName = "h-12 rounded-xl px-4 text-base font-medium";

type DemoTopLevelItem = {
  active?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

function SidebarSection({
  title,
  items,
  defaultOpen = true,
}: {
  title: string;
  items: string[];
  defaultOpen?: boolean;
}) {
  return (
    <Accordion
      className="px-4 group-data-[collapsible=icon]:hidden"
      collapsible
      defaultValue={defaultOpen ? title : undefined}
      type="single"
    >
      <AccordionItem className="border-b-0" value={title}>
        <AccordionTrigger className={sectionLabelClassName}>
          {title}
        </AccordionTrigger>
        <AccordionContent>
          <SidebarGroup className="gap-0 px-0 py-0">
            <SidebarGroupContent>
              <SidebarMenuSub className="mx-0 translate-x-0 border-s-0 px-0 py-0">
                {items.map((item) => (
                  <SidebarMenuSubItem key={item}>
                    <SidebarMenuSubButton
                      className="h-12 rounded-xl px-4 text-base font-medium"
                      href="#"
                      size="md"
                    >
                      <span className="truncate">{item}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </SidebarGroupContent>
          </SidebarGroup>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function DemoSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { dir, locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "shell");
  const topLevelItems: DemoTopLevelItem[] = [
    {
      icon: House,
      label: copy.appSidebar.homeLabel,
      active: true,
    },
    {
      icon: Flag,
      label: copy.appSidebar.yourCommunitiesLabel,
    },
    {
      icon: Plus,
      label: copy.appSidebar.createCommunityLabel,
    },
  ];
  const resolvedSide = resolveDirectionalSide("start", dir);

  return (
    <Sidebar collapsible="icon" side={resolvedSide} {...props}>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-12 rounded-xl px-4" size="lg" tooltip={copy.appSidebar.brandLabel}>
              <PirateBrandMark className="h-10 w-10 shrink-0" decorative={false} />
              <div className="grid flex-1 text-start text-lg leading-tight">
                <span className="truncate font-semibold">{copy.appSidebar.brandLabel}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-3 overflow-y-auto px-0 pb-4 pt-3">
        <SidebarGroup className="px-4 pt-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {topLevelItems.map((item) => {
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      className={navRowClassName}
                      isActive={item.active}
                      tooltip={item.label}
                    >
                      <Icon className="size-5" />
                      <div className="flex min-w-0 flex-1 items-center">
                        <span className="truncate">{item.label}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {copy.appSidebar.sections.map((section) => (
          <SidebarSection
            defaultOpen
            items={section.items.map((item) => item.label)}
            key={section.id}
            title={section.label}
          />
        ))}

        <SidebarGroup className="gap-0 px-4 py-0">
          <SidebarGroupLabel className={sectionLabelClassName}>
            {copy.appSidebar.resourcesLabel}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {copy.appSidebar.resourceItems.map((item) => {
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      className={navRowClassName}
                      tooltip={item.label}
                    >
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function SidebarStoryFrame() {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "shell");

  return (
    <SidebarProvider>
      <DemoSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ms-1" />
          <span className="text-base font-medium">{copy.storybook.contentAreaLabel}</span>
        </header>
      </SidebarInset>
    </SidebarProvider>
  );
}

export const Default: Story = {
  render: () => <SidebarStoryFrame />,
};

export const Arabic: Story = {
  globals: {
    direction: "auto",
    locale: "ar",
  },
  render: () => <SidebarStoryFrame />,
};

export const Pseudo: Story = {
  globals: {
    direction: "auto",
    locale: "pseudo",
  },
  render: () => (
    <SidebarStoryFrame />
  ),
};
