import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { ResponsiveOptionSelect } from "../responsive-option-select";

const meta = {
  title: "Compositions/System/ResponsiveOptionSelect",
  component: ResponsiveOptionSelect,
  args: {
    ariaLabel: "Sort options",
    drawerTitle: "Sort",
    options: [
      { label: "Best", value: "best" },
      { label: "New", value: "new" },
      { label: "Top", value: "top" },
    ],
    placeholder: "Sort by",
  },
  argTypes: {
    value: {
      control: "select",
      options: ["best", "new", "top"],
    },
  },
} satisfies Meta<typeof ResponsiveOptionSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "best",
  },
};

export const WithDescriptions: Story = {
  args: {
    value: "top",
    options: [
      { label: "Best", value: "best", description: "Most popular posts" },
      { label: "New", value: "new", description: "Latest posts first" },
      { label: "Top", value: "top", description: "Highest scored posts" },
    ],
  },
};

export const WithDisabledOption: Story = {
  args: {
    value: "best",
    options: [
      { label: "Best", value: "best" },
      { label: "New", value: "new" },
      { label: "Top", value: "top", disabled: true, disabledReason: "Requires login" },
    ],
  },
};

export const Interactive: Story = {
  render: () => {
    const [value, setValue] = React.useState("best");
    return (
      <ResponsiveOptionSelect
        ariaLabel="Sort feed"
        drawerTitle="Sort feed"
        onValueChange={setValue}
        options={[
          { label: "Best", value: "best" },
          { label: "New", value: "new" },
          { label: "Top", value: "top" },
        ]}
        value={value}
      />
    );
  },
};
