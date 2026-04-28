import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Tabs } from "@/components/primitives/tabs";
import { Type } from "@/components/primitives/type";
import {
  FlatTabBar,
  FlatTabButton,
  FlatTabsList,
  FlatTabsTrigger,
} from "../flat-tabs";

const meta = {
  title: "Compositions/System/FlatTabs",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const TabBarWithButtons: Story = {
  render: () => {
    const [active, setActive] = React.useState("feed");
    return (
      <div className="p-4">
        <FlatTabBar columns={2}>
          <FlatTabButton active={active === "feed"} onClick={() => setActive("feed")}>
            Feed
          </FlatTabButton>
          <FlatTabButton active={active === "about"} onClick={() => setActive("about")}>
            About
          </FlatTabButton>
        </FlatTabBar>
      </div>
    );
  },
};

export const TabBarWithActions: Story = {
  render: () => {
    const [active, setActive] = React.useState("feed");
    return (
      <div className="p-4">
        <FlatTabBar
          actions={
            <Type as="button" className="text-primary" variant="body-strong">
              Sort
            </Type>
          }
          columns={2}
        >
          <FlatTabButton active={active === "feed"} onClick={() => setActive("feed")}>
            Feed
          </FlatTabButton>
          <FlatTabButton active={active === "about"} onClick={() => setActive("about")}>
            About
          </FlatTabButton>
        </FlatTabBar>
      </div>
    );
  },
};

export const TabsListWithTriggers: Story = {
  render: () => {
    const [value, setValue] = React.useState("tab1");
    return (
      <div className="p-4">
        <Tabs value={value} onValueChange={setValue}>
          <FlatTabsList>
            <FlatTabsTrigger value="tab1">Posts</FlatTabsTrigger>
            <FlatTabsTrigger value="tab2">Comments</FlatTabsTrigger>
            <FlatTabsTrigger value="tab3">Saved</FlatTabsTrigger>
          </FlatTabsList>
        </Tabs>
      </div>
    );
  },
};
