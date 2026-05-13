import type { Meta, StoryObj } from "@storybook/react-vite";

import { Type } from "@/components/primitives/type";
import { ContentRailShell } from "../content-rail-shell";

const meta = {
  title: "Compositions/App/ContentRailShell",
  component: ContentRailShell,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ContentRailShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    header: (
      <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-5 py-4">
        <Type as="h2" variant="h4">Community header</Type>
      </div>
    ),
    children: (
      <div className="space-y-4">
        <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-5 py-4">
          <Type as="p" variant="caption">Feed item one</Type>
        </div>
        <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-5 py-4">
          <Type as="p" variant="caption">Feed item two</Type>
        </div>
      </div>
    ),
    rail: (
      <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-5 py-4">
        <Type as="p" variant="body-strong">Sidebar</Type>
        <Type as="p" variant="caption">Rail content</Type>
      </div>
    ),
  },
};

export const WithoutHeader: Story = {
  args: {
    children: (
      <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-5 py-4">
        <Type as="p" variant="caption">Main content without header</Type>
      </div>
    ),
    rail: (
      <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-5 py-4">
        <Type as="p" variant="body-strong">Sidebar</Type>
      </div>
    ),
  },
};

export const WithoutRail: Story = {
  args: {
    header: (
      <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-5 py-4">
        <Type as="h2" variant="h4">Standalone header</Type>
      </div>
    ),
    children: (
      <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-5 py-4">
        <Type as="p" variant="caption">Full-width content</Type>
      </div>
    ),
  },
};
