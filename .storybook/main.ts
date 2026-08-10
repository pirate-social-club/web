import type { StorybookConfig } from "@storybook/react-vite";

const storybookOnly = process.env.STORYBOOK_ONLY?.trim();
const isSafeStorybookSubtree = storybookOnly
  ?.split("/")
  .every(
    (segment) =>
      segment.length > 0 &&
      segment !== "." &&
      segment !== ".." &&
      /^[\w.-]+$/.test(segment),
  );

if (storybookOnly && !isSafeStorybookSubtree) {
  throw new Error(
    "STORYBOOK_ONLY must be a relative directory under src/ without glob syntax.",
  );
}

const config: StorybookConfig = {
  stories: storybookOnly
    ? [`../src/${storybookOnly}/**/*.stories.@(js|jsx|ts|tsx)`]
    : ["../src/**/*.stories.@(js|jsx|ts|tsx)"],
  framework: {
    name: "@storybook/react-vite",
    options: {
      builder: {
        viteConfigPath: ".storybook/vite.config.ts",
      },
    },
  },
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    server: {
      ...viteConfig.server,
      watch: {
        ...(viteConfig.server?.watch ?? {}),
        ignored: ["**/.tmp/**", "**/worktrees/**"],
      },
    },
  }),
};

export default config;
