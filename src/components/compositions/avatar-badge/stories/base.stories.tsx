import type { Meta, StoryObj } from "@storybook/react-vite";

import { AvatarWithBadge } from "../avatar-with-badge";
import { Type } from "@/components/primitives/type";

const meta = {
  title: "Compositions/AvatarWithBadge",
  component: AvatarWithBadge,
  args: {
    badgeCountryCode: "us",
    badgeLabel: "Verified United States nationality",
    fallback: "Ada Lovelace",
    size: "md",
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof AvatarWithBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-5">
      <AvatarWithBadge badgeCountryCode="br" badgeLabel="Verified Brazil nationality" fallback="Brazil" size="sm" />
      <AvatarWithBadge badgeCountryCode="cn" badgeLabel="Verified China nationality" fallback="China" size="md" />
      <AvatarWithBadge badgeCountryCode="gb" badgeLabel="Verified United Kingdom nationality" fallback="United Kingdom" size="lg" />
      <AvatarWithBadge
        avatarClassName="size-28 border-4 border-background bg-card"
        badgeCountryCode="in"
        badgeLabel="Verified India nationality"
        badgeSize={42}
        fallback="India"
        size="lg"
      />
    </div>
  ),
};

export const ContextScale: Story = {
  render: () => (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-2">
        <Type as="div" variant="label" className="">Compact avatar</Type>
        <div className="flex items-center gap-3">
          <AvatarWithBadge
            badgeCountryCode="us"
            badgeLabel="Verified United States nationality"
            fallback="Post author"
            size="sm"
            src="https://i.pravatar.cc/100?img=5"
          />
          <div className="text-base text-muted-foreground">36px avatar / 18px flag</div>
        </div>
      </div>

      <div className="space-y-2">
        <Type as="div" variant="label" className="">Post and thread</Type>
        <div className="flex items-center gap-3">
          <AvatarWithBadge
            badgeCountryCode="gb"
            badgeLabel="Verified United Kingdom nationality"
            fallback="Medium author"
            size="md"
            src="https://i.pravatar.cc/100?img=12"
          />
          <div className="text-base text-muted-foreground">48px avatar / 22px flag</div>
        </div>
      </div>

      <div className="space-y-2">
        <Type as="div" variant="label" className="">Large identity</Type>
        <div className="flex items-center gap-3">
          <AvatarWithBadge
            badgeCountryCode="br"
            badgeLabel="Verified Brazil nationality"
            fallback="Large author"
            size="lg"
            src="https://i.pravatar.cc/100?img=20"
          />
          <div className="text-base text-muted-foreground">56px avatar / 26px flag</div>
        </div>
      </div>

      <div className="space-y-2">
        <Type as="div" variant="label" className="">Profile hero</Type>
        <div className="flex items-center gap-3">
          <AvatarWithBadge
            avatarClassName="size-28 border-4 border-background bg-card"
            badgeCountryCode="ar"
            badgeLabel="Verified Argentina nationality"
            badgeSize={42}
            fallback="Profile owner"
            size="lg"
            src="https://i.pravatar.cc/160?img=32"
          />
          <div className="text-base text-muted-foreground">112px avatar / 42px flag</div>
        </div>
      </div>
    </div>
  ),
};

export const NoBadge: Story = {
  args: {
    badgeCountryCode: null,
  },
};
