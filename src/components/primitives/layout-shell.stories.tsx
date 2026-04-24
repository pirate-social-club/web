import type { Meta, StoryObj } from "@storybook/react-vite";

import { CardShell, PageContainer } from "./layout-shell";

const meta = {
  title: "Primitives/LayoutShell",
  component: PageContainer,
} satisfies Meta<typeof PageContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <PageContainer className="space-y-4" size="default">
      <CardShell className="p-5">
        <div className="text-lg font-semibold">Default container</div>
        <div className="mt-2 text-base text-muted-foreground">Shared page width with a card shell.</div>
      </CardShell>
      <div className="grid gap-4 md:grid-cols-2">
        <CardShell className="p-5">Secondary panel</CardShell>
        <CardShell className="p-5">Tertiary panel</CardShell>
      </div>
    </PageContainer>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="w-[min(72rem,90vw)] space-y-4">
      <PageContainer className="rounded-lg border border-border-soft bg-card p-4" size="narrow">Narrow</PageContainer>
      <PageContainer className="rounded-lg border border-border-soft bg-card p-4" size="default">Default</PageContainer>
      <PageContainer className="rounded-lg border border-border-soft bg-card p-4" size="wide">Wide</PageContainer>
    </div>
  ),
};
