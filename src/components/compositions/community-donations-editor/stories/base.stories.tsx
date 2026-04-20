import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import {
  CommunityDonationsEditorPage,
  type DonationPartnerPreview,
} from "../community-donations-editor-page";

function DonationsEditorStory({
  initialEndaomentUrl,
  initialPartnerPreview,
}: {
  initialEndaomentUrl: string;
  initialPartnerPreview: DonationPartnerPreview | null;
}) {
  const [endaomentUrl, setEndaomentUrl] = React.useState(initialEndaomentUrl);
  const [partnerPreview, setPartnerPreview] = React.useState(initialPartnerPreview);

  return (
    <CommunityDonationsEditorPage
      endaomentUrl={endaomentUrl}
      onClearPartner={() => setPartnerPreview(null)}
      onEndaomentUrlChange={setEndaomentUrl}
      onResolve={() => undefined}
      onSave={() => undefined}
      partnerPreview={partnerPreview}
      resolveError={null}
      resolving={false}
      saveDisabled={endaomentUrl.trim().length > 0 && partnerPreview == null}
    />
  );
}

const configuredPartner: DonationPartnerPreview = {
  donationPartnerId: "endaoment:mock-charity-water",
  displayName: "charity: water",
  imageUrl: "https://placehold.co/96x96/111827/f97316?text=CW",
  provider: "Endaoment",
  providerPartnerRef: "charity-water",
};

const meta = {
  title: "Compositions/Moderation/Donations",
  component: CommunityDonationsEditorPage,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunityDonationsEditorPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Configured: Story = {
  args: {
    endaomentUrl: "https://app.endaoment.org/orgs/charity-water",
    partnerPreview: configuredPartner,
    resolveError: null,
    resolving: false,
  },
  render: (args) => (
    <DonationsEditorStory
      initialEndaomentUrl={args.endaomentUrl}
      initialPartnerPreview={args.partnerPreview}
    />
  ),
};

export const Off: Story = {
  args: {
    endaomentUrl: "",
    partnerPreview: null,
    resolveError: null,
    resolving: false,
  },
  render: (args) => (
    <DonationsEditorStory
      initialEndaomentUrl={args.endaomentUrl}
      initialPartnerPreview={args.partnerPreview}
    />
  ),
};
