import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Type } from "@/components/primitives/type";
import { HostBookingPage } from "../host-booking-page/host-booking-page";
import {
  sampleHostProfile,
  sampleHostProfileNoVideo,
} from "@pirate/bookings-domain/test";

const meta = {
  title: "Compositions/Bookings/HostBookingPage",
  component: HostBookingPage,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof HostBookingPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithAvailability: Story = {
  render: () => (
    <div className="mx-auto max-w-2xl p-4">
      <HostBookingPage
        name={sampleHostProfile.name}
        bio={sampleHostProfile.bio}
        topics={sampleHostProfile.topics}
        photoSrc={sampleHostProfile.photoSrc}
        introVideoSrc={sampleHostProfile.introVideoSrc}
        basePriceCents={sampleHostProfile.basePriceCents}
        availabilityPreview={
          <div className="rounded-[var(--radius-lg)] border border-border-soft bg-card p-4 text-center">
            <Type variant="caption">Availability preview — see calendar below</Type>
          </div>
        }
      />
    </div>
  ),
};

export const WithoutIntroVideo: Story = {
  render: () => (
    <div className="mx-auto max-w-2xl p-4">
      <HostBookingPage
        name={sampleHostProfileNoVideo.name}
        bio={sampleHostProfileNoVideo.bio}
        topics={sampleHostProfileNoVideo.topics}
        photoSrc={sampleHostProfileNoVideo.photoSrc}
        basePriceCents={sampleHostProfileNoVideo.basePriceCents}
      />
    </div>
  ),
};

export const EmptyAvailability: Story = {
  render: () => (
    <div className="mx-auto max-w-2xl p-4">
      <HostBookingPage
        name={sampleHostProfile.name}
        bio={sampleHostProfile.bio}
        topics={sampleHostProfile.topics}
        photoSrc={sampleHostProfile.photoSrc}
        basePriceCents={sampleHostProfile.basePriceCents}
        availabilityPreview={
          <div className="rounded-[var(--radius-lg)] border border-border-soft bg-card p-6 text-center">
            <Type variant="caption">No open slots in the next week.</Type>
          </div>
        }
      />
    </div>
  ),
};

export const Mobile: Story = {
  render: () => (
    <div className="mx-auto max-w-sm p-4">
      <HostBookingPage
        name={sampleHostProfile.name}
        bio={sampleHostProfile.bio}
        topics={sampleHostProfile.topics}
        photoSrc={sampleHostProfile.photoSrc}
        basePriceCents={sampleHostProfile.basePriceCents}
      />
    </div>
  ),
};
