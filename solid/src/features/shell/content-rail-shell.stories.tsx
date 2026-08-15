import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { Type } from "../../design-system";

import { ContentRailShell } from "./content-rail-shell";

const meta = {
  title: "App/Shell/ContentRailShell",
  component: ContentRailShell,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ContentRailShell>;

export default meta;

type Story = StoryObj<typeof meta>;

const cardClass = "rounded-[var(--radius-2xl)] border border-border-soft bg-card px-5 py-4";

export const Default: Story = {
  args: {
    header: (
      <div class={cardClass}>
        <Type as="h2" variant="h4">Community header</Type>
      </div>
    ),
    children: (
      <div class="space-y-4">
        <div class={cardClass}>
          <Type as="p" variant="caption">Feed item one</Type>
        </div>
        <div class={cardClass}>
          <Type as="p" variant="caption">Feed item two</Type>
        </div>
      </div>
    ),
    rail: (
      <div class={cardClass}>
        <Type as="p" variant="body-strong">Sidebar</Type>
        <Type as="p" variant="caption">Rail content</Type>
      </div>
    ),
  },
};

export const WithoutHeader: Story = {
  args: {
    children: (
      <div class={cardClass}>
        <Type as="p" variant="caption">Main content without header</Type>
      </div>
    ),
    rail: (
      <div class={cardClass}>
        <Type as="p" variant="body-strong">Sidebar</Type>
      </div>
    ),
  },
};

export const WithoutRail: Story = {
  args: {
    header: (
      <div class={cardClass}>
        <Type as="h2" variant="h4">Standalone header</Type>
      </div>
    ),
    children: (
      <div class={cardClass}>
        <Type as="p" variant="caption">Full-width content</Type>
      </div>
    ),
  },
};
