import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunityRulesEditorPage, type RuleDraft } from "../community-rules-editor-page";

const meta = {
  title: "Compositions/Community/Moderation/Rules",
  component: CommunityRulesEditorPage,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunityRulesEditorPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const DEFAULT_RULES: RuleDraft[] = [
  {
    id: "rule-1",
    existingRuleId: "rule-1",
    title: "Respect others and be civil",
    body: "No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness.",
    reportReason: "Respect others and be civil",
  },
  {
    id: "rule-2",
    existingRuleId: "rule-2",
    title: "No spam",
    body: "Excessive promotion, spam, or advertising of any kind is not allowed.",
    reportReason: "No spam",
  },
];

export const Default: Story = {
  args: { rules: [], onSave: () => undefined },
  render: () => {
    const [rules, setRules] = React.useState<RuleDraft[]>(DEFAULT_RULES);
    return (
      <CommunityRulesEditorPage
        onRulesChange={setRules}
        onSave={() => undefined}
        rules={rules}
      />
    );
  },
};

export const Blank: Story = {
  args: { rules: [], onSave: () => undefined },
  render: () => {
    const [rules, setRules] = React.useState<RuleDraft[]>([]);
    return (
      <CommunityRulesEditorPage
        onRulesChange={setRules}
        onSave={() => undefined}
        rules={rules}
      />
    );
  },
};
