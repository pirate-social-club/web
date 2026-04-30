import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { NotificationInboxPage } from "@/components/compositions/notifications/inbox-page/notification-inbox-page";
import {
  commentReplyRead,
  commentReplyUnread,
  globalHandleCleanupTask,
  membershipReviewTask,
  namespaceVerificationTask,
  profileCompletionTask,
  royaltyActivityItems,
  uniqueHumanVerificationTask,
  postCommentedUnread,
} from "./story-fixtures";

function StatefulStory({
  activityItems = [],
  initialTasks = [],
  loading = false,
  installPromoPreviewState,
}: {
  activityItems?: React.ComponentProps<typeof NotificationInboxPage>["activityItems"];
  initialTasks?: React.ComponentProps<typeof NotificationInboxPage>["tasks"];
  loading?: boolean;
  installPromoPreviewState?: React.ComponentProps<typeof NotificationInboxPage>["installPromoPreviewState"];
}) {
  const [tasks, setTasks] = React.useState(initialTasks);

  return (
    <NotificationInboxPage
      activityItems={activityItems}
      loading={loading}
      onVerifyTask={(task) => {
        setTasks((current) => current.filter((t) => t.id !== task.id));
      }}
      royaltyActivityItems={royaltyActivityItems}
      tasks={tasks}
      installPromoPreviewState={installPromoPreviewState}
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
      activityItems={[commentReplyUnread, postCommentedUnread, commentReplyRead]}
    />
  ),
};

export const Mixed: Story = {
  render: () => (
    <StatefulStory
      activityItems={[commentReplyUnread, postCommentedUnread, commentReplyRead]}
      initialTasks={[uniqueHumanVerificationTask, namespaceVerificationTask, profileCompletionTask, globalHandleCleanupTask, membershipReviewTask]}
    />
  ),
};

export const InstallSuggestionTask: Story = {
  name: "Install suggestion task",
  render: () => (
    <StatefulStory
      activityItems={[commentReplyUnread]}
      initialTasks={[uniqueHumanVerificationTask, profileCompletionTask]}
      installPromoPreviewState="default"
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

export const RoyaltiesOnly: Story = {
  name: "Royalties only",
  render: () => <StatefulStory activityItems={[]} initialTasks={[]} />,
};

export const MixedWithRoyalties: Story = {
  name: "Mixed / Royalties",
  render: () => (
    <StatefulStory
      activityItems={[commentReplyUnread, postCommentedUnread, commentReplyRead]}
      initialTasks={[membershipReviewTask, profileCompletionTask]}
    />
  ),
};

export const OnboardingTasks: Story = {
  render: () => (
    <StatefulStory
      initialTasks={[uniqueHumanVerificationTask, profileCompletionTask, globalHandleCleanupTask]}
    />
  ),
};

export const GlobalHandleCleanupTask: Story = {
  render: () => (
    <StatefulStory
      initialTasks={[globalHandleCleanupTask]}
    />
  ),
};

export const MobileMixed: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <StatefulStory
      activityItems={[commentReplyUnread, postCommentedUnread]}
      initialTasks={[uniqueHumanVerificationTask, profileCompletionTask, membershipReviewTask]}
    />
  ),
};

export const MobileNotifications: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <StatefulStory
      activityItems={[commentReplyUnread, postCommentedUnread]}
      initialTasks={[uniqueHumanVerificationTask, profileCompletionTask]}
    />
  ),
};

export const MobileWithInstallPromo: Story = {
  name: "Mobile / Install promo",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <StatefulStory
      activityItems={[commentReplyUnread, postCommentedUnread]}
      initialTasks={[uniqueHumanVerificationTask, profileCompletionTask]}
      installPromoPreviewState="default"
    />
  ),
};

export const MobileWithInstallPromoIOS: Story = {
  name: "Mobile / Install promo (iOS)",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <StatefulStory
      activityItems={[commentReplyUnread, postCommentedUnread]}
      initialTasks={[uniqueHumanVerificationTask, profileCompletionTask]}
      installPromoPreviewState="ios_instructions"
    />
  ),
};
