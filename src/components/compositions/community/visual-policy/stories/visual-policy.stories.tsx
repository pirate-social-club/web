import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  adultToplessNonExplicitSettings,
  CommunityVisualPolicyPage,
  sampleVisualFacts,
} from "../community-visual-policy";
import type { VisualClassifierFacts, VisualPolicySettings } from "../community-visual-policy.types";

function InteractiveStory({
  sampleFacts,
  settings: initialSettings,
}: {
  sampleFacts?: VisualClassifierFacts;
  settings: VisualPolicySettings;
}) {
  const [settings, setSettings] = React.useState(initialSettings);
  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-6">
      <CommunityVisualPolicyPage
        sampleFacts={sampleFacts}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
}

const meta = {
  title: "Compositions/Community/Moderation/VisualPolicy",
  component: CommunityVisualPolicyPage,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => (
    <InteractiveStory
      sampleFacts={args.sampleFacts}
      settings={args.settings}
    />
  ),
} satisfies Meta<typeof CommunityVisualPolicyPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AdultToplessNonExplicit: Story = {
  args: {
    settings: adultToplessNonExplicitSettings,
    sampleFacts: sampleVisualFacts,
  },
};

export const FurryExplicitQueued: Story = {
  args: {
    settings: {
      ...adultToplessNonExplicitSettings,
      fictionalExplicitSex: "queue",
      furryAnthro: "allow",
    },
    sampleFacts: {
      visualStyle: "furry_anthro",
      characterContext: "anthro_furry",
      apparentAgeRisk: "adult",
      nudity: "topless",
      visibleNipples: true,
      sexualActivity: "explicit",
      sexualizedContact: false,
      masturbation: false,
      oralSex: false,
      sexToy: "none",
      voyeuristicOrHiddenCamera: false,
      commercialSignal: "none",
      syntheticRisk: "none",
      imageTextSignal: "none",
      safetySignal: "none",
      quality: "clear",
    },
  },
};

export const AnimeAmbiguousAge: Story = {
  args: {
    settings: adultToplessNonExplicitSettings,
    sampleFacts: {
      visualStyle: "anime_manga",
      characterContext: "fictional_stylized",
      apparentAgeRisk: "uncertain",
      nudity: "topless",
      visibleNipples: true,
      sexualActivity: "implied",
      sexualizedContact: false,
      masturbation: false,
      oralSex: false,
      sexToy: "none",
      voyeuristicOrHiddenCamera: false,
      commercialSignal: "none",
      syntheticRisk: "none",
      imageTextSignal: "none",
      safetySignal: "none",
      quality: "clear",
    },
  },
};

export const MarketplaceSpam: Story = {
  args: {
    settings: {
      ...adultToplessNonExplicitSettings,
      topless: "reject",
      visibleNipples: "reject",
      animeManga: "queue",
      furryAnthro: "queue",
      productPromotion: "queue",
      affiliateOrSalesLink: "reject",
      urlsInImage: "queue",
      qrCode: "reject",
      paymentHandle: "reject",
    },
    sampleFacts: {
      visualStyle: "meme_screenshot",
      characterContext: "real_person",
      apparentAgeRisk: "not_applicable",
      nudity: "none",
      visibleNipples: false,
      sexualActivity: "none",
      sexualizedContact: false,
      masturbation: false,
      oralSex: false,
      sexToy: "none",
      voyeuristicOrHiddenCamera: false,
      commercialSignal: "product_promotion",
      syntheticRisk: "none",
      imageTextSignal: "qr_code",
      safetySignal: "none",
      quality: "clear",
    },
  },
};

export const Mobile: Story = {
  args: {
    settings: adultToplessNonExplicitSettings,
    sampleFacts: sampleVisualFacts,
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
