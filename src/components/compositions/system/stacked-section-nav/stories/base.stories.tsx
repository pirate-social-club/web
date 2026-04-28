import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { StackedSectionNav } from "../stacked-section-nav";

const meta = {
  title: "Compositions/System/StackedSectionNav",
  component: StackedSectionNav,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof StackedSectionNav>;

export default meta;

type Story = StoryObj<typeof meta>;

const baseSections = [
  {
    label: "Account",
    items: [
      { label: "Profile", active: true },
      { label: "Notifications" },
      { label: "Privacy" },
    ],
  },
  {
    label: "App",
    items: [
      { label: "Appearance" },
      { label: "Language" },
    ],
  },
];

export const Default: Story = {
  args: {
    sections: baseSections,
  },
};

export const MobileLayout: Story = {
  args: {
    mobileLayout: true,
    sections: baseSections,
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const Interactive: Story = {
  args: { sections: [] },
  render: () => {
    const [active, setActive] = React.useState("Profile");
    return (
      <div className="p-4">
        <StackedSectionNav
          sections={[
            {
              label: "Account",
              items: [
                { label: "Profile", active: active === "Profile", onSelect: () => setActive("Profile") },
                { label: "Notifications", active: active === "Notifications", onSelect: () => setActive("Notifications") },
                { label: "Privacy", active: active === "Privacy", onSelect: () => setActive("Privacy") },
              ],
            },
            {
              label: "App",
              items: [
                { label: "Appearance", active: active === "Appearance", onSelect: () => setActive("Appearance") },
                { label: "Language", active: active === "Language", onSelect: () => setActive("Language") },
              ],
            },
          ]}
        />
      </div>
    );
  },
};
