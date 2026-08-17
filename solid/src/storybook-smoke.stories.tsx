import type { Meta, StoryObj } from "storybook-solidjs-vite";

import {
  buttonVariants,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  TextField,
  TextFieldInput,
  TextFieldLabel,
} from "./design-system";

// Pipeline canary for the app-side catalog: proves that the Solid transform,
// Tailwind tokens, the design-system facade, and the locale/direction/theme
// decorators all work together. Product stories land under src/features/.
const meta = {
  title: "App/Foundations/Storybook Smoke",
  parameters: {
    layout: "centered",
  },
  render: () => (
    <div class="flex flex-col items-start gap-4">
      <TextField>
        <TextFieldLabel>Handle</TextFieldLabel>
        <TextFieldInput />
      </TextField>
      <Dialog>
        <DialogTrigger class={buttonVariants({ variant: "default" })}>
          Open dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>App catalog online</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  ),
} satisfies Meta;

export default meta;

export const Default: StoryObj = {};
