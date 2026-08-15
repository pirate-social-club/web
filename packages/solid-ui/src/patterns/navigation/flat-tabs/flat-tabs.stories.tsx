import { createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Type } from "@/components/data-display/type/type";
import { Tabs } from "@/components/disclosure/tabs/tabs";

import {
  FlatTabBar,
  FlatTabButton,
  FlatTabsList,
  FlatTabsTrigger,
} from "./flat-tabs";

const meta = {
  title: "Patterns/Navigation/FlatTabs",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Flat underline tab chrome for profile and feed surfaces. FlatTabBar with FlatTabButton covers callback-driven switching without a tabs provider; FlatTabsList with FlatTabsTrigger flattens the Tabs primitives for controlled tab state. Both variants keep the active underline on the primary color and stay scrollable when columns are not fixed.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const TabBarWithButtons: Story = {
  render: () => {
    const [active, setActive] = createSignal("feed");
    return (
      <div class="p-4">
        <FlatTabBar columns={2}>
          <FlatTabButton active={active() === "feed"} onClick={() => setActive("feed")}>
            Feed
          </FlatTabButton>
          <FlatTabButton active={active() === "about"} onClick={() => setActive("about")}>
            About
          </FlatTabButton>
        </FlatTabBar>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const about = canvas.getByRole("button", { name: "About" });
    await userEvent.click(about);
    await expect(about).toHaveClass("border-primary");
    await expect(canvas.getByRole("button", { name: "Feed" })).toHaveClass(
      "border-transparent",
    );
  },
};

export const TabBarWithActions: Story = {
  render: () => {
    const [active, setActive] = createSignal("feed");
    return (
      <div class="p-4">
        <FlatTabBar
          actions={
            <Type as="button" class="text-primary" variant="body-strong">
              Sort
            </Type>
          }
          columns={2}
        >
          <FlatTabButton active={active() === "feed"} onClick={() => setActive("feed")}>
            Feed
          </FlatTabButton>
          <FlatTabButton active={active() === "about"} onClick={() => setActive("about")}>
            About
          </FlatTabButton>
        </FlatTabBar>
      </div>
    );
  },
};

export const TabsListWithTriggers: Story = {
  render: () => {
    const [value, setValue] = createSignal("tab1");
    return (
      <div class="p-4">
        <Tabs value={value()} onChange={setValue}>
          <FlatTabsList>
            <FlatTabsTrigger value="tab1">Posts</FlatTabsTrigger>
            <FlatTabsTrigger value="tab2">Comments</FlatTabsTrigger>
            <FlatTabsTrigger value="tab3">Saved</FlatTabsTrigger>
          </FlatTabsList>
        </Tabs>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const posts = canvas.getByRole("tab", { name: "Posts" });
    await expect(posts).toHaveAttribute("aria-selected", "true");
    await userEvent.click(posts);
    await userEvent.keyboard("{ArrowRight}");
    await expect(
      canvas.getByRole("tab", { name: "Comments" }),
    ).toHaveAttribute("aria-selected", "true");
  },
};
