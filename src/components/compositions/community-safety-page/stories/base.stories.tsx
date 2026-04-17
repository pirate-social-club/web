import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import {
  CommunitySafetyPage,
  createDefaultCommunitySafetyAdultContentPolicy,
  createDefaultCommunitySafetyCivilityPolicy,
  createDefaultCommunitySafetyGraphicContentPolicy,
  createDefaultCommunitySafetyProviderSettings,
} from "@/components/compositions/community-safety-page/community-safety-page";

function CommunitySafetyPageStory() {
  const [providerSettings, setProviderSettings] = React.useState(
    createDefaultCommunitySafetyProviderSettings(),
  );
  const [adultContentPolicy, setAdultContentPolicy] = React.useState(
    createDefaultCommunitySafetyAdultContentPolicy(),
  );
  const [graphicContentPolicy, setGraphicContentPolicy] = React.useState(
    createDefaultCommunitySafetyGraphicContentPolicy(),
  );
  const [civilityPolicy, setCivilityPolicy] = React.useState(
    createDefaultCommunitySafetyCivilityPolicy(),
  );

  return (
    <CommunitySafetyPage
      adultContentPolicy={adultContentPolicy}
      civilityPolicy={civilityPolicy}
      graphicContentPolicy={graphicContentPolicy}
      onAdultContentPolicyChange={setAdultContentPolicy}
      onCivilityPolicyChange={setCivilityPolicy}
      onGraphicContentPolicyChange={setGraphicContentPolicy}
      onProviderSettingsChange={setProviderSettings}
      providerSettings={providerSettings}
    />
  );
}

const meta = {
  title: "Compositions/Moderation/Safety",
  component: CommunitySafetyPage,
  args: {
    adultContentPolicy: createDefaultCommunitySafetyAdultContentPolicy(),
    civilityPolicy: createDefaultCommunitySafetyCivilityPolicy(),
    graphicContentPolicy: createDefaultCommunitySafetyGraphicContentPolicy(),
    providerSettings: createDefaultCommunitySafetyProviderSettings(),
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunitySafetyPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <CommunitySafetyPageStory />,
};
