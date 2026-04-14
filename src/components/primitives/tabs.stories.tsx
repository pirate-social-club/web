import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  title: "Primitives/Tabs",
  component: TabsList,
} satisfies Meta<typeof TabsList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p className="text-base text-muted-foreground">Make changes to your account here.</p>
      </TabsContent>
      <TabsContent value="password">
        <p className="text-base text-muted-foreground">Change your password here.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const ManyTabs: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="tab1">Overview</TabsTrigger>
        <TabsTrigger value="tab2">Analytics</TabsTrigger>
        <TabsTrigger value="tab3">Reports</TabsTrigger>
        <TabsTrigger value="tab4">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1"><p className="text-base">Overview content</p></TabsContent>
      <TabsContent value="tab2"><p className="text-base">Analytics content</p></TabsContent>
      <TabsContent value="tab3"><p className="text-base">Reports content</p></TabsContent>
      <TabsContent value="tab4"><p className="text-base">Settings content</p></TabsContent>
    </Tabs>
  ),
};
