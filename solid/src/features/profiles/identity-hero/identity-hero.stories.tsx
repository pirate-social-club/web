/** @jsxImportSource @solidjs/web */

import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { Button, Type } from "../../../design-system";
import { fixtureImage } from "../../posts/post-card/fixtures";
import { IdentityHero } from "./identity-hero";

const flagUrlForCountryCode = (countryCode: string) => fixtureImage(`flag-${countryCode}`, 64, 64);
const avatarSrc = fixtureImage("identity-avatar", 160, 160);
const coverSrc = fixtureImage("identity-cover", 1200, 400);

const meta = {
  title: "App/Profiles/IdentityHero",
  component: IdentityHero,
  args: { avatarFallback: "TM", title: <span>Tame Impala</span> },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof IdentityHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <IdentityHero
      actions={(
        <div class="flex gap-3">
          <Button onClick={() => undefined} variant="secondary">Follow</Button>
          <Button onClick={() => undefined}>Join as citizen</Button>
        </div>
      )}
      avatarFallback="TM"
      avatarSrc={avatarSrc}
      coverSrc={coverSrc}
      details={<Type as="p" class="text-muted-foreground" variant="body">92.1K followers · 48.2K citizens</Type>}
      flagUrlForCountryCode={flagUrlForCountryCode}
      subtitle={<span>c/tameimpala</span>}
      title={<span>Tame Impala</span>}
    />
  ),
};

export const WithoutImages: Story = {
  render: () => (
    <IdentityHero
      actions={(
        <div class="flex gap-3">
          <Button onClick={() => undefined} variant="secondary">Follow</Button>
          <Button onClick={() => undefined}>Join as citizen</Button>
        </div>
      )}
      avatarFallback="TM"
      details={<Type as="p" class="text-muted-foreground" variant="body">92.1K followers · 48.2K citizens</Type>}
      subtitle={<span>c/tameimpala</span>}
      title={<span>Tame Impala</span>}
    />
  ),
};

export const WithBadge: Story = {
  render: () => (
    <IdentityHero
      actions={<Button onClick={() => undefined} variant="secondary">Edit profile</Button>}
      avatarBadgeCountryCode="US"
      avatarBadgeLabel="United States"
      avatarFallback="TM"
      avatarSrc={avatarSrc}
      coverSrc={coverSrc}
      flagUrlForCountryCode={flagUrlForCountryCode}
      subtitle={<span>c/tameimpala</span>}
      title={<span>Tame Impala</span>}
    />
  ),
};

export const LongTitle: Story = {
  render: () => (
    <IdentityHero
      actions={<Button onClick={() => undefined} variant="secondary">Follow</Button>}
      avatarFallback="TM"
      avatarSrc={avatarSrc}
      coverSrc={coverSrc}
      subtitle={<span>c/very-long-community-name-that-might-break-layout</span>}
      title={<span>This is an extremely long community name that should truncate gracefully</span>}
    />
  ),
};
