import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "./combobox";

const frameworks = ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"] as const;

const meta = {
  title: "Primitives/Combobox",
  component: ComboboxInput,
} satisfies Meta<typeof ComboboxInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[320px]">
      <Combobox items={frameworks}>
        <ComboboxInput placeholder="Select a framework" />
        <ComboboxContent>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList>
            {(item) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  ),
};

export const Multiple: Story = {
  render: () => {
    const [value, setValue] = React.useState<string[]>([frameworks[0]]);

    return (
      <div className="w-96">
        <Combobox multiple items={frameworks} value={value} onValueChange={setValue}>
          <ComboboxChips>
            <ComboboxValue>
              {(values) => (
                <>
                  {values.map((item: string) => (
                    <ComboboxChip key={item}>{item}</ComboboxChip>
                  ))}
                  <ComboboxChipsInput placeholder="Add framework" />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent>
            <ComboboxEmpty>No items found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    );
  },
};

export const DropdownMultiselect: Story = {
  render: () => {
    const [value, setValue] = React.useState<string[]>([frameworks[0]]);

    return (
      <div className="w-[240px]">
        <Combobox multiple items={frameworks} value={value} onValueChange={setValue}>
          <ComboboxTrigger>
            {value.length === 0 ? "Select frameworks" : value.join(", ")}
          </ComboboxTrigger>
          <ComboboxContent>
            <ComboboxEmpty>No items found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    );
  },
};
