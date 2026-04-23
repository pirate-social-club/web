import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import {
  CommunityLabelsEditorPage,
  createEmptyLabelDefinition,
  type LabelEditorDefinition,
} from "../community-labels-editor-page";

const SAMPLE_LABELS: LabelEditorDefinition[] = [
  { id: "l1", label: "Discussion", color: "#6377f0", status: "active" },
  { id: "l2", label: "News", color: "#f06377", status: "active" },
  { id: "l3", label: "Media", color: "#63f0a5", status: "active" },
  { id: "l4", label: "Original", color: "#f0d163", status: "active" },
];

const MANY_LABELS: LabelEditorDefinition[] = [
  { id: "l1", label: "Discussion", color: "#6377f0", status: "active" },
  { id: "l2", label: "News", color: "#f06377", status: "active" },
  { id: "l3", label: "Media", color: "#63f0a5", status: "active" },
  { id: "l4", label: "Original", color: "#f0d163", status: "active" },
  { id: "l5", label: "Question", color: "#d163f0", status: "active" },
  { id: "l6", label: "Meme", color: "#63f0d1", status: "active" },
  { id: "l7", label: "Live", color: "#f06337", status: "active" },
  { id: "l8", label: "Remix", color: "#37f063", status: "active" },
  { id: "l9", label: "Tutorial", color: "#f0a040", status: "active" },
  { id: "l10", label: "Feedback", color: "#40a0f0", status: "active" },
];

const WITH_ARCHIVED: LabelEditorDefinition[] = [
  { id: "l1", label: "Discussion", color: "#6377f0", status: "active" },
  { id: "l2", label: "News", color: "#f06377", status: "active" },
  { id: "l3", label: "Legacy", color: "#888888", status: "archived" },
  { id: "l4", label: "Old tag", color: "#aaaaaa", status: "archived" },
];

function LabelsEditorStory({
  initialLabelsEnabled = true,
  initialLabels = SAMPLE_LABELS,
}: {
  initialLabelsEnabled?: boolean;
  initialLabels?: LabelEditorDefinition[];
}) {
  const [labelsEnabled, setLabelsEnabled] = React.useState(initialLabelsEnabled);
  const [labels, setLabels] = React.useState<LabelEditorDefinition[]>(initialLabels);

  return (
    <CommunityLabelsEditorPage
      labels={labels}
      labelsEnabled={labelsEnabled}
      onLabelsChange={setLabels}
      onLabelsEnabledChange={setLabelsEnabled}
    />
  );
}

const meta = {
  title: "Compositions/Moderation/Labels",
  component: CommunityLabelsEditorPage,
  args: {
    labelsEnabled: true,
    labels: SAMPLE_LABELS,
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunityLabelsEditorPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "Several labels",
  render: () => <LabelsEditorStory />,
};

export const Empty: Story = {
  name: "No labels yet",
  render: () => (
    <LabelsEditorStory initialLabels={[]} />
  ),
};

export const SingleLabel: Story = {
  name: "One label",
  render: () => (
    <LabelsEditorStory initialLabels={[{ id: "l1", label: "Discussion", color: "#6377f0", status: "active" }]} />
  ),
};

export const ManyLabels: Story = {
  name: "Many labels",
  render: () => <LabelsEditorStory initialLabels={MANY_LABELS} />,
};

export const WithArchived: Story = {
  name: "With archived labels",
  render: () => <LabelsEditorStory initialLabels={WITH_ARCHIVED} />,
};

export const Disabled: Story = {
  name: "Labels disabled",
  render: () => (
    <LabelsEditorStory
      initialLabelsEnabled={false}
      initialLabels={[]}
    />
  ),
};

export const CreatingNewLabel: Story = {
  name: "Creating new label",
  render: () => (
    <LabelsEditorStory
      initialLabels={[...SAMPLE_LABELS, createEmptyLabelDefinition()]}
    />
  ),
};
