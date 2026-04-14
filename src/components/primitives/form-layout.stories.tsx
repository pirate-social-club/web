import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "./input";
import { FormFieldLabel, FormNote, FormSectionHeading } from "./form-layout";

const meta = {
  title: "Primitives/FormLayout",
  component: FormSectionHeading,
  args: {
    title: "Verification",
    description: "Move through the required account checks.",
  },
} satisfies Meta<typeof FormSectionHeading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="max-w-xl space-y-6 rounded-[var(--radius-xl)] border border-border-soft bg-card p-5">
      <FormSectionHeading {...args} />
      <div className="space-y-2">
        <FormFieldLabel
          htmlFor="reddit-username"
          label="Reddit username"
          counter="Required"
        />
        <Input id="reddit-username" placeholder="technohippie" />
      </div>
      <FormNote>Code will appear after the username is verified.</FormNote>
      <FormNote tone="warning">Rate limits may delay the next check.</FormNote>
      <FormNote tone="destructive">Verification failed for this attempt.</FormNote>
    </div>
  ),
};
