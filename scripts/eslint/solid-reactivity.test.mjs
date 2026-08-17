import { RuleTester } from "eslint";
import typescriptParser from "@typescript-eslint/parser";

import solidReactivity from "./solid-reactivity.mjs";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    parser: typescriptParser,
    sourceType: "module",
  },
});

ruleTester.run(
  "no-story-alias",
  solidReactivity.rules["no-story-alias"],
  {
    valid: [
      {
        code: "export const Primary: Story = { render: () => null };",
        filename: "src/button.stories.tsx",
      },
      {
        code: "export const sharedFixture = otherFixture;",
        filename: "src/button.tsx",
      },
      {
        code: "export const Primary: Story = buildStory();",
        filename: "src/button.stories.tsx",
      },
    ],
    invalid: [
      {
        code: "export const Secondary: Story = Primary;",
        filename: "src/button.stories.tsx",
        errors: [{ messageId: "storyAlias" }],
      },
      {
        code: "export const Secondary: StoryObj = Primary;",
        filename: "src/button.stories.tsx",
        errors: [{ messageId: "storyAlias" }],
      },
    ],
  },
);
