import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunityRulesEditorPage } from "../community-rules-editor-page";

const meta = {
  title: "Compositions/Moderation/Rules",
  component: CommunityRulesEditorPage,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunityRulesEditorPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    description: "",
    reportReason: "",
    ruleName: "",
  },
  render: () => (
    <CommunityRulesEditorPage
      description="No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness."
      onSave={() => undefined}
      reportReason="Respect others and be civil"
      ruleName="Respect others and be civil"
    />
  ),
};

export const Blank: Story = {
  args: {
    description: "",
    reportReason: "",
    ruleName: "",
  },
  render: () => (
    <CommunityRulesEditorPage
      description=""
      onSave={() => undefined}
      reportReason=""
      ruleName=""
    />
  ),
};
