import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { NotificationInboxPage } from "@/components/compositions/notification-inbox-page/notification-inbox-page";
import {
  allContractActivityFixtures,
  allContractTaskFixtures,
  allLiveActivityFixtures,
  allLiveTaskFixtures,
  membershipReviewTask,
  namespaceVerificationTask,
} from "./story-fixtures";

function StatefulStory({
  activityItems = [],
  initialTasks = [],
  loading = false,
}: {
  activityItems?: React.ComponentProps<typeof NotificationInboxPage>["activityItems"];
  initialTasks?: React.ComponentProps<typeof NotificationInboxPage>["tasks"];
  loading?: boolean;
}) {
  const [tasks, setTasks] = React.useState(initialTasks);

  return (
    <NotificationInboxPage
      activityItems={activityItems}
      loading={loading}
      onDismissTask={(task) => setTasks((current) => current.filter((item) => item.task_id !== task.task_id))}
      onVerifyTask={() => {}}
      tasks={tasks}
    />
  );
}

const meta = {
  title: "Compositions/Notifications/Inbox",
  component: NotificationInboxPage,
  args: {
    activityItems: [],
    tasks: [],
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof NotificationInboxPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  render: () => (
    <StatefulStory
      initialTasks={[namespaceVerificationTask]}
      loading
    />
  ),
};

export const Empty: Story = {
  render: () => <StatefulStory />,
};

export const TaskOnly: Story = {
  render: () => (
    <StatefulStory
      initialTasks={[namespaceVerificationTask]}
    />
  ),
};

export const ActivityOnly: Story = {
  render: () => (
    <StatefulStory
      activityItems={allLiveActivityFixtures}
    />
  ),
};

export const Mixed: Story = {
  render: () => (
    <StatefulStory
      activityItems={allLiveActivityFixtures}
      initialTasks={allLiveTaskFixtures}
    />
  ),
};

export const MembershipReviewTask: Story = {
  render: () => (
    <StatefulStory
      initialTasks={[membershipReviewTask]}
    />
  ),
};

export const ContractCoverage: Story = {
  render: () => (
    <StatefulStory
      activityItems={allContractActivityFixtures}
      initialTasks={allContractTaskFixtures}
    />
  ),
};
